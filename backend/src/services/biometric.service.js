import crypto from 'crypto';
import logger from '../utils/logger.js';

export class BiometricService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 64;
  }

  generateSalt() {
    return crypto.randomBytes(this.saltLength).toString('hex');
  }

  async generateBiometricHash(biometricData, salt) {
    try {
      const dataString = JSON.stringify(biometricData);
      const hash = crypto
        .createHash('sha256')
        .update(dataString + salt)
        .digest('hex');
      return hash;
    } catch (error) {
      logger.error('Biometric hash generation failed:', error);
      throw error;
    }
  }

  encryptBiometricData(data, key) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key), iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Biometric encryption failed:', error);
      throw error;
    }
  }

  decryptBiometricData(encryptedData, key, iv, authTag) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        Buffer.from(key), 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Biometric decryption failed:', error);
      throw error;
    }
  }

  validateBiometricFormat(biometricData) {
    const required = ['type', 'template', 'quality'];
    const missing = required.filter(field => !biometricData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing biometric fields: ${missing.join(', ')}`);
    }
    
    if (biometricData.quality < 0.6) {
      throw new Error('Biometric quality too low');
    }
    
    return true;
  }
}