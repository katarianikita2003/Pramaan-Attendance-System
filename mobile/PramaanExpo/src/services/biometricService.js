// mobile/PramaanExpo/src/services/biometricService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import cameraService from './cameraService';
import api from './api';

class BiometricService {
  constructor() {
    this.isEnrolled = false;
    this.biometricData = null;
  }

  // Initialize service
  async init() {
    try {
      const enrolled = await AsyncStorage.getItem('biometric_enrolled');
      this.isEnrolled = enrolled === 'true';
    } catch (error) {
      console.error('Biometric service init error:', error);
    }
  }

  // Capture face without face detection (temporary workaround)
  async captureFace() {
    try {
      const image = await cameraService.captureFaceForBiometric();

      if (!image) {
        return {
          success: false,
          error: 'Failed to capture image'
        };
      }

      // Simulate face detection data for testing
      const simulatedFaceData = {
        bounds: {
          size: { width: 200, height: 200 },
          origin: { x: 100, y: 100 }
        },
        // Simulate face landmarks
        leftEyePosition: { x: 120, y: 150 },
        rightEyePosition: { x: 180, y: 150 },
        leftEarPosition: { x: 90, y: 170 },
        rightEarPosition: { x: 210, y: 170 },
        leftMouthPosition: { x: 130, y: 200 },
        rightMouthPosition: { x: 170, y: 200 },
        noseBasePosition: { x: 150, y: 180 },
        smilingProbability: 0.7,
        rollAngle: 0,
        yawAngle: 0
      };

      return {
        success: true,
        data: {
          ...image,
          faceData: simulatedFaceData,
          detectionConfidence: 0.95 // Simulated confidence
        }
      };
    } catch (error) {
      console.error('Face capture error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Capture fingerprint (simulated for now)
  async captureFingerprint() {
    // Simulate fingerprint capture with a delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const template = this.generateMockTemplate();
    const commitment = await zkpService.generateCommitment(template);

    return {
      template,
      commitment,
      quality: Math.random() * 40 + 60 // 60-100 quality score
    };
  }

  // Generate mock fingerprint template
  generateMockFingerprintTemplate() {
    const template = [];
    for (let i = 0; i < 512; i++) {
      template.push(Math.floor(Math.random() * 256));
    }
    // Convert array to base64 without using Buffer (not available in React Native)
    const uint8Array = new Uint8Array(template);
    const base64String = btoa(String.fromCharCode(...uint8Array));
    return base64String;
  }

  // Generate biometric commitment (ZKP)
  async generateBiometricCommitment(biometricData) {
    try {
      // In production, this would use actual ZKP libraries
      // For now, generate mock commitment
      const commitment = this.generateMockCommitment(biometricData);
      const nullifier = this.generateMockNullifier(biometricData);

      return {
        commitment,
        nullifier,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Commitment generation error:', error);
      throw error;
    }
  }

  // Generate mock commitment
  generateMockCommitment(data) {
    // Using a simple hash simulation without crypto-js
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  // Generate mock nullifier
  generateMockNullifier(data) {
    // Using a simple hash simulation without crypto-js
    const dataString = 'nullifier_' + JSON.stringify(data) + Date.now();
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  // Save biometric enrollment
  async saveBiometricEnrollment(biometricData) {
    try {
      await AsyncStorage.setItem('biometric_enrolled', 'true');
      await AsyncStorage.setItem('biometric_data', JSON.stringify(biometricData));
      this.isEnrolled = true;
      this.biometricData = biometricData;
      return true;
    } catch (error) {
      console.error('Save enrollment error:', error);
      return false;
    }
  }

  // Check if biometric is enrolled
  async isBiometricEnrolled() {
    return this.isEnrolled;
  }

  // Verify biometric (for authentication)
  async verifyBiometric(capturedData, enrolledData) {
    try {
      // In production, this would use actual biometric matching
      // For now, simulate verification with random success
      const isMatch = Math.random() > 0.1; // 90% success rate for testing

      return {
        success: isMatch,
        confidence: isMatch ? 0.95 : 0.3,
        error: isMatch ? null : 'Biometric did not match'
      };
    } catch (error) {
      console.error('Biometric verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Authenticate user with biometric
  async authenticateWithBiometric(scholarId) {
    try {
      if (!this.isEnrolled) {
        throw new Error('Biometric not enrolled. Please enroll first.');
      }

      // Capture face for authentication
      const faceResult = await this.captureFace();

      if (!faceResult.success) {
        throw new Error(faceResult.error || 'Failed to capture face');
      }

      // Create authentication data
      const authData = {
        faceImage: faceResult.data.imageBase64,
        faceFeatures: this.extractFaceFeatures(faceResult.data.faceData),
        timestamp: faceResult.data.timestamp
      };

      // Authenticate with backend
      const response = await api.post('/biometric/authenticate', {
        scholarId,
        authData
      });

      return {
        success: true,
        zkProof: response.data.zkProof,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractFaceFeatures(faceData) {
    // Extract relevant face features for matching
    return {
      bounds: faceData.bounds,
      landmarks: {
        leftEye: faceData.leftEyePosition,
        rightEye: faceData.rightEyePosition,
        leftEar: faceData.leftEarPosition,
        rightEar: faceData.rightEarPosition,
        leftMouth: faceData.leftMouthPosition,
        rightMouth: faceData.rightMouthPosition,
        nose: faceData.noseBasePosition
      },
      smilingProbability: faceData.smilingProbability,
      rollAngle: faceData.rollAngle,
      yawAngle: faceData.yawAngle
    };
  }
}

export default new BiometricService();