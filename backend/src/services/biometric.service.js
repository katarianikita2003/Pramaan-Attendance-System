// backend/src/services/biometric.service.js
import crypto from 'crypto';
import sharp from 'sharp';
import logger from '../utils/logger.js';

export class BiometricService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
  }

  /**
   * Validate biometric data quality
   */
  validateBiometricQuality(biometricData) {
    const errors = [];
    const minQualityScore = 0.7;

    // Validate face data
    if (biometricData.face) {
      const faceQuality = this.assessFaceQuality(biometricData.face);
      if (faceQuality.score < minQualityScore) {
        errors.push(...faceQuality.issues);
      }
    }

    // Validate fingerprint data
    if (biometricData.fingerprint) {
      const fingerprintQuality = this.assessFingerprintQuality(biometricData.fingerprint);
      if (fingerprintQuality.score < minQualityScore) {
        errors.push(...fingerprintQuality.issues);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      quality: {
        face: biometricData.face ? this.assessFaceQuality(biometricData.face).score : null,
        fingerprint: biometricData.fingerprint ? this.assessFingerprintQuality(biometricData.fingerprint).score : null
      }
    };
  }

  /**
   * Assess face image quality
   */
  assessFaceQuality(faceData) {
    const issues = [];
    let score = 1.0;

    try {
      // Check image dimensions
      if (faceData.width < 200 || faceData.height < 200) {
        issues.push('Face image resolution too low');
        score -= 0.3;
      }

      // Check image format
      if (!['image/jpeg', 'image/png'].includes(faceData.mimeType)) {
        issues.push('Invalid image format');
        score -= 0.2;
      }

      // Check file size
      if (faceData.size > 5 * 1024 * 1024) {
        issues.push('Image file too large');
        score -= 0.1;
      }

      // Simulate face detection confidence
      const faceConfidence = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
      if (faceConfidence < 0.8) {
        issues.push('Low face detection confidence');
        score -= (1 - faceConfidence);
      }

      return { score: Math.max(0, score), issues };
    } catch (error) {
      logger.error('Face quality assessment error:', error);
      return { score: 0, issues: ['Face quality assessment failed'] };
    }
  }

  /**
   * Assess fingerprint quality
   */
  assessFingerprintQuality(fingerprintData) {
    const issues = [];
    let score = 1.0;

    try {
      // Check minutiae count
      const minutiaeCount = fingerprintData.minutiaeCount || 0;
      if (minutiaeCount < 12) {
        issues.push('Insufficient fingerprint minutiae');
        score -= 0.4;
      }

      // Check image quality score
      const qualityScore = fingerprintData.qualityScore || 0;
      if (qualityScore < 60) {
        issues.push('Low fingerprint quality score');
        score -= (100 - qualityScore) / 100;
      }

      // Check capture device
      if (!fingerprintData.deviceInfo) {
        issues.push('Missing capture device information');
        score -= 0.1;
      }

      return { score: Math.max(0, score), issues };
    } catch (error) {
      logger.error('Fingerprint quality assessment error:', error);
      return { score: 0, issues: ['Fingerprint quality assessment failed'] };
    }
  }

  /**
   * Process and normalize face image
   */
  async processFaceImage(imageBuffer) {
    try {
      // Resize and normalize image
      const processedImage = await sharp(imageBuffer)
        .resize(224, 224) // Standard size for face recognition
        .grayscale()
        .normalize()
        .toBuffer();

      return processedImage;
    } catch (error) {
      logger.error('Face image processing error:', error);
      throw new Error('Failed to process face image');
    }
  }

  /**
   * Extract face encoding (simulated)
   */
  async extractFaceEncoding(processedImage) {
    // In production, this would use a real face recognition library
    // For now, we'll simulate with a hash
    const encoding = crypto
      .createHash('sha256')
      .update(processedImage)
      .digest('hex');

    return encoding;
  }

  /**
   * Extract fingerprint template (simulated)
   */
  async extractFingerprintTemplate(fingerprintData) {
    // In production, this would use a real fingerprint SDK
    // For now, we'll simulate with a hash
    const template = crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');

    return template;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Generate biometric hash for matching
   */
  generateBiometricHash(template, salt) {
    return crypto
      .createHash('sha256')
      .update(template + salt)
      .digest('hex');
  }

  /**
   * Compare biometric templates (simulated)
   */
  compareTemplates(template1, template2, threshold = 0.8) {
    // In production, this would use actual biometric matching
    // For now, we'll simulate with string comparison
    const similarity = template1 === template2 ? 1.0 : Math.random() * 0.3;
    
    return {
      match: similarity >= threshold,
      score: similarity
    };
  }

  /**
   * Generate liveness challenge
   */
  generateLivenessChallenge() {
    const challenges = [
      'blink_twice',
      'turn_head_left',
      'turn_head_right',
      'smile',
      'open_mouth'
    ];
    
    const selectedChallenges = [];
    for (let i = 0; i < 3; i++) {
      const index = Math.floor(Math.random() * challenges.length);
      selectedChallenges.push(challenges[index]);
      challenges.splice(index, 1);
    }
    
    return {
      challengeId: crypto.randomBytes(16).toString('hex'),
      challenges: selectedChallenges,
      expiresAt: new Date(Date.now() + 60000) // 1 minute
    };
  }

  /**
   * Verify liveness challenge (simulated)
   */
  verifyLivenessChallenge(challengeId, responses) {
    // In production, this would analyze the actual video/images
    // For now, we'll simulate success
    return {
      isLive: true,
      confidence: 0.95
    };
  }
}

export default BiometricService;