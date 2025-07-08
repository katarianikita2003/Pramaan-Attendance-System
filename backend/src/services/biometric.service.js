// backend/src/services/biometric.service.js
import crypto from 'crypto';
import logger from '../utils/logger.js';

export class BiometricService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY || 'default-32-char-encryption-key!!', 'utf8');
  }

  /**
   * Generate a cryptographic commitment from biometric data
   * In production, this would use actual biometric feature extraction
   */
  async generateCommitment(biometricData) {
    try {
      // For MVP, we'll simulate biometric feature extraction
      const features = this.extractFeatures(biometricData);
      
      // Generate salt for this biometric
      const salt = crypto.randomBytes(32).toString('hex');
      
      // Create commitment using hash
      const commitment = crypto
        .createHash('sha256')
        .update(features + salt)
        .digest('hex');
      
      return {
        commitment,
        salt,
        features: this.encryptData(features)
      };
    } catch (error) {
      logger.error('Biometric commitment generation failed:', error);
      throw new Error('Failed to process biometric data');
    }
  }

  /**
   * Verify biometric data against stored commitment
   */
  async verifyBiometric(biometricData, storedCommitment, salt) {
    try {
      const features = this.extractFeatures(biometricData);
      
      const testCommitment = crypto
        .createHash('sha256')
        .update(features + salt)
        .digest('hex');
      
      return testCommitment === storedCommitment;
    } catch (error) {
      logger.error('Biometric verification failed:', error);
      return false;
    }
  }

  /**
   * Check if biometric already exists globally
   */
  async checkGlobalUniqueness(biometricData, existingHashes = []) {
    try {
      // For MVP, we'll use a simplified similarity check
      const features = this.extractFeatures(biometricData);
      const testHash = this.generateFeatureHash(features);
      
      // In production, this would use more sophisticated matching
      for (const existingHash of existingHashes) {
        if (this.calculateSimilarity(testHash, existingHash) > 0.95) {
          return false; // Not unique
        }
      }
      
      return true; // Unique
    } catch (error) {
      logger.error('Global uniqueness check failed:', error);
      throw error;
    }
  }

  /**
   * Generate a global hash for cross-organization uniqueness
   */
  generateGlobalHash(biometricData) {
    const features = this.extractFeatures(biometricData);
    return this.generateFeatureHash(features);
  }

  /**
   * Extract features from biometric data (simplified for MVP)
   */
  extractFeatures(biometricData) {
    // In production, this would use actual biometric algorithms
    // For MVP, we'll create a deterministic feature string
    
    if (biometricData.type === 'face') {
      // Simulate face feature extraction
      return `face_features_${biometricData.data.substring(0, 50)}`;
    } else if (biometricData.type === 'fingerprint') {
      // Simulate fingerprint feature extraction
      return `fingerprint_features_${biometricData.data.substring(0, 50)}`;
    }
    
    throw new Error('Unsupported biometric type');
  }

  /**
   * Generate feature hash
   */
  generateFeatureHash(features) {
    return crypto
      .createHash('sha256')
      .update(features)
      .digest('hex');
  }

  /**
   * Calculate similarity between two hashes (simplified)
   */
  calculateSimilarity(hash1, hash2) {
    // In production, this would use proper biometric matching algorithms
    // For MVP, we'll do exact matching
    return hash1 === hash2 ? 1.0 : 0.0;
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate DID (Decentralized Identifier)
   */
  generateDID() {
    return `did:pramaan:${crypto.randomBytes(16).toString('hex')}`;
  }
}