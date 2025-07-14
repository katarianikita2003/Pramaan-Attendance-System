// mobile/PramaanExpo/src/services/biometricService.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class BiometricService {
  constructor() {
    this.biometricDataDir = `${FileSystem.documentDirectory}biometric/`;
    this.initializeService();
  }

  async initializeService() {
    try {
      // Create biometric data directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.biometricDataDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.biometricDataDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing biometric service:', error);
    }
  }

  /**
   * Check if device supports biometric authentication
   */
  async checkBiometricSupport() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      return {
        hasHardware,
        supportedTypes,
        isEnrolled,
        hasFaceID: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
        hasFingerprint: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
        hasIris: supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS),
      };
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return {
        hasHardware: false,
        supportedTypes: [],
        isEnrolled: false,
        hasFaceID: false,
        hasFingerprint: false,
        hasIris: false,
      };
    }
  }

  /**
   * Authenticate with fingerprint/face ID
   */
  async authenticateWithFingerprint() {
    try {
      const biometricSupport = await this.checkBiometricSupport();
      
      if (!biometricSupport.hasHardware || !biometricSupport.isEnrolled) {
        return {
          success: false,
          error: 'Biometric authentication not available or not enrolled on this device',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to mark attendance',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        // Generate a hash based on the authentication
        const timestamp = Date.now().toString();
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `fingerprint_${timestamp}_${Math.random()}`
        );

        return {
          success: true,
          hash,
          timestamp,
          authenticationType: biometricSupport.hasFingerprint ? 'fingerprint' : 'faceId',
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('Fingerprint authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  }

  /**
   * Capture face image using camera
   */
  async captureFace() {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.error('Camera permission denied');
        return null;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          base64: asset.base64,
          width: asset.width,
          height: asset.height,
        };
      }

      return null;
    } catch (error) {
      console.error('Face capture error:', error);
      return null;
    }
  }

  /**
   * Generate attendance proof using biometric data
   */
  async generateAttendanceProof(scholarId, fingerprintAuth) {
    try {
      // Create proof data
      const proofData = {
        scholarId,
        timestamp: new Date().toISOString(),
        fingerprintHash: fingerprintAuth.hash,
        authenticationType: fingerprintAuth.authenticationType,
        nonce: Math.random().toString(36).substring(7),
      };

      // Generate proof hash
      const proofString = JSON.stringify(proofData);
      const proofHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        proofString
      );

      // Return just the proof hash as a string (what backend expects)
      return proofHash;
    } catch (error) {
      console.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  /**
   * Store biometric enrollment status
   */
  async saveBiometricEnrollment(scholarId, enrolled) {
    try {
      const key = `biometric_enrolled_${scholarId}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        enrolled,
        enrolledAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error saving enrollment status:', error);
    }
  }

  /**
   * Check if biometric is enrolled
   */
  async isBiometricEnrolled(scholarId) {
    try {
      const key = `biometric_enrolled_${scholarId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.enrolled;
      }
      return false;
    } catch (error) {
      console.error('Error checking enrollment status:', error);
      return false;
    }
  }

  /**
   * Store biometric data locally (encrypted)
   */
  async storeBiometricData(scholarId, data) {
    try {
      const key = `biometric_data_${scholarId}`;
      const encryptedData = await this.encryptData(JSON.stringify(data));
      await AsyncStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error('Error storing biometric data:', error);
    }
  }

  /**
   * Retrieve stored biometric data
   */
  async getBiometricData(scholarId) {
    try {
      const key = `biometric_data_${scholarId}`;
      const encryptedData = await AsyncStorage.getItem(key);
      if (encryptedData) {
        const decryptedData = await this.decryptData(encryptedData);
        return JSON.parse(decryptedData);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving biometric data:', error);
      return null;
    }
  }

  /**
   * Simple encryption for local storage (you should use a proper encryption library in production)
   */
  async encryptData(data) {
    // For demo purposes, using base64 encoding
    // In production, use proper encryption like react-native-crypto
    return Buffer.from(data).toString('base64');
  }

  /**
   * Simple decryption for local storage
   */
  async decryptData(encryptedData) {
    // For demo purposes, using base64 decoding
    // In production, use proper decryption
    return Buffer.from(encryptedData, 'base64').toString('utf-8');
  }

  /**
   * Clear all biometric data for a scholar
   */
  async clearBiometricData(scholarId) {
    try {
      const keys = [
        `biometric_enrolled_${scholarId}`,
        `biometric_data_${scholarId}`,
      ];
      await AsyncStorage.multiRemove(keys);
      console.log('Biometric data cleared for scholar:', scholarId);
    } catch (error) {
      console.error('Error clearing biometric data:', error);
    }
  }

  /**
   * Generate biometric commitment (for ZKP)
   */
  async generateBiometricCommitment(biometricData) {
    try {
      const dataString = JSON.stringify({
        type: biometricData?.type || 'fingerprint',
        timestamp: biometricData?.timestamp || Date.now(),
        nonce: Math.random().toString(36).substring(2),
      });

      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );

      return commitment;
    } catch (error) {
      console.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint (wrapper for authenticate)
   */
  async captureFingerprint() {
    return this.authenticateWithFingerprint();
  }

  /**
   * Check if biometric authentication is available on device
   */
  async checkBiometricAvailability() {
    return this.checkBiometricSupport();
  }
  async verifyBiometric(scholarId, newBiometricAuth) {
    try {
      const storedData = await this.getBiometricData(scholarId);
      if (!storedData) {
        return { success: false, error: 'No stored biometric data found' };
      }

      // In a real implementation, this would compare biometric templates
      // For now, we're just checking if authentication was successful
      if (newBiometricAuth.success) {
        return { success: true, verified: true };
      }

      return { success: false, error: 'Biometric verification failed' };
    } catch (error) {
      console.error('Error verifying biometric:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const biometricService = new BiometricService();

// Export the instance as default
export default biometricService;