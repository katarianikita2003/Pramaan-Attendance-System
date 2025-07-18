// backend/src/services/zkp/zkpService.production.js
import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

class ProductionZKPService {
  constructor() {
    this.poseidon = null;
    this.wasmPath = null;
    this.zkeyPath = null;
    this.vKey = null;
    this.isInitialized = false;
    this.featureExtractors = new Map();
  }

  async initialize() {
    try {
      // Initialize Poseidon hash function
      this.poseidon = await buildPoseidon();
      
      // Set circuit paths
      const circuitBase = path.join(process.cwd(), 'zkp-circuits');
      this.wasmPath = path.join(circuitBase, 'build/biometric_attendance_js/biometric_attendance.wasm');
      this.zkeyPath = path.join(circuitBase, 'keys/biometric_final.zkey');
      
      // Load verification key
      const vKeyPath = path.join(circuitBase, 'keys/verification_key.json');
      this.vKey = JSON.parse(await fs.readFile(vKeyPath, 'utf-8'));
      
      // Initialize feature extractors
      await this.initializeFeatureExtractors();
      
      this.isInitialized = true;
      logger.info('Production ZKP Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ZKP service:', error);
      throw error;
    }
  }

  async initializeFeatureExtractors() {
    // Initialize biometric feature extraction libraries
    try {
      // For face recognition
      // this.featureExtractors.set('face', new FaceFeatureExtractor());
      
      // For fingerprint
      // this.featureExtractors.set('fingerprint', new FingerprintFeatureExtractor());
      
      // For now, use mock extractors
      this.featureExtractors.set('face', {
        extract: (data) => this.mockFeatureExtraction(data, 'face')
      });
      
      this.featureExtractors.set('fingerprint', {
        extract: (data) => this.mockFeatureExtraction(data, 'fingerprint')
      });
    } catch (error) {
      logger.error('Failed to initialize feature extractors:', error);
    }
  }

  /**
   * Mock feature extraction - replace with actual implementation
   */
  mockFeatureExtraction(data, type) {
    const features = new Array(128);
    const hash = crypto.createHash('sha256').update(`${type}:${data}`).digest();
    
    for (let i = 0; i < 128; i++) {
      // Convert to field element (ensure it's within the field)
      features[i] = BigInt('0x' + hash.slice(i % 32, (i % 32) + 1).toString('hex')) % this.poseidon.F.p;
    }
    
    return features;
  }

  /**
   * Extract biometric features (fingerprint or face)
   * Returns normalized feature vector of length 128
   */
  async extractBiometricFeatures(biometricData) {
    const { type, data } = biometricData;
    
    const extractor = this.featureExtractors.get(type);
    if (!extractor) {
      throw new Error(`Unsupported biometric type: ${type}`);
    }
    
    try {
      const features = await extractor.extract(data);
      
      // Ensure features are field elements
      return features.map(f => {
        const bigIntValue = BigInt(f);
        return (bigIntValue % this.poseidon.F.p).toString();
      });
    } catch (error) {
      logger.error(`Error extracting ${type} features:`, error);
      throw error;
    }
  }

  /**
   * Generate biometric commitment during enrollment
   */
  async generateBiometricCommitment(biometricData, scholarId) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Extract biometric features
      const features = await this.extractBiometricFeatures(biometricData);
      
      // Generate random salt (32 bytes each)
      const salt = [
        BigInt('0x' + crypto.randomBytes(32).toString('hex')) % this.poseidon.F.p,
        BigInt('0x' + crypto.randomBytes(32).toString('hex')) % this.poseidon.F.p
      ];
      
      // Create commitment using Poseidon hash
      const commitmentInput = [...features, ...salt.map(s => s.toString())];
      const commitment = this.poseidon.F.toString(
        this.poseidon(commitmentInput.map(x => BigInt(x)))
      );
      
      // Create nullifier (hash of features only - no salt)
      const nullifier = this.poseidon.F.toString(
        this.poseidon(features.map(x => BigInt(x)))
      );
      
      // Encrypt salt for storage
      const encryptedSalt = await this.encryptSalt(salt.map(s => s.toString()), scholarId);
      
      logger.info(`Generated commitment for scholar ${scholarId}`);
      
      return {
        commitment,
        nullifier,
        encryptedSalt,
        algorithm: 'poseidon',
        featureLength: features.length,
        zkpVersion: '1.0.0'
      };
    } catch (error) {
      logger.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  /**
   * Generate attendance proof
   */
  async generateAttendanceProof(scholarId, biometricData, storedCommitment, location, organizationId) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const timestamp = Date.now();
      
      // Extract features from current biometric
      const features = await this.extractBiometricFeatures(biometricData);
      
      // Decrypt stored salt
      const salt = await this.decryptSalt(storedCommitment.encryptedSalt, scholarId);
      
      // Hash location (round to 3 decimal places for privacy)
      const locationHash = this.poseidon.F.toString(
        this.poseidon([
          BigInt(Math.round(location.latitude * 1000)),
          BigInt(Math.round(location.longitude * 1000))
        ])
      );
      
      // Hash timestamp (round to nearest minute for privacy)
      const timestampHash = this.poseidon.F.toString(
        this.poseidon([BigInt(Math.floor(timestamp / 60000) * 60000)])
      );
      
      // Convert organization ID to field element
      const orgIdHash = this.poseidon.F.toString(
        this.poseidon([BigInt('0x' + crypto.createHash('sha256').update(organizationId).digest('hex'))])
      );
      
      // Prepare circuit inputs
      const input = {
        // Private inputs
        biometricFeatures: features,
        salt: salt,
        
        // Public inputs
        commitment: storedCommitment.commitment,
        nullifier: storedCommitment.nullifier,
        locationHash: locationHash,
        timestampHash: timestampHash,
        organizationId: orgIdHash
      };
      
      // Log input sizes for debugging
      logger.debug('Generating proof with inputs:', {
        featuresLength: features.length,
        saltLength: salt.length,
        commitment: input.commitment.substring(0, 10) + '...',
        nullifier: input.nullifier.substring(0, 10) + '...'
      });
      
      // Generate the proof
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        this.wasmPath,
        this.zkeyPath
      );
      
      // Create proof ID
      const proofId = crypto.randomBytes(16).toString('hex');
      
      logger.info(`Generated attendance proof ${proofId} for scholar ${scholarId}`);
      
      return {
        proofId,
        proof: JSON.stringify(proof),
        publicSignals,
        publicInputs: {
          commitment: publicSignals[0],
          nullifier: publicSignals[1],
          locationHash: publicSignals[2],
          timestampHash: publicSignals[3],
          organizationId: publicSignals[4]
        },
        metadata: {
          timestamp,
          location: {
            latitude: Math.round(location.latitude * 1000) / 1000,
            longitude: Math.round(location.longitude * 1000) / 1000
          },
          zkpVersion: '1.0.0',
          circuitId: 'biometric_attendance'
        }
      };
    } catch (error) {
      logger.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  /**
   * Verify attendance proof
   */
  async verifyAttendanceProof(proofData) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const proof = JSON.parse(proofData.proof);
      const { publicSignals } = proofData;
      
      // Verify all public signals are present
      if (!publicSignals || publicSignals.length < 5) {
        logger.error('Invalid public signals');
        return false;
      }
      
      // Verify the proof
      const isValid = await snarkjs.groth16.verify(
        this.vKey,
        publicSignals,
        proof
      );
      
      if (isValid) {
        logger.info(`Proof ${proofData.proofId} verified successfully`);
      } else {
        logger.warn(`Proof ${proofData.proofId} verification failed`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Encrypt salt for storage
   */
  async encryptSalt(salt, scholarId) {
    const key = crypto.scryptSync(
      process.env.SALT_ENCRYPTION_KEY + scholarId,
      'salt',
      32
    );
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    const encrypted = Buffer.concat([
      iv,
      cipher.update(JSON.stringify(salt)),
      cipher.final()
    ]);
    
    return encrypted.toString('base64');
  }

  /**
   * Decrypt stored salt
   */
  async decryptSalt(encryptedSalt, scholarId) {
    const key = crypto.scryptSync(
      process.env.SALT_ENCRYPTION_KEY + scholarId,
      'salt',
      32
    );
    
    const encryptedBuffer = Buffer.from(encryptedSalt, 'base64');
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString());
  }

  /**
   * Check global biometric uniqueness
   */
  async checkBiometricUniqueness(biometricData) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const features = await this.extractBiometricFeatures(biometricData);
      const nullifier = this.poseidon.F.toString(
        this.poseidon(features.map(x => BigInt(x)))
      );
      
      // In production, check against database
      // For now, return the nullifier for the controller to check
      return {
        nullifier,
        features: features.length,
        algorithm: 'poseidon'
      };
    } catch (error) {
      logger.error('Error checking biometric uniqueness:', error);
      throw error;
    }
  }

  /**
   * Generate QR code data for proof verification
   */
  async generateProofQR(proofData) {
    const { proofId, publicInputs, metadata } = proofData;
    
    // Create compact QR data
    const qrData = {
      id: proofId.substring(0, 8),
      c: publicInputs.commitment.substring(0, 16),
      n: publicInputs.nullifier.substring(0, 16),
      t: Math.floor(metadata.timestamp / 1000),
      v: '1.0.0'
    };
    
    // Sign the data
    const signature = crypto
      .createHmac('sha256', process.env.PROOF_SIGNING_KEY || 'default-key')
      .update(JSON.stringify(qrData))
      .digest('hex')
      .substring(0, 16);
    
    qrData.s = signature;
    
    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }

  /**
   * Batch verify multiple proofs (for efficiency)
   */
  async batchVerifyProofs(proofs) {
    if (!this.isInitialized) await this.initialize();
    
    const results = await Promise.all(
      proofs.map(proof => this.verifyAttendanceProof(proof))
    );
    
    return results;
  }

  /**
   * Export circuit info for monitoring
   */
  async getCircuitInfo() {
    return {
      initialized: this.isInitialized,
      poseidonReady: !!this.poseidon,
      wasmPath: this.wasmPath,
      zkeyPath: this.zkeyPath,
      verificationKeyLoaded: !!this.vKey,
      supportedBiometrics: Array.from(this.featureExtractors.keys()),
      version: '1.0.0'
    };
  }
}

export default ProductionZKPService;