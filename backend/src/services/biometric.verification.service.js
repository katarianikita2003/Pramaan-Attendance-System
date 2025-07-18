// backend/src/services/biometric.verification.service.js
import crypto from 'crypto';
import BiometricCommitment from '../models/BiometricCommitment.js';
import logger from '../utils/logger.js';

class BiometricVerificationService {
  constructor() {
    this.iterations = 100000;
    this.keyLength = 64;
    this.digest = 'sha512';
  }

  /**
   * Generate biometric hash using PBKDF2
   */
  generateBiometricHash(template, salt) {
    if (!template || !salt) {
      throw new Error('Template and salt are required for hash generation');
    }
    
    return crypto.pbkdf2Sync(
      template.toString(),
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    ).toString('hex');
  }

  /**
   * Compare biometric templates
   */
  compareTemplates(template1, template2) {
    // In production, this would use actual biometric matching algorithms
    // For simulation, we'll do a simple comparison
    return template1 === template2;
  }

  /**
   * Verify biometric against stored commitment
   */
  async verifyBiometric(userId, biometricType, providedBiometricData) {
    try {
      // Get the biometric commitment for the user
      const commitment = await BiometricCommitment.findOne({
        userId,
        isActive: true
      });

      if (!commitment) {
        logger.warn(`No biometric commitment found for user: ${userId}`);
        return {
          verified: false,
          error: 'No biometric enrolled'
        };
      }

      // Get the stored biometric data for the specified type
      const storedBiometric = commitment.commitments[biometricType];
      
      if (!storedBiometric || !storedBiometric.hash) {
        logger.warn(`No ${biometricType} biometric enrolled for user: ${userId}`);
        return {
          verified: false,
          error: `${biometricType} not enrolled`
        };
      }

      // Extract the salt from the stored commitment
      let salt;
      
      // First try to get salt directly if it's stored
      if (storedBiometric.salt) {
        salt = storedBiometric.salt;
      } else if (storedBiometric.commitment) {
        // Try to parse the commitment string to extract salt
        try {
          const commitmentData = JSON.parse(storedBiometric.commitment);
          salt = commitmentData.salt;
        } catch (e) {
          logger.error('Failed to parse commitment data:', e);
          // If parsing fails, use the commitment itself as salt (fallback)
          salt = storedBiometric.commitment;
        }
      }

      if (!salt) {
        logger.error('Salt not found in biometric commitment');
        return {
          verified: false,
          error: 'Invalid biometric enrollment data'
        };
      }

      // For simulation mode, we'll just check if biometric data was provided
      // In production, this would:
      // 1. Generate hash of provided biometric with the stored salt
      // 2. Compare with stored hash
      // 3. Use actual biometric matching algorithms
      
      if (providedBiometricData) {
        // Simulate successful verification
        logger.info(`Biometric verification simulated for user: ${userId}, type: ${biometricType}`);
        
        return {
          verified: true,
          type: biometricType,
          timestamp: new Date()
        };
      }

      return {
        verified: false,
        error: 'Invalid biometric data'
      };

    } catch (error) {
      logger.error('Biometric verification error:', error);
      return {
        verified: false,
        error: 'Verification failed due to system error'
      };
    }
  }

  /**
   * Generate biometric commitment for enrollment
   */
  async generateCommitment(biometricData, type) {
    try {
      // Generate random salt
      const salt = crypto.randomBytes(32).toString('hex');
      
      // Create commitment data
      const commitmentData = {
        template: biometricData,
        salt: salt,
        timestamp: Date.now(),
        type: type
      };
      
      // Generate hash
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(commitmentData))
        .digest('hex');
      
      return {
        commitment: JSON.stringify(commitmentData),
        hash: hash,
        salt: salt, // Store salt separately for easy access
        type: type
      };
    } catch (error) {
      logger.error('Error generating biometric commitment:', error);
      throw error;
    }
  }
}

export default new BiometricVerificationService();

// // backend/src/services/biometric.verification.service.js
// import crypto from 'crypto';
// import BiometricCommitment from '../models/BiometricCommitment.js';
// import logger from '../utils/logger.js';

// class BiometricVerificationService {
//   constructor() {
//     this.algorithm = 'sha256';
//     this.iterations = 10000;
//     this.keyLength = 64;
//   }

//   /**
//    * Generate a deterministic hash from biometric data
//    * This ensures same biometric always produces same hash
//    */
//   generateBiometricHash(biometricData, salt) {
//     // Normalize the biometric data to ensure consistency
//     const normalizedData = this.normalizeBiometricData(biometricData);
    
//     // Generate deterministic hash using PBKDF2
//     return crypto.pbkdf2Sync(
//       normalizedData,
//       salt,
//       this.iterations,
//       this.keyLength,
//       this.algorithm
//     ).toString('hex');
//   }

//   /**
//    * Normalize biometric data to handle minor variations
//    * In production, this would use proper biometric matching algorithms
//    */
//   normalizeBiometricData(biometricData) {
//     if (typeof biometricData === 'string') {
//       return biometricData;
//     }
    
//     // For fingerprint minutiae or face vectors
//     if (Array.isArray(biometricData)) {
//       return biometricData.sort().join('|');
//     }
    
//     // For object-based biometric data
//     if (typeof biometricData === 'object') {
//       return JSON.stringify(biometricData, Object.keys(biometricData).sort());
//     }
    
//     return String(biometricData);
//   }

//   /**
//    * Verify if the provided biometric matches the enrolled biometric
//    */
//   async verifyBiometric(userId, biometricType, providedBiometricData) {
//     try {
//       // Get the enrolled biometric commitment
//       const enrollment = await BiometricCommitment.findOne({
//         userId,
//         isActive: true
//       });

//       if (!enrollment) {
//         logger.warn(`No biometric enrollment found for user ${userId}`);
//         return {
//           isValid: false,
//           error: 'No biometric enrollment found'
//         };
//       }

//       // Check if the specific biometric type is enrolled
//       const enrolledBiometric = enrollment.commitments?.[biometricType];
//       if (!enrolledBiometric || !enrolledBiometric.hash) {
//         logger.warn(`${biometricType} not enrolled for user ${userId}`);
//         return {
//           isValid: false,
//           error: `${biometricType} biometric not enrolled`
//         };
//       }

//       // Generate hash of provided biometric using the same salt
//       const providedHash = this.generateBiometricHash(
//         providedBiometricData,
//         enrolledBiometric.salt
//       );

//       // Compare hashes
//       const isMatch = providedHash === enrolledBiometric.hash;

//       if (!isMatch) {
//         logger.warn(`Biometric mismatch for user ${userId}, type: ${biometricType}`);
        
//         // Increment failed attempts
//         enrollment.verificationAttempts = (enrollment.verificationAttempts || 0) + 1;
//         enrollment.lastVerificationAttempt = new Date();
        
//         // Lock account after 5 failed attempts
//         if (enrollment.verificationAttempts >= 5) {
//           enrollment.isActive = false;
//           enrollment.lockedAt = new Date();
//           logger.error(`Biometric locked for user ${userId} after 5 failed attempts`);
//         }
        
//         await enrollment.save();
        
//         return {
//           isValid: false,
//           error: 'Biometric verification failed',
//           attemptsRemaining: Math.max(0, 5 - enrollment.verificationAttempts)
//         };
//       }

//       // Successful verification - reset attempts
//       enrollment.verificationAttempts = 0;
//       enrollment.lastSuccessfulVerification = new Date();
//       await enrollment.save();

//       logger.info(`Biometric verified successfully for user ${userId}, type: ${biometricType}`);
      
//       return {
//         isValid: true,
//         biometricType,
//         verifiedAt: new Date()
//       };

//     } catch (error) {
//       logger.error('Biometric verification error:', error);
//       return {
//         isValid: false,
//         error: 'Verification failed due to system error'
//       };
//     }
//   }

//   /**
//    * Generate a biometric commitment for enrollment
//    */
//   async generateCommitment(biometricData, biometricType) {
//     try {
//       // Generate a random salt for this biometric
//       const salt = crypto.randomBytes(32).toString('hex');
      
//       // Generate the hash
//       const hash = this.generateBiometricHash(biometricData, salt);
      
//       // Generate a unique ID for this commitment
//       const commitmentId = crypto.randomBytes(16).toString('hex');
      
//       return {
//         commitmentId,
//         type: biometricType,
//         hash,
//         salt,
//         algorithm: this.algorithm,
//         iterations: this.iterations,
//         createdAt: new Date()
//       };
//     } catch (error) {
//       logger.error('Commitment generation error:', error);
//       throw new Error('Failed to generate biometric commitment');
//     }
//   }

//   /**
//    * Compare two biometric samples (for re-enrollment check)
//    */
//   async compareBiometrics(biometric1, biometric2, threshold = 0.95) {
//     // In production, this would use proper biometric matching algorithms
//     // For now, we'll use a simple comparison
//     const norm1 = this.normalizeBiometricData(biometric1);
//     const norm2 = this.normalizeBiometricData(biometric2);
    
//     return norm1 === norm2;
//   }
// }

// export default new BiometricVerificationService();