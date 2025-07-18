// backend/src/services/zkp/circuits/biometric.circom
pragma circom 2.0.0;

template BiometricProof() {
    // Private inputs (biometric data)
    signal private input biometricHash;
    signal private input salt;
    
    // Public inputs
    signal input commitment;
    signal input nullifier;
    
    // Verify the commitment
    component hasher = Poseidon(2);
    hasher.inputs[0] <== biometricHash;
    hasher.inputs[1] <== salt;
    hasher.out === commitment;
    
    // Verify the nullifier
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== biometricHash;
    nullifierHasher.out === nullifier;
}

component main = BiometricProof();

// backend/src/services/zkp/zkpService.production.js
import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import logger from '../../config/logger.js';

class ProductionZKPService {
  constructor() {
    this.poseidon = null;
    this.provingKey = null;
    this.verificationKey = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Initialize Poseidon hash
      this.poseidon = await buildPoseidon();
      
      // Load proving and verification keys
      const circuitPath = path.join(process.cwd(), 'zkp-keys');
      
      this.provingKey = await fs.readFile(
        path.join(circuitPath, 'biometric_proving_key.zkey')
      );
      
      this.verificationKey = JSON.parse(
        await fs.readFile(
          path.join(circuitPath, 'biometric_verification_key.json'),
          'utf-8'
        )
      );
      
      this.isInitialized = true;
      logger.info('Production ZKP Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ZKP service:', error);
      throw error;
    }
  }

  /**
   * Generate biometric commitment for registration
   */
  async generateBiometricCommitment(biometricData, scholarId) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Generate salt
      const salt = crypto.randomBytes(32);
      const saltHex = '0x' + salt.toString('hex');
      
      // Create biometric hash from extracted features
      const biometricFeatures = this.extractBiometricFeatures(biometricData);
      const biometricHash = this.poseidon.F.toString(
        this.poseidon([...biometricFeatures])
      );
      
      // Generate commitment: Poseidon(biometricHash, salt)
      const commitment = this.poseidon.F.toString(
        this.poseidon([biometricHash, saltHex])
      );
      
      // Generate nullifier: Poseidon(biometricHash)
      const nullifier = this.poseidon.F.toString(
        this.poseidon([biometricHash])
      );
      
      // Store salt encrypted with scholar's key for future proofs
      const encryptedSalt = await this.encryptSalt(salt, scholarId);
      
      return {
        commitment,
        nullifier,
        encryptedSalt,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  /**
   * Extract biometric features (template) from raw data
   */
  extractBiometricFeatures(biometricData) {
    // In production, this would use a proper biometric SDK
    // For face: extract facial landmarks, distances, ratios
    // For fingerprint: extract minutiae points
    
    if (biometricData.type === 'face') {
      // Simulate face feature extraction
      return this.extractFaceFeatures(biometricData.data);
    } else if (biometricData.type === 'fingerprint') {
      // Simulate fingerprint feature extraction
      return this.extractFingerprintFeatures(biometricData.data);
    }
    
    throw new Error('Unsupported biometric type');
  }

  /**
   * Generate ZKP for attendance marking
   */
  async generateAttendanceProof(scholarId, biometricData, storedCommitment, encryptedSalt) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Decrypt salt
      const salt = await this.decryptSalt(encryptedSalt, scholarId);
      const saltHex = '0x' + salt.toString('hex');
      
      // Extract features from current biometric
      const biometricFeatures = this.extractBiometricFeatures(biometricData);
      const biometricHash = this.poseidon.F.toString(
        this.poseidon([...biometricFeatures])
      );
      
      // Prepare circuit inputs
      const input = {
        biometricHash: biometricHash,
        salt: saltHex,
        commitment: storedCommitment.commitment,
        nullifier: storedCommitment.nullifier
      };
      
      // Generate the proof
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        path.join(process.cwd(), 'zkp-keys/biometric.wasm'),
        this.provingKey
      );
      
      // Create proof ID
      const proofId = crypto.randomBytes(16).toString('hex');
      
      return {
        proofId,
        proof: JSON.stringify(proof),
        publicInputs: {
          commitment: publicSignals[0],
          nullifier: publicSignals[1],
          timestamp: Date.now()
        },
        verificationKey: this.verificationKey,
        protocol: 'groth16'
      };
    } catch (error) {
      logger.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  /**
   * Verify attendance proof
   */
  async verifyAttendanceProof(proof) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const zkProof = typeof proof.proof === 'string' ? 
        JSON.parse(proof.proof) : proof.proof;
      
      const publicSignals = [
        proof.publicInputs.commitment,
        proof.publicInputs.nullifier
      ];
      
      const isValid = await snarkjs.groth16.verify(
        this.verificationKey,
        publicSignals,
        zkProof
      );
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Generate QR with proof and verification key
   */
  async generateAttendanceQR(attendanceData) {
    const { proofId, scholarId, organizationId, timestamp, verificationKey } = attendanceData;
    
    // Generate verification key hash for QR
    const vkHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(verificationKey))
      .digest('hex')
      .substring(0, 8);
    
    // Create compact QR data with verification info
    const qrData = {
      p: proofId.substring(0, 8), // Proof ID
      s: scholarId.substring(scholarId.length - 4), // Scholar ID suffix
      o: organizationId.substring(organizationId.length - 4), // Org ID suffix
      t: Math.floor(timestamp / 1000), // Unix timestamp
      v: vkHash, // Verification key hash
      e: Math.floor((timestamp + 5 * 60 * 1000) / 1000) // Expiry timestamp
    };
    
    const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64');
    
    return {
      qrData: qrString,
      proofId,
      verificationKeyHash: vkHash,
      expiresAt: new Date(timestamp + 5 * 60 * 1000)
    };
  }

  // Helper methods for biometric feature extraction
  extractFaceFeatures(faceData) {
    // In production: Use face recognition library (face-api.js, OpenCV, etc.)
    // Extract 128-dimensional face embedding
    const features = [];
    for (let i = 0; i < 128; i++) {
      features.push(Math.floor(Math.random() * 1000));
    }
    return features;
  }

  extractFingerprintFeatures(fingerprintData) {
    // In production: Use fingerprint SDK
    // Extract minutiae points and convert to fixed-size feature vector
    const features = [];
    for (let i = 0; i < 64; i++) {
      features.push(Math.floor(Math.random() * 1000));
    }
    return features;
  }

  // Encryption helpers for salt storage
  async encryptSalt(salt, scholarId) {
    const key = crypto.scryptSync(scholarId, 'pramaan-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(salt);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return {
      iv: iv.toString('hex'),
      data: encrypted.toString('hex')
    };
  }

  async decryptSalt(encryptedSalt, scholarId) {
    const key = crypto.scryptSync(scholarId, 'pramaan-salt', 32);
    const iv = Buffer.from(encryptedSalt.iv, 'hex');
    const encryptedData = Buffer.from(encryptedSalt.data, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }
}

export default ProductionZKPService;