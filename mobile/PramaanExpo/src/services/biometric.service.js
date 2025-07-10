// mobile/PramaanExpo/src/services/biometric.service.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define storage keys locally
const STORAGE_KEYS = {
  BIOMETRIC_ENROLLED: 'biometric_enrolled',
  USER_TOKEN: 'user_token',
  USER_DATA: 'user_data'
};

class BiometricService {
  // Check if biometric hardware is available
  async checkBiometricAvailability() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return { available: false, biometryType: [], error: 'No biometric hardware available' };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return { available: false, biometryType: [], error: 'No biometric data enrolled' };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return { available: true, biometryType: supportedTypes };
    } catch (error) {
      console.error('Biometric availability check error:', error);
      return { available: false, biometryType: [], error: error.message };
    }
  }

  // Authenticate using biometrics
  async authenticateWithBiometric(promptMessage) {
    try {
      const { available, error } = await this.checkBiometricAvailability();
      if (!available) {
        return { success: false, error: error || 'Biometric authentication not available' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true, data: result };
      } else {
        return { 
          success: false, 
          error: result.error || 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  // Request camera permissions
  async requestCameraPermissions() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to capture your face for biometric enrollment.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  }

  // Capture face photo using camera
  async captureFacePhoto() {
    try {
      // Request camera permissions
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) {
        return { success: false, error: 'Camera permission denied' };
      }

      // Launch camera with basic options
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          success: true,
          data: {
            uri: asset.uri,
            base64: asset.base64,
            width: asset.width,
            height: asset.height,
          },
        };
      } else {
        return { success: false, error: 'Face capture cancelled' };
      }
    } catch (error) {
      console.error('Face capture error:', error);
      return { success: false, error: error.message };
    }
  }

  // Alternative method using ImagePicker for profile photo
  async pickImageFromLibrary() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          success: true,
          data: {
            uri: asset.uri,
            base64: asset.base64,
            width: asset.width,
            height: asset.height,
          },
        };
      } else {
        return { success: false, error: 'Image selection cancelled' };
      }
    } catch (error) {
      console.error('Image picker error:', error);
      return { success: false, error: error.message };
    }
  }

  // Simulate fingerprint capture (actual fingerprint capture requires special hardware)
  async captureFingerprint() {
    try {
      // First check if fingerprint is available
      const { available, biometryType } = await this.checkBiometricAvailability();
      
      if (!available) {
        return { success: false, error: 'Biometric not available' };
      }

      // Check if fingerprint is supported
      const hasFingerprintSupport = biometryType.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      );

      if (!hasFingerprintSupport) {
        return { success: false, error: 'Fingerprint not supported on this device' };
      }

      // Authenticate using fingerprint
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan your fingerprint to enroll',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Generate mock fingerprint data (in production, this would be actual biometric data)
        const fingerprintData = {
          type: 'fingerprint',
          timestamp: Date.now(),
          deviceId: Platform.OS === 'ios' ? 'ios-device' : 'android-device',
          // In a real implementation, this would be the actual fingerprint template
          template: this.generateMockFingerprintTemplate(),
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

  // Generate mock fingerprint template (for demo purposes)
  generateMockFingerprintTemplate() {
    const template = [];
    for (let i = 0; i < 512; i++) {
      template.push(Math.floor(Math.random() * 256));
    }
    return template;
  }

  // Generate biometric commitment (mock implementation)
  async generateBiometricCommitment(biometricData) {
    try {
      // In a real implementation, this would use actual ZKP libraries
      const timestamp = Date.now();
      const dataString = JSON.stringify(biometricData);
      
      // Mock commitment generation
      const commitment = `COMM_${timestamp}_${this.hashString(dataString)}`;
      const nullifier = `NULL_${timestamp}_${this.hashString(commitment)}`;

      return { commitment, nullifier };
    } catch (error) {
      console.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  // Simple hash function (for demo purposes)
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Check if biometric is enrolled for current user
  async isBiometricEnrolled() {
    try {
      const enrolled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENROLLED);
      return enrolled === 'true';
    } catch (error) {
      console.error('Error checking biometric enrollment status:', error);
      return false;
    }
  }

  // Save biometric enrollment status
  async saveBiometricEnrollment(enrolled) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BIOMETRIC_ENROLLED, 
        enrolled ? 'true' : 'false'
      );
    } catch (error) {
      console.error('Error saving biometric enrollment status:', error);
    }
  }

  // Get biometric type string
  getBiometricTypeString(types) {
    const typeStrings = [];
    
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeStrings.push('Fingerprint');
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeStrings.push('Face ID');
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      typeStrings.push('Iris');
    }

    return typeStrings.join(', ') || 'Biometric';
  }

  // Check camera availability
  async checkCameraAvailability() {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Camera availability check error:', error);
      return false;
    }
  }

  // Verify biometric for attendance
  async verifyBiometricForAttendance(storedCommitment) {
    try {
      // First authenticate the user
      const authResult = await this.authenticateWithBiometric(
        'Authenticate to mark attendance'
      );

      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      // In a real implementation, this would:
      // 1. Capture current biometric
      // 2. Generate ZKP proof
      // 3. Verify against stored commitment
      // For now, we'll simulate this
      const mockProof = {
        proof: `PROOF_${Date.now()}_${this.hashString(storedCommitment)}`,
        publicSignals: [storedCommitment],
        timestamp: Date.now(),
      };

      return { 
        success: true, 
        proof: mockProof,
        message: 'Biometric verified successfully' 
      };
    } catch (error) {
      console.error('Biometric verification error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new BiometricService();