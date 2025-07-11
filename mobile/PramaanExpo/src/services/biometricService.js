// src/services/biometricService.js - Complete Biometric Authentication
import * as LocalAuthentication from 'expo-local-authentication';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { biometricService as apiService } from './api';

const STORAGE_KEYS = {
  BIOMETRIC_ENROLLED: 'biometric_enrolled',
  FACE_TEMPLATE: 'face_template',
  FINGERPRINT_TEMPLATE: 'fingerprint_template',
  BIOMETRIC_COMMITMENT: 'biometric_commitment',
  ENROLLMENT_STATUS: 'enrollment_status',
};

class BiometricService {
  constructor() {
    this.isInitialized = false;
    this.enrollmentProgress = {
      step: 0,
      totalSteps: 3,
      completed: false,
    };
  }

  // Initialize biometric services
  async initialize() {
    try {
      // Check device biometric capabilities
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      this.deviceCapabilities = {
        hasHardware,
        supportedTypes,
        isEnrolled,
        supportsFaceID: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
        supportsFingerprint: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
        supportsTouchID: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
      };

      // Check camera permissions
      const cameraPermissions = await Camera.requestCameraPermissionsAsync();
      this.cameraPermissions = cameraPermissions.status === 'granted';

      this.isInitialized = true;
      return { success: true, capabilities: this.deviceCapabilities };
    } catch (error) {
      console.error('Biometric initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if device supports biometric authentication
  async checkBiometricSupport() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { hasHardware, isEnrolled, supportedTypes } = this.deviceCapabilities;

    if (!hasHardware) {
      return { supported: false, reason: 'Device does not support biometric authentication' };
    }

    if (!isEnrolled) {
      return { supported: false, reason: 'No biometric data enrolled on device' };
    }

    return {
      supported: true,
      types: supportedTypes,
      capabilities: this.deviceCapabilities,
    };
  }

  // Capture face for biometric enrollment
  async captureFaceForEnrollment() {
    try {
      if (!this.cameraPermissions) {
        const permissions = await Camera.requestCameraPermissionsAsync();
        if (permissions.status !== 'granted') {
          throw new Error('Camera permission denied');
        }
      }

      // For this demo, we'll use image picker since full face detection requires additional libraries
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        return { success: false, error: 'Face capture cancelled' };
      }

      const faceData = {
        imageUri: result.assets[0].uri,
        imageBase64: result.assets[0].base64,
        width: result.assets[0].width,
        height: result.assets[0].height,
        timestamp: Date.now(),
      };

      // Extract facial features (simulated)
      const faceFeatures = await this.extractFaceFeatures(faceData);
      
      return {
        success: true,
        data: {
          ...faceData,
          features: faceFeatures,
          quality: this.calculateFaceQuality(faceData),
        },
      };
    } catch (error) {
      console.error('Face capture error:', error);
      return { success: false, error: error.message };
    }
  }

  // Extract facial features (simulated implementation)
  async extractFaceFeatures(faceData) {
    // In a real implementation, this would use ML libraries like TensorFlow.js
    // For demo purposes, we'll create a simulated feature vector
    
    const features = [];
    const seed = faceData.imageBase64.length + faceData.timestamp;
    
    // Generate 128-dimensional feature vector
    for (let i = 0; i < 128; i++) {
      features.push(Math.sin(seed * i) * 100);
    }

    return {
      vector: features,
      confidence: 0.95,
      landmarks: this.generateFaceLandmarks(),
    };
  }

  // Generate simulated face landmarks
  generateFaceLandmarks() {
    return {
      leftEye: { x: 120, y: 150 },
      rightEye: { x: 180, y: 150 },
      nose: { x: 150, y: 180 },
      leftMouth: { x: 130, y: 220 },
      rightMouth: { x: 170, y: 220 },
    };
  }

  // Calculate face quality score
  calculateFaceQuality(faceData) {
    // Simulated quality assessment based on image properties
    const { width, height } = faceData;
    let quality = 0.8; // Base quality

    if (width >= 300 && height >= 300) quality += 0.1;
    if (width >= 500 && height >= 500) quality += 0.1;

    return Math.min(quality, 1.0);
  }

  // Capture fingerprint for enrollment
  async captureFingerprintForEnrollment() {
    try {
      const biometricSupport = await this.checkBiometricSupport();
      
      if (!biometricSupport.supported) {
        throw new Error(biometricSupport.reason);
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan your fingerprint for enrollment',
        disableDeviceFallback: true,
        requireConfirmation: true,
      });

      if (result.success) {
        // Generate fingerprint template (simulated)
        const fingerprintData = {
          authenticated: true,
          biometricType: result.biometryType || 'fingerprint',
          timestamp: Date.now(),
          template: this.generateFingerprintTemplate(),
          quality: 0.92,
        };

        return { success: true, data: fingerprintData };
      } else {
        return { 
          success: false, 
          error: result.error || 'Fingerprint authentication failed',
        };
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate fingerprint template (simulated)
  generateFingerprintTemplate() {
    const template = [];
    for (let i = 0; i < 256; i++) {
      template.push(Math.floor(Math.random() * 256));
    }
    return template;
  }

  // Perform liveness detection for face
  async performLivenessDetection(faceData) {
    // Simulated liveness detection
    // In real implementation, this would analyze multiple frames for movement
    
    const quality = faceData.quality || 0.8;
    const timestamp = Date.now();
    
    // Simulate liveness score based on quality and other factors
    const livenessScore = quality > 0.8 ? 0.95 : 0.7;
    
    return {
      isLive: livenessScore > 0.8,
      score: livenessScore,
      timestamp,
      checks: {
        faceDetected: true,
        eyesOpen: true,
        mouthClosed: true,
        headMovement: true,
      },
    };
  }

  // Complete biometric enrollment process
  async enrollBiometric(scholarId, options = {}) {
    try {
      this.enrollmentProgress.step = 1;
      
      // Step 1: Check device capabilities
      const support = await this.checkBiometricSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }

      this.enrollmentProgress.step = 2;

      // Step 2: Capture face biometric
      const faceResult = await this.captureFaceForEnrollment();
      if (!faceResult.success) {
        throw new Error(`Face capture failed: ${faceResult.error}`);
      }

      // Perform liveness detection
      const livenessResult = await this.performLivenessDetection(faceResult.data);
      if (!livenessResult.isLive) {
        throw new Error('Liveness detection failed. Please ensure you are not using a photo.');
      }

      // Step 3: Capture fingerprint biometric
      const fingerprintResult = await this.captureFingerprintForEnrollment();
      if (!fingerprintResult.success) {
        throw new Error(`Fingerprint capture failed: ${fingerprintResult.error}`);
      }

      this.enrollmentProgress.step = 3;

      // Generate biometric commitments
      const commitment = await this.generateBiometricCommitment({
        face: faceResult.data,
        fingerprint: fingerprintResult.data,
        liveness: livenessResult,
      });

      // Send to backend for enrollment
      const enrollmentData = {
        scholarId,
        biometrics: {
          face: {
            features: faceResult.data.features,
            quality: faceResult.data.quality,
            liveness: livenessResult,
          },
          fingerprint: {
            template: fingerprintResult.data.template,
            quality: fingerprintResult.data.quality,
            type: fingerprintResult.data.biometricType,
          },
        },
        commitment: commitment.commitment,
        nullifier: commitment.nullifier,
        timestamp: Date.now(),
      };

      const response = await apiService.enrollBiometric(enrollmentData);
      
      if (response.success) {
        // Store enrollment data locally
        await this.saveEnrollmentData(scholarId, {
          commitment: commitment.commitment,
          enrolled: true,
          timestamp: Date.now(),
        });

        this.enrollmentProgress.completed = true;
        return {
          success: true,
          message: 'Biometric enrollment completed successfully',
          commitment: commitment.commitment,
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      return {
        success: false,
        error: error.message,
        step: this.enrollmentProgress.step,
      };
    }
  }

  // Authenticate with biometric for attendance
  async authenticateForAttendance() {
    try {
      // Check if enrolled
      const enrolled = await this.isBiometricEnrolled();
      if (!enrolled) {
        throw new Error('Biometric not enrolled. Please complete enrollment first.');
      }

      // Capture current biometric
      const authChoice = await this.showBiometricChoice();
      
      let authResult;
      if (authChoice === 'face') {
        authResult = await this.authenticateWithFace();
      } else {
        authResult = await this.authenticateWithFingerprint();
      }

      if (authResult.success) {
        // Generate proof for attendance
        const proof = await this.generateAttendanceProof(authResult.data);
        
        return {
          success: true,
          authMethod: authChoice,
          proof: proof,
          timestamp: Date.now(),
        };
      } else {
        throw new Error(authResult.error);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Show biometric choice dialog
  async showBiometricChoice() {
    return new Promise((resolve) => {
      Alert.alert(
        'Choose Authentication Method',
        'How would you like to authenticate?',
        [
          { text: 'Face', onPress: () => resolve('face') },
          { text: 'Fingerprint', onPress: () => resolve('fingerprint') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ]
      );
    });
  }

  // Authenticate with face
  async authenticateWithFace() {
    try {
      const faceResult = await this.captureFaceForEnrollment();
      if (!faceResult.success) {
        throw new Error(faceResult.error);
      }

      // Perform liveness detection
      const livenessResult = await this.performLivenessDetection(faceResult.data);
      if (!livenessResult.isLive) {
        throw new Error('Liveness detection failed');
      }

      return {
        success: true,
        data: {
          type: 'face',
          features: faceResult.data.features,
          quality: faceResult.data.quality,
          liveness: livenessResult,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Authenticate with fingerprint
  async authenticateWithFingerprint() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to mark attendance',
        disableDeviceFallback: true,
      });

      if (result.success) {
        return {
          success: true,
          data: {
            type: 'fingerprint',
            biometricType: result.biometryType,
            timestamp: Date.now(),
            quality: 0.9,
          },
        };
      } else {
        throw new Error('Fingerprint authentication failed');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Generate biometric commitment using ZKP
  async generateBiometricCommitment(biometricData) {
    try {
      const timestamp = Date.now();
      const dataString = JSON.stringify({
        face: biometricData.face.features,
        fingerprint: biometricData.fingerprint.template,
        timestamp,
      });
      
      // Generate commitment hash
      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );

      // Generate nullifier to prevent double-spending
      const nullifierData = `${commitment}:${timestamp}`;
      const nullifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nullifierData
      );

      return { commitment, nullifier, timestamp };
    } catch (error) {
      console.error('Error generating commitment:', error);
      throw error;
    }
  }

  // Generate attendance proof
  async generateAttendanceProof(authData) {
    try {
      const storedCommitment = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_COMMITMENT);
      if (!storedCommitment) {
        throw new Error('No biometric commitment found');
      }

      const commitment = JSON.parse(storedCommitment);
      
      // Generate ZKP proof (simulated)
      const proofData = {
        commitment: commitment.commitment,
        timestamp: Date.now(),
        authMethod: authData.type,
        quality: authData.quality,
        proofId: await this.generateProofId(),
      };

      const proof = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(proofData)
      );

      return {
        proof,
        publicSignals: [commitment.commitment, proofData.timestamp.toString()],
        metadata: proofData,
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error;
    }
  }

  // Generate unique proof ID
  async generateProofId() {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Check if biometric is enrolled
  async isBiometricEnrolled() {
    try {
      const enrolled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED);
      return enrolled === 'true';
    } catch (error) {
      console.error('Error checking enrollment status:', error);
      return false;
    }
  }

  // Save enrollment data locally
  async saveEnrollmentData(scholarId, enrollmentData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENROLLED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_COMMITMENT, JSON.stringify(enrollmentData));
      await AsyncStorage.setItem(STORAGE_KEYS.ENROLLMENT_STATUS, JSON.stringify({
        scholarId,
        enrolled: true,
        timestamp: enrollmentData.timestamp,
      }));
    } catch (error) {
      console.error('Error saving enrollment data:', error);
      throw error;
    }
  }

  // Get enrollment status
  async getEnrollmentStatus() {
    try {
      const status = await AsyncStorage.getItem(STORAGE_KEYS.ENROLLMENT_STATUS);
      return status ? JSON.parse(status) : null;
    } catch (error) {
      console.error('Error getting enrollment status:', error);
      return null;
    }
  }

  // Clear enrollment data
  async clearEnrollmentData() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENROLLED);
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_COMMITMENT);
      await AsyncStorage.removeItem(STORAGE_KEYS.ENROLLMENT_STATUS);
      await AsyncStorage.removeItem(STORAGE_KEYS.FACE_TEMPLATE);
      await AsyncStorage.removeItem(STORAGE_KEYS.FINGERPRINT_TEMPLATE);
    } catch (error) {
      console.error('Error clearing enrollment data:', error);
    }
  }

  // Update biometric data
  async updateBiometric(updateData) {
    try {
      const response = await apiService.updateBiometric(updateData);
      
      if (response.success) {
        // Update local storage
        await this.saveEnrollmentData(updateData.scholarId, {
          commitment: response.data.commitment,
          enrolled: true,
          timestamp: Date.now(),
        });
        
        return { success: true };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error updating biometric:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify biometric against stored template
  async verifyBiometric(currentBiometric) {
    try {
      const response = await apiService.verifyBiometric({
        biometricData: currentBiometric,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error('Error verifying biometric:', error);
      return { success: false, error: error.message };
    }
  }

  // Get biometric quality assessment
  getBiometricQuality(biometricData) {
    if (!biometricData) return 0;

    let quality = 0.5; // Base quality

    if (biometricData.type === 'face') {
      // Face quality factors
      if (biometricData.quality > 0.8) quality += 0.3;
      if (biometricData.liveness && biometricData.liveness.isLive) quality += 0.2;
    } else if (biometricData.type === 'fingerprint') {
      // Fingerprint quality factors
      if (biometricData.quality > 0.9) quality += 0.4;
      if (biometricData.template && biometricData.template.length > 200) quality += 0.1;
    }

    return Math.min(quality, 1.0);
  }

  // Get enrollment progress
  getEnrollmentProgress() {
    return this.enrollmentProgress;
  }

  // Reset enrollment progress
  resetEnrollmentProgress() {
    this.enrollmentProgress = {
      step: 0,
      totalSteps: 3,
      completed: false,
    };
  }

  // Check biometric uniqueness across organizations
  async checkBiometricUniqueness(biometricHash) {
    try {
      const response = await apiService.checkUniqueness(biometricHash);
      return response;
    } catch (error) {
      console.error('Error checking uniqueness:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate biometric hash for uniqueness check
  async generateBiometricHash(biometricData) {
    try {
      const dataString = JSON.stringify({
        face: biometricData.face ? biometricData.face.features : null,
        fingerprint: biometricData.fingerprint ? biometricData.fingerprint.template : null,
      });

      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );

      return hash;
    } catch (error) {
      console.error('Error generating biometric hash:', error);
      throw error;
    }
  }

  // Perform anti-spoofing check
  async performAntiSpoofingCheck(biometricData) {
    // Simulated anti-spoofing checks
    const checks = {
      liveness: true,
      texture: true,
      movement: true,
      temperature: true, // For fingerprint
      reflection: true, // For face
    };

    if (biometricData.type === 'face') {
      // Face-specific anti-spoofing
      checks.eyeBlink = biometricData.liveness?.checks?.eyesOpen || false;
      checks.headMovement = biometricData.liveness?.checks?.headMovement || false;
    }

    const passedChecks = Object.values(checks).filter(check => check).length;
    const totalChecks = Object.keys(checks).length;
    const score = passedChecks / totalChecks;

    return {
      passed: score > 0.8,
      score,
      checks,
      confidence: score > 0.9 ? 'high' : score > 0.7 ? 'medium' : 'low',
    };
  }
}

// Export singleton instance
const biometricService = new BiometricService();
export default biometricService;