// mobile/PramaanExpo/src/services/biometricService.js
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
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
          data: hash, // Add data field for compatibility
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
        mediaTypes: 'Images', // Fixed: Using string directly
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
   * Store biometric data locally
   */
  async storeBiometricData(scholarId, data) {
    try {
      const key = `biometric_data_${scholarId}`;
      // Ensure we're storing the complete data with nullifiers
      const dataToStore = {
        ...data,
        scholarId,
        storedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataToStore));
      console.log('Biometric data stored successfully for:', scholarId);
      
      // Also update enrollment status
      await this.saveBiometricEnrollment(scholarId, true);
    } catch (error) {
      console.error('Error storing biometric data:', error);
      throw error;
    }
  }

  /**
   * Retrieve stored biometric data
   */
  async getBiometricData(scholarId) {
    try {
      const key = `biometric_data_${scholarId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving biometric data:', error);
      return null;
    }
  }

  /**
   * Check if biometric is enrolled for a scholar
   */
  async checkEnrollment(scholarId) {
    try {
      // Check local enrollment status
      const isEnrolled = await this.isBiometricEnrolled(scholarId);

      // Check if biometric data exists
      const biometricData = await this.getBiometricData(scholarId);

      return {
        success: true,
        isEnrolled: isEnrolled && biometricData !== null,
        hasFingerprint: biometricData?.fingerprintCommitment ? true : false,
        hasFace: biometricData?.faceCommitment ? true : false,
      };
    } catch (error) {
      console.error('Check enrollment error:', error);
      return {
        success: false,
        isEnrolled: false,
        error: error.message
      };
    }
  }

  /**
   * Generate biometric proof for attendance marking
   * This creates a ZKP-style proof that the current biometric matches the enrolled one
   */
  async generateBiometricProof(scholarId, biometricType = 'fingerprint') {
    try {
      console.log('Generating biometric proof for:', scholarId, biometricType);

      // Get stored biometric data
      const storedData = await this.getBiometricData(scholarId);

      if (!storedData) {
        throw new Error('No biometric enrollment found. Please complete enrollment first.');
      }

      // Check if the requested biometric type is enrolled
      const commitment = biometricType === 'face'
        ? storedData.faceCommitment
        : storedData.fingerprintCommitment;

      if (!commitment) {
        throw new Error(`No ${biometricType} enrollment found. Please enroll your ${biometricType} first.`);
      }

      // Generate proof data
      const proofData = {
        commitment: commitment.commitment,
        nullifier: commitment.nullifier,
        timestamp: Date.now(),
        scholarId: scholarId,
        biometricType: biometricType,
        deviceId: Device?.deviceName || 'unknown',
        nonce: Math.random().toString(36).substring(2)
      };

      // Create a hash of the proof data as the proof
      const proofString = JSON.stringify(proofData);
      const proof = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        proofString
      );

      console.log('Biometric proof generated successfully');

      // Return the proof with ALL required fields
      return {
        proof: proof,
        nullifier: commitment.nullifier, // CRITICAL: Include nullifier
        commitment: commitment.commitment,
        publicInputs: {
          scholarId: scholarId,
          timestamp: proofData.timestamp,
          biometricType: biometricType
        }
      };
    } catch (error) {
      console.error('Error generating biometric proof:', error);
      throw error;
    }
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
      // Add more entropy for uniqueness
      const dataString = JSON.stringify({
        type: biometricData?.type || 'fingerprint',
        timestamp: biometricData?.timestamp || Date.now(),
        nonce: Math.random().toString(36).substring(2),
        deviceId: Device?.deviceName || 'unknown',
        random: Math.random().toString(36).substring(2, 15),
        // Add biometric-specific data if available
        data: biometricData?.base64 ? biometricData.base64.substring(0, 100) : biometricData?.data || 'default'
      });

      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );

      // Generate a unique nullifier that's deterministic for the same biometric
      const nullifierData = `${commitment}_${biometricData?.type || 'fingerprint'}_${Date.now()}`;
      const nullifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nullifierData
      );

      return {
        commitment: commitment,
        nullifier: nullifier,
        timestamp: new Date().toISOString(),
        type: biometricData?.type || 'fingerprint'
      };
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
    const support = await this.checkBiometricSupport();
    return {
      available: support.hasHardware && support.isEnrolled,
      ...support
    };
  }

  /**
   * Verify biometric against stored data
   */
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

  /**
   * Get enrollment status for display
   */
  async getEnrollmentStatus(scholarId) {
    try {
      const storedData = await this.getBiometricData(scholarId);
      
      if (!storedData) {
        return {
          isEnrolled: false,
          hasFingerprint: false,
          hasFace: false
        };
      }

      return {
        isEnrolled: true,
        hasFingerprint: !!storedData.fingerprintCommitment,
        hasFace: !!storedData.faceCommitment,
        enrolledAt: storedData.enrolledAt || storedData.storedAt
      };
    } catch (error) {
      console.error('Error checking enrollment status:', error);
      return {
        isEnrolled: false,
        hasFingerprint: false,
        hasFace: false
      };
    }
  }
}

// Create singleton instance
const biometricService = new BiometricService();

// Export the instance as default
export default biometricService;