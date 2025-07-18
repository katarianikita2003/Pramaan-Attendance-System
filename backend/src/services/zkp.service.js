// backend/src/services/zkp.service.js
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ZKPService {
  constructor() {
    this.mode = process.env.ZKP_MODE || 'enhanced-simulation';
    this.isInitialized = false;
    this.snarkjs = null;
    this.circuitPath = path.join(__dirname, '../../zkp-circuits');
    this.keysPath = path.join(this.circuitPath, 'keys');
    this.wasmPath = null;
    this.zkeyPath = null;
    this.verificationKey = null;
    this.isRealZKP = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing ZKP Service...');
      
      // Try to load snarkjs if available
      try {
        const snarkjsModule = await import('snarkjs');
        this.snarkjs = snarkjsModule.default || snarkjsModule;
        logger.info('snarkjs loaded successfully');
      } catch (error) {
        logger.warn('snarkjs not available, using enhanced simulation');
      }

      // Check for real ZKP files
      await this.checkZKPFiles();
      
      this.isInitialized = true;
      logger.info(`ZKP Service initialized in ${this.mode} mode`);
    } catch (error) {
      logger.error('Failed to initialize ZKP service:', error);
      this.mode = 'enhanced-simulation';
      this.isInitialized = true;
    }
  }

  async checkZKPFiles() {
    try {
      // Check for WASM file
      const wasmPath = path.join(this.circuitPath, 'build/biometric_attendance_js/biometric_attendance.wasm');
      const zkeyPath = path.join(this.keysPath, 'biometric_final.zkey');
      const vkeyPath = path.join(this.keysPath, 'verification_key.json');

      const [wasmExists, zkeyExists, vkeyExists] = await Promise.all([
        this.fileExists(wasmPath),
        this.fileExists(zkeyPath),
        this.fileExists(vkeyPath)
      ]);

      if (wasmExists && zkeyExists && vkeyExists && this.snarkjs) {
        this.wasmPath = wasmPath;
        this.zkeyPath = zkeyPath;
        
        // Load verification key
        const vkeyContent = await fs.readFile(vkeyPath, 'utf8');
        this.verificationKey = JSON.parse(vkeyContent);
        
        this.isRealZKP = true;
        this.mode = 'production';
        logger.info('Real ZKP files found - running in production mode');
      } else {
        // Load mock verification key if exists
        try {
          const mockVkeyPath = path.join(this.keysPath, 'verification_key.json');
          const vkeyContent = await fs.readFile(mockVkeyPath, 'utf8');
          this.verificationKey = JSON.parse(vkeyContent);
        } catch (error) {
          logger.warn('Could not load verification key, using enhanced simulation');
        }
      }
    } catch (error) {
      logger.error('Error checking ZKP files:', error);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Generate biometric commitment during enrollment
   */
  async generateBiometricCommitment(biometricData, scholarId) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Generate salt
      const salt = crypto.randomBytes(32);
      const saltArray = [
        BigInt('0x' + salt.slice(0, 16).toString('hex')),
        BigInt('0x' + salt.slice(16, 32).toString('hex'))
      ];

      // Extract biometric features
      const features = this.extractBiometricFeatures(biometricData);
      
      // Calculate commitment
      const featureSum = features.reduce((sum, f) => sum + BigInt(f), 0n);
      const saltSum = saltArray[0] + saltArray[1];
      const commitment = (featureSum + saltSum).toString();
      
      // Calculate nullifier
      const nullifier = featureSum.toString();

      // Encrypt salt for storage
      const encryptedSalt = await this.encryptSalt(salt, scholarId);

      return {
        commitment,
        nullifier,
        encryptedSalt,
        metadata: {
          algorithm: this.isRealZKP ? 'groth16' : 'poseidon-simulation',
          featureCount: features.length,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      logger.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  /**
   * Generate ZKP for attendance marking
   */
  async generateAttendanceProof(scholarId, biometricData, storedCommitment, encryptedSalt, attendanceData) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Decrypt salt
      const salt = await this.decryptSalt(encryptedSalt, scholarId);
      const saltArray = [
        BigInt('0x' + salt.slice(0, 16).toString('hex')),
        BigInt('0x' + salt.slice(16, 32).toString('hex'))
      ];

      // Extract features from current biometric
      const features = this.extractBiometricFeatures(biometricData);

      // Prepare circuit inputs
      const inputs = {
        // Private inputs
        biometricFeatures: features.map(f => f.toString()),
        salt: saltArray.map(s => s.toString()),
        
        // Public inputs
        commitment: storedCommitment.commitment,
        nullifier: storedCommitment.nullifier,
        locationHash: this.hashLocation(attendanceData.location),
        timestampHash: this.hashTimestamp(attendanceData.timestamp),
        organizationId: this.hashOrganizationId(attendanceData.organizationId)
      };

      let proof;
      let publicSignals;

      if (this.isRealZKP) {
        // Generate real ZKP proof
        logger.info('Generating real ZKP proof...');
        const { proof: zkProof, publicSignals: zkSignals } = await this.snarkjs.groth16.fullProve(
          inputs,
          this.wasmPath,
          this.zkeyPath
        );
        proof = zkProof;
        publicSignals = zkSignals;
      } else {
        // Generate enhanced simulation proof
        proof = this.generateSimulationProof(inputs);
        publicSignals = [
          inputs.commitment,
          inputs.nullifier,
          inputs.locationHash,
          inputs.timestampHash,
          inputs.organizationId
        ];
      }

      // Create proof ID
      const proofId = crypto.randomBytes(16).toString('hex');

      return {
        proofId,
        proof: JSON.stringify(proof),
        publicInputs: {
          commitment: publicSignals[0],
          nullifier: publicSignals[1],
          locationHash: publicSignals[2],
          timestampHash: publicSignals[3],
          organizationId: publicSignals[4]
        },
        verificationKey: this.verificationKey,
        protocol: 'groth16',
        mode: this.mode
      };
    } catch (error) {
      logger.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  /**
   * Verify attendance proof
   */
  async verifyAttendanceProof(proof, expectedCommitment) {
    if (!this.isInitialized) await this.initialize();

    try {
      const zkProof = typeof proof.proof === 'string' ? JSON.parse(proof.proof) : proof.proof;
      
      if (this.isRealZKP && this.verificationKey) {
        // Real ZKP verification
        const publicSignals = [
          proof.publicInputs.commitment,
          proof.publicInputs.nullifier,
          proof.publicInputs.locationHash,
          proof.publicInputs.timestampHash,
          proof.publicInputs.organizationId
        ];

        const isValid = await this.snarkjs.groth16.verify(
          this.verificationKey,
          publicSignals,
          zkProof
        );

        return isValid && proof.publicInputs.commitment === expectedCommitment;
      } else {
        // Enhanced simulation verification
        const hasValidStructure = zkProof.pi_a && zkProof.pi_b && zkProof.pi_c;
        const commitmentMatches = proof.publicInputs.commitment === expectedCommitment;
        
        return hasValidStructure && commitmentMatches;
      }
    } catch (error) {
      logger.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Generate simulation proof with Groth16 structure
   */
  generateSimulationProof(inputs) {
    // Generate realistic looking Groth16 proof structure
    const rand = () => crypto.randomBytes(32).toString('hex');
    
    return {
      pi_a: [rand(), rand(), "1"],
      pi_b: [[rand(), rand()], [rand(), rand()], ["1", "0"]],
      pi_c: [rand(), rand(), "1"],
      protocol: "groth16",
      curve: "bn128"
    };
  }

  /**
   * Extract biometric features from data
   */
  extractBiometricFeatures(biometricData) {
    // In production: Use proper feature extraction
    // For now, generate deterministic features from biometric data
    const dataStr = JSON.stringify(biometricData);
    const hash = crypto.createHash('sha256').update(dataStr).digest();
    
    const features = [];
    for (let i = 0; i < 16; i++) {
      const bytes = hash.slice(i * 2, (i + 1) * 2);
      features.push(BigInt('0x' + bytes.toString('hex')));
    }
    
    return features;
  }

  /**
   * Hash location for circuit input
   */
  hashLocation(location) {
    const locationStr = `${location.latitude},${location.longitude}`;
    const hash = crypto.createHash('sha256').update(locationStr).digest('hex');
    return BigInt('0x' + hash.slice(0, 16)).toString();
  }

  /**
   * Hash timestamp for circuit input
   */
  hashTimestamp(timestamp) {
    const hash = crypto.createHash('sha256').update(timestamp.toString()).digest('hex');
    return BigInt('0x' + hash.slice(0, 16)).toString();
  }

  /**
   * Hash organization ID for circuit input
   */
  hashOrganizationId(orgId) {
    const hash = crypto.createHash('sha256').update(orgId).digest('hex');
    return BigInt('0x' + hash.slice(0, 16)).toString();
  }

  /**
   * Encrypt salt for storage
   */
  async encryptSalt(salt, scholarId) {
    const key = crypto.createHash('sha256')
      .update(process.env.ENCRYPTION_KEY || 'default-key')
      .update(scholarId)
      .digest();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(salt),
      cipher.final()
    ]);

    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  /**
   * Decrypt salt
   */
  async decryptSalt(encryptedSalt, scholarId) {
    const key = crypto.createHash('sha256')
      .update(process.env.ENCRYPTION_KEY || 'default-key')
      .update(scholarId)
      .digest();

    const data = Buffer.from(encryptedSalt, 'base64');
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Get ZKP status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      mode: this.mode,
      hasRealCircuits: this.isRealZKP,
      hasSnarkjs: !!this.snarkjs,
      hasVerificationKey: !!this.verificationKey,
      circuitPath: this.circuitPath,
      features: {
        biometricCommitment: true,
        attendanceProof: true,
        proofVerification: true,
        realTimeProofs: this.isRealZKP
      }
    };
  }
}

// Export singleton instance
export const zkpService = new ZKPService();
export default zkpService;