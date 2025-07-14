// mobile/PramaanExpo/src/services/biometricService.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import api from './api';

const STORAGE_KEYS = {
  BIOMETRIC_ENROLLED: 'biometric_enrolled',
  SCHOLAR_BIOMETRIC_DATA: 'scholar_biometric_data',
};

class BiometricService {
  // Check if biometric is available on device
  async checkBiometricAvailability() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      return {
        available: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return {
        available: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: []
      };
    }
  }

  // Check device capabilities
  async checkBiometricSupport() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      return {
        isSupported: compatible,
        isEnrolled: enrolled,
        biometricTypes: await LocalAuthentication.supportedAuthenticationTypesAsync(),
      };
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return {
        isSupported: false,
        isEnrolled: false,
        biometricTypes: [],
      };
    }
  }

  // Capture face for biometric enrollment
  async captureFace() {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        throw new Error('Camera permission denied');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
        cameraType: ImagePicker.CameraType.Front,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        const faceData = {
          uri: image.uri,
          base64: image.base64,
          width: image.width,
          height: image.height,
          timestamp: Date.now(),
          deviceId: Device.deviceName || 'unknown',
        };

        return { success: true, data: faceData };
      } else {
        return { success: false, error: 'Face capture cancelled' };
      }
    } catch (error) {
      console.error('Face capture error:', error);
      return { success: false, error: error.message };
    }
  }

  // Capture fingerprint
  async captureFingerprint() {
    try {
      const biometricSupport = await this.checkBiometricSupport();
      
      if (!biometricSupport.isSupported) {
        throw new Error('Biometric authentication not supported on this device');
      }

      if (!biometricSupport.isEnrolled) {
        throw new Error('No fingerprints enrolled on this device. Please add fingerprints in device settings.');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan your fingerprint',
        fallbackLabel: 'Enter passcode',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Generate a unique fingerprint template for this authentication
        const timestamp = Date.now();
        const deviceId = Device.deviceName || 'unknown';
        const templateData = `${timestamp}_${deviceId}_${Platform.OS}`;
        const fingerprintHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          templateData
        );

        const fingerprintData = {
          timestamp,
          deviceId,
          platform: Platform.OS,
          template: fingerprintHash,
          biometricTypes: biometricSupport.biometricTypes,
        };

        return { success: true, data: fingerprintData };
      } else {
        return { 
          success: false, 
          error: result.error || 'Fingerprint capture failed' 
        };
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate biometric commitment using proper hashing
  async generateBiometricCommitment(biometricData) {
    try {
      // Create a deterministic string from biometric data
      const dataString = JSON.stringify({
        ...biometricData,
        salt: await this.generateSalt(),
      });

      // Generate SHA256 hash as commitment
      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );

      // Generate nullifier (another hash of the commitment)
      const nullifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        commitment
      );

      return { 
        commitment, 
        nullifier,
        hash: commitment // Store the same as commitment for backend compatibility
      };
    } catch (error) {
      console.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  // Generate random salt
  async generateSalt() {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Check if biometric is enrolled for a specific scholar
  async isBiometricEnrolled(scholarId) {
    try {
      const key = `${STORAGE_KEYS.BIOMETRIC_ENROLLED}_${scholarId}`;
      const enrolled = await AsyncStorage.getItem(key);
      return enrolled === 'true';
    } catch (error) {
      console.error('Error checking biometric enrollment status:', error);
      return false;
    }
  }

  // Save biometric enrollment status for a scholar
  async saveBiometricEnrollment(scholarId, enrolled = true) {
    try {
      const key = `${STORAGE_KEYS.BIOMETRIC_ENROLLED}_${scholarId}`;
      await AsyncStorage.setItem(key, enrolled ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving biometric enrollment status:', error);
      throw error;
    }
  }

  // Store biometric data locally for a scholar
  async storeBiometricData(scholarId, biometricData) {
    try {
      const key = `${STORAGE_KEYS.SCHOLAR_BIOMETRIC_DATA}_${scholarId}`;
      await AsyncStorage.setItem(key, JSON.stringify(biometricData));
    } catch (error) {
      console.error('Error storing biometric data:', error);
      throw error;
    }
  }

  // Retrieve biometric data for a scholar
  async getBiometricData(scholarId) {
    try {
      const key = `${STORAGE_KEYS.SCHOLAR_BIOMETRIC_DATA}_${scholarId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving biometric data:', error);
      return null;
    }
  }

  // Generate attendance proof using fingerprint
  async generateAttendanceProof(scholarId) {
    try {
      console.log('Generating attendance proof for scholar:', scholarId);
      
      // First, capture fresh fingerprint
      const fingerprintResult = await this.captureFingerprint();
      if (!fingerprintResult.success) {
        throw new Error(fingerprintResult.error || 'Failed to capture fingerprint');
      }

      // Get stored biometric data
      const storedData = await this.getBiometricData(scholarId);
      if (!storedData || !storedData.fingerprintCommitment) {
        throw new Error('No enrolled fingerprint found. Please enroll your biometric first.');
      }

      // Generate commitment from current fingerprint
      const currentCommitment = await this.generateBiometricCommitment(fingerprintResult.data);

      // For actual implementation, you would verify that current fingerprint
      // matches the enrolled one. For now, we'll use the stored commitment
      // since we can't actually compare fingerprints on the device
      
      // Create proof that current fingerprint matches enrolled one
      const proof = {
        commitment: storedData.fingerprintCommitment.commitment, // Use stored commitment
        nullifier: currentCommitment.nullifier,
        timestamp: Date.now(),
        deviceId: Device.deviceName || 'unknown',
        biometricType: 'fingerprint'
      };

      console.log('Attendance proof generated successfully');
      
      return {
        success: true,
        proof
      };
    } catch (error) {
      console.error('Error generating attendance proof:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate biometric proof for general use
  async generateBiometricProof(scholarId, capturedBiometric) {
    try {
      // Get stored biometric data
      const storedData = await this.getBiometricData(scholarId);
      if (!storedData) {
        throw new Error('No biometric data found for scholar');
      }

      // In a real implementation, this would use actual ZKP libraries
      // For now, we'll create a proof structure
      const timestamp = Date.now();
      const proofData = {
        scholarId,
        timestamp,
        biometricType: capturedBiometric.type || 'face',
        deviceId: Device.deviceName || 'unknown',
      };

      // Generate proof hash
      const proofString = JSON.stringify(proofData);
      const proofHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        proofString
      );

      return {
        proof: proofHash,
        timestamp,
        publicInputs: {
          scholarId,
          timestamp,
        },
      };
    } catch (error) {
      console.error('Error generating biometric proof:', error);
      throw error;
    }
  }

  // Clear all biometric data for a scholar
  async clearBiometricData(scholarId) {
    try {
      const enrollmentKey = `${STORAGE_KEYS.BIOMETRIC_ENROLLED}_${scholarId}`;
      const dataKey = `${STORAGE_KEYS.SCHOLAR_BIOMETRIC_DATA}_${scholarId}`;
      
      await AsyncStorage.multiRemove([enrollmentKey, dataKey]);
    } catch (error) {
      console.error('Error clearing biometric data:', error);
      throw error;
    }
  }
}

export default new BiometricService();

// // backend/src/services/biometric.service.js
// import crypto from 'crypto';
// import sharp from 'sharp';
// import logger from '../utils/logger.js';

// export class BiometricService {
//   constructor() {
//     this.algorithm = 'aes-256-gcm';
//     this.key = Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
//   }

//   /**
//    * Validate biometric data quality
//    */
//   validateBiometricQuality(biometricData) {
//     const errors = [];
//     const minQualityScore = 0.7;

//     // Validate face data
//     if (biometricData.face) {
//       const faceQuality = this.assessFaceQuality(biometricData.face);
//       if (faceQuality.score < minQualityScore) {
//         errors.push(...faceQuality.issues);
//       }
//     }

//     // Validate fingerprint data
//     if (biometricData.fingerprint) {
//       const fingerprintQuality = this.assessFingerprintQuality(biometricData.fingerprint);
//       if (fingerprintQuality.score < minQualityScore) {
//         errors.push(...fingerprintQuality.issues);
//       }
//     }

//     return {
//       isValid: errors.length === 0,
//       errors,
//       quality: {
//         face: biometricData.face ? this.assessFaceQuality(biometricData.face).score : null,
//         fingerprint: biometricData.fingerprint ? this.assessFingerprintQuality(biometricData.fingerprint).score : null
//       }
//     };
//   }

//   /**
//    * Assess face image quality
//    */
//   assessFaceQuality(faceData) {
//     const issues = [];
//     let score = 1.0;

//     try {
//       // Check image dimensions
//       if (faceData.width < 200 || faceData.height < 200) {
//         issues.push('Face image resolution too low');
//         score -= 0.3;
//       }

//       // Check image format
//       if (!['image/jpeg', 'image/png'].includes(faceData.mimeType)) {
//         issues.push('Invalid image format');
//         score -= 0.2;
//       }

//       // Check file size
//       if (faceData.size > 5 * 1024 * 1024) {
//         issues.push('Image file too large');
//         score -= 0.1;
//       }

//       // Simulate face detection confidence
//       const faceConfidence = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
//       if (faceConfidence < 0.8) {
//         issues.push('Low face detection confidence');
//         score -= (1 - faceConfidence);
//       }

//       return { score: Math.max(0, score), issues };
//     } catch (error) {
//       logger.error('Face quality assessment error:', error);
//       return { score: 0, issues: ['Face quality assessment failed'] };
//     }
//   }

//   /**
//    * Assess fingerprint quality
//    */
//   assessFingerprintQuality(fingerprintData) {
//     const issues = [];
//     let score = 1.0;

//     try {
//       // Check minutiae count
//       const minutiaeCount = fingerprintData.minutiaeCount || 0;
//       if (minutiaeCount < 12) {
//         issues.push('Insufficient fingerprint minutiae');
//         score -= 0.4;
//       }

//       // Check image quality score
//       const qualityScore = fingerprintData.qualityScore || 0;
//       if (qualityScore < 60) {
//         issues.push('Low fingerprint quality score');
//         score -= (100 - qualityScore) / 100;
//       }

//       // Check capture device
//       if (!fingerprintData.deviceInfo) {
//         issues.push('Missing capture device information');
//         score -= 0.1;
//       }

//       return { score: Math.max(0, score), issues };
//     } catch (error) {
//       logger.error('Fingerprint quality assessment error:', error);
//       return { score: 0, issues: ['Fingerprint quality assessment failed'] };
//     }
//   }

//   /**
//    * Process and normalize face image
//    */
//   async processFaceImage(imageBuffer) {
//     try {
//       // Resize and normalize image
//       const processedImage = await sharp(imageBuffer)
//         .resize(224, 224) // Standard size for face recognition
//         .grayscale()
//         .normalize()
//         .toBuffer();

//       return processedImage;
//     } catch (error) {
//       logger.error('Face image processing error:', error);
//       throw new Error('Failed to process face image');
//     }
//   }

//   /**
//    * Extract face encoding (simulated)
//    */
//   async extractFaceEncoding(processedImage) {
//     // In production, this would use a real face recognition library
//     // For now, we'll simulate with a hash
//     const encoding = crypto
//       .createHash('sha256')
//       .update(processedImage)
//       .digest('hex');

//     return encoding;
//   }

//   /**
//    * Extract fingerprint template (simulated)
//    */
//   async extractFingerprintTemplate(fingerprintData) {
//     // In production, this would use a real fingerprint SDK
//     // For now, we'll simulate with a hash
//     const template = crypto
//       .createHash('sha256')
//       .update(JSON.stringify(fingerprintData))
//       .digest('hex');

//     return template;
//   }

//   /**
//    * Encrypt sensitive data
//    */
//   encrypt(data) {
//     const iv = crypto.randomBytes(16);
//     const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
//     const encrypted = Buffer.concat([
//       cipher.update(JSON.stringify(data), 'utf8'),
//       cipher.final()
//     ]);
    
//     const authTag = cipher.getAuthTag();
    
//     return {
//       encrypted: encrypted.toString('base64'),
//       iv: iv.toString('base64'),
//       authTag: authTag.toString('base64')
//     };
//   }

//   /**
//    * Decrypt sensitive data
//    */
//   decrypt(encryptedData) {
//     const decipher = crypto.createDecipheriv(
//       this.algorithm,
//       this.key,
//       Buffer.from(encryptedData.iv, 'base64')
//     );
    
//     decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
//     const decrypted = Buffer.concat([
//       decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
//       decipher.final()
//     ]);
    
//     return JSON.parse(decrypted.toString('utf8'));
//   }

//   /**
//    * Generate biometric hash for matching
//    */
//   generateBiometricHash(template, salt) {
//     return crypto
//       .createHash('sha256')
//       .update(template + salt)
//       .digest('hex');
//   }

//   /**
//    * Compare biometric templates (simulated)
//    */
//   compareTemplates(template1, template2, threshold = 0.8) {
//     // In production, this would use actual biometric matching
//     // For now, we'll simulate with string comparison
//     const similarity = template1 === template2 ? 1.0 : Math.random() * 0.3;
    
//     return {
//       match: similarity >= threshold,
//       score: similarity
//     };
//   }

//   /**
//    * Generate liveness challenge
//    */
//   generateLivenessChallenge() {
//     const challenges = [
//       'blink_twice',
//       'turn_head_left',
//       'turn_head_right',
//       'smile',
//       'open_mouth'
//     ];
    
//     const selectedChallenges = [];
//     for (let i = 0; i < 3; i++) {
//       const index = Math.floor(Math.random() * challenges.length);
//       selectedChallenges.push(challenges[index]);
//       challenges.splice(index, 1);
//     }
    
//     return {
//       challengeId: crypto.randomBytes(16).toString('hex'),
//       challenges: selectedChallenges,
//       expiresAt: new Date(Date.now() + 60000) // 1 minute
//     };
//   }

//   /**
//    * Verify liveness challenge (simulated)
//    */
//   verifyLivenessChallenge(challengeId, responses) {
//     // In production, this would analyze the actual video/images
//     // For now, we'll simulate success
//     return {
//       isLive: true,
//       confidence: 0.95
//     };
//   }
// }

// export default BiometricService;