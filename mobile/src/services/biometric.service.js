// ===== mobile/src/services/biometric.service.js =====
import ReactNativeBiometrics from 'react-native-biometrics';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crypto from 'react-native-crypto';
import FaceDetector from '@react-native-ml-kit/face-detection';

const { BiometricModule } = NativeModules;

class BiometricService {
  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      
      if (!available) {
        throw new Error('Biometric authentication not available');
      }
      
      this.biometryType = biometryType;
      this.isInitialized = true;
      
      console.log(`Biometric service initialized with ${biometryType}`);
    } catch (error) {
      console.error('Biometric initialization error:', error);
      throw error;
    }
  }

  async enrollFingerprint(scholarId) {
    try {
      // Check if keys exist
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        // Create new keys
        const { publicKey } = await this.rnBiometrics.createKeys();
        
        // Store public key
        await AsyncStorage.setItem(`biometric_pubkey_${scholarId}`, publicKey);
      }
      
      // Get user to authenticate for enrollment
      const epochTimeSeconds = Math.round((new Date()).getTime() / 1000).toString();
      const payload = `${scholarId}_enrollment_${epochTimeSeconds}`;
      
      const { success, signature, error } = await this.rnBiometrics.createSignature({
        promptMessage: 'Register your fingerprint for attendance',
        payload,
        cancelButtonText: 'Cancel'
      });
      
      if (!success) {
        throw new Error(error || 'Fingerprint enrollment cancelled');
      }
      
      // Generate fingerprint template
      const template = {
        type: 'fingerprint',
        signature,
        payload,
        publicKey: await AsyncStorage.getItem(`biometric_pubkey_${scholarId}`),
        timestamp: Date.now(),
        deviceInfo: {
          platform: Platform.OS,
          model: Platform.Version,
          biometryType: this.biometryType
        }
      };
      
      return template;
    } catch (error) {
      console.error('Fingerprint enrollment error:', error);
      throw error;
    }
  }

  async verifyFingerprint(scholarId) {
    try {
      const epochTimeSeconds = Math.round((new Date()).getTime() / 1000).toString();
      const payload = `${scholarId}_verify_${epochTimeSeconds}`;
      
      const { success, signature, error } = await this.rnBiometrics.createSignature({
        promptMessage: 'Verify your fingerprint',
        payload,
        cancelButtonText: 'Cancel'
      });
      
      if (!success) {
        throw new Error(error || 'Fingerprint verification failed');
      }
      
      return {
        verified: true,
        signature,
        payload,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Fingerprint verification error:', error);
      throw error;
    }
  }

  async enrollFace(scholarId) {
    try {
      // Use native module if available for better performance
      if (BiometricModule && BiometricModule.enrollFace) {
        return await BiometricModule.enrollFace(scholarId);
      }
      
      // Fallback to ML Kit implementation
      const faceData = await this.captureFaceWithLiveness();
      
      if (!faceData.isLive) {
        throw new Error('Liveness detection failed');
      }
      
      // Generate face template
      const template = {
        type: 'face',
        embedding: faceData.embedding,
        landmarks: faceData.landmarks,
        quality: faceData.quality,
        timestamp: Date.now(),
        deviceInfo: {
          platform: Platform.OS,
          model: Platform.Version
        }
      };
      
      return template;
    } catch (error) {
      console.error('Face enrollment error:', error);
      throw error;
    }
  }

  async captureFaceWithLiveness() {
    // This would be implemented with the camera component
    // Returning mock data for now
    return {
      isLive: true,
      embedding: this.generateFaceEmbedding(),
      landmarks: this.extractLandmarks(),
      quality: 0.95
    };
  }

  generateFaceEmbedding() {
    // In production, use a real face embedding model
    const embedding = [];
    for (let i = 0; i < 128; i++) {
      embedding.push(Math.random());
    }
    return embedding;
  }

  extractLandmarks() {
    // Mock facial landmarks
    return {
      leftEye: { x: 0.3, y: 0.4 },
      rightEye: { x: 0.7, y: 0.4 },
      nose: { x: 0.5, y: 0.5 },
      mouth: { x: 0.5, y: 0.7 },
      leftEar: { x: 0.1, y: 0.5 },
      rightEar: { x: 0.9, y: 0.5 }
    };
  }

  async createBiometricHash(fingerprintData, faceData) {
    const combined = {
      fingerprint: fingerprintData,
      face: faceData,
      timestamp: Date.now(),
      deviceId: await this.getDeviceId()
    };
    
    const hash = crypto.createHash('sha512')
      .update(JSON.stringify(combined))
      .digest('hex');
    
    return hash;
  }

  async getDeviceId() {
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomBytes(16).toString('hex');
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  validateBiometricQuality(biometricData) {
    const errors = [];
    
    if (biometricData.fingerprint) {
      const fpQuality = biometricData.fingerprint.quality || 0;
      if (fpQuality < 0.7) {
        errors.push('Fingerprint quality too low');
      }
    }
    
    if (biometricData.face) {
      const faceQuality = biometricData.face.quality || 0;
      if (faceQuality < 0.8) {
        errors.push('Face quality too low');
      }
      
      if (biometricData.face.livenessScore < 0.9) {
        errors.push('Face liveness check failed');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const biometricService = new BiometricService();
