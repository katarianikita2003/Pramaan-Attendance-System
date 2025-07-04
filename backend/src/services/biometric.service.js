// ===== backend/src/services/biometric.service.js =====
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { CONSTANTS } from '../config/constants.js';

export class BiometricService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(
      process.env.BIOMETRIC_ENCRYPTION_KEY || 
      crypto.randomBytes(32).toString('hex'),
      'hex'
    );
  }

  encrypt(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt biometric data');
    }
  }

  decrypt(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt biometric data');
    }
  }

  validateBiometricQuality(biometricData) {
    const errors = [];

    if (biometricData.fingerprint) {
      const fpQuality = biometricData.fingerprint.quality || 0;
      if (fpQuality < CONSTANTS.FINGERPRINT_MIN_QUALITY) {
        errors.push(`Fingerprint quality too low: ${fpQuality}`);
      }
    }

    if (biometricData.face) {
      const faceQuality = biometricData.face.quality || 0;
      if (faceQuality < CONSTANTS.FACE_MIN_QUALITY) {
        errors.push(`Face quality too low: ${faceQuality}`);
      }

      // Liveness check
      if (biometricData.face.livenessScore < CONSTANTS.LIVENESS_THRESHOLD) {
        errors.push('Face liveness check failed');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  extractFeatures(biometricData) {
    const features = {};

    if (biometricData.fingerprint) {
      features.fingerprint = {
        template: biometricData.fingerprint.template,
        minutiae: biometricData.fingerprint.minutiae,
        quality: biometricData.fingerprint.quality
      };
    }

    if (biometricData.face) {
      features.face = {
        embedding: biometricData.face.embedding,
        landmarks: biometricData.face.landmarks,
        quality: biometricData.face.quality,
        livenessScore: biometricData.face.livenessScore
      };
    }

    return features;
  }

  generateTemplateHash(template) {
    return crypto.createHash('sha256')
      .update(JSON.stringify(template))
      .digest('hex');
  }

  compareTemplates(template1, template2, threshold = 0.9) {
    // In production, use proper biometric comparison algorithms
    // This is a simplified similarity check
    const hash1 = this.generateTemplateHash(template1);
    const hash2 = this.generateTemplateHash(template2);
    
    if (hash1 === hash2) return 1.0;
    
    // Calculate similarity (placeholder implementation)
    let similarity = 0;
    for (let i = 0; i < Math.min(hash1.length, hash2.length); i++) {
      if (hash1[i] === hash2[i]) similarity++;
    }
    
    return similarity / Math.max(hash1.length, hash2.length);
  }

  async verifyLiveness(faceData) {
    // Implement actual liveness detection
    // Check for:
    // - Eye blinking
    // - Head movement
    // - Facial expressions
    // - Texture analysis
    
    const checks = {
      eyeBlink: faceData.eyeBlinkDetected || false,
      headMovement: faceData.headMovementDetected || false,
      textureAnalysis: faceData.textureScore || 0,
      depthAnalysis: faceData.depthScore || 0
    };

    const score = (
      (checks.eyeBlink ? 0.25 : 0) +
      (checks.headMovement ? 0.25 : 0) +
      (checks.textureAnalysis * 0.25) +
      (checks.depthAnalysis * 0.25)
    );

    return {
      isLive: score >= CONSTANTS.LIVENESS_THRESHOLD,
      score,
      checks
    };
  }
}