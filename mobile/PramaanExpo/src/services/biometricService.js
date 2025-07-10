// 2. Update biometric service - mobile/PramaanExpo/src/services/biometricService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import cameraService from './cameraService';
import api from './api';

class BiometricService {
  async enrollBiometric(scholarId) {
    try {
      // Capture face for biometric
      const faceData = await cameraService.captureFaceForBiometric();
      
      // Create biometric data package
      const biometricData = {
        faceImage: faceData.imageBase64,
        faceFeatures: this.extractFaceFeatures(faceData.faceData),
        timestamp: faceData.timestamp,
        deviceInfo: {
          platform: Platform.OS,
          model: Device.modelName || 'Unknown'
        }
      };

      // Send to backend for ZKP enrollment
      const response = await api.post('/biometric/enroll', {
        scholarId,
        biometricData
      });

      // Store enrollment status locally
      await AsyncStorage.setItem(`biometric_enrolled_${scholarId}`, 'true');
      
      return {
        success: true,
        message: 'Biometric enrolled successfully',
        zkProof: response.data.zkProof
      };
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async authenticateWithBiometric(scholarId) {
    try {
      // Check if enrolled
      const enrolled = await AsyncStorage.getItem(`biometric_enrolled_${scholarId}`);
      if (!enrolled) {
        throw new Error('Biometric not enrolled. Please enroll first.');
      }

      // Capture face for authentication
      const faceData = await cameraService.captureFaceForBiometric();
      
      // Create authentication data
      const authData = {
        faceImage: faceData.imageBase64,
        faceFeatures: this.extractFaceFeatures(faceData.faceData),
        timestamp: faceData.timestamp
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
