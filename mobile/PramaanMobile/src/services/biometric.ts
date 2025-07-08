import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

interface BiometricResult {
  success: boolean;
  error?: string;
  signature?: string;
  publicKey?: string;
}

class BiometricService {
  private isInitialized = false;
  private biometryType: string | null = null;

  async initialize(): Promise<void> {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      if (available) {
        this.biometryType = biometryType;
        this.isInitialized = true;
      } else {
        throw new Error('Biometric sensor not available');
      }
    } catch (error) {
      console.error('Biometric initialization error:', error);
      throw error;
    }
  }

  async checkBiometricAvailability(): Promise<{
    available: boolean;
    biometryType: string | null;
    error?: string;
  }> {
    try {
      const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();
      
      return {
        available,
        biometryType: biometryType || null,
        error
      };
    } catch (error: any) {
      return {
        available: false,
        biometryType: null,
        error: error.message
      };
    }
  }

  async enrollBiometric(userId: string): Promise<BiometricResult> {
    try {
      // Check if biometric is available
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      // Check if keys exist
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      
      if (keysExist) {
        // Delete existing keys
        await rnBiometrics.deleteKeys();
      }

      // Create new keys
      const { publicKey } = await rnBiometrics.createKeys();
      
      if (!publicKey) {
        throw new Error('Failed to create biometric keys');
      }

      // Store public key
      await AsyncStorage.setItem(`biometric_key_${userId}`, publicKey);
      
      // Create signature for enrollment
      const { success, signature, error } = await rnBiometrics.createSignature({
        promptMessage: 'Confirm biometric enrollment',
        payload: `enroll_${userId}_${Date.now()}`
      });

      if (!success || !signature) {
        throw new Error(error || 'Failed to create enrollment signature');
      }

      return {
        success: true,
        signature,
        publicKey
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async authenticateBiometric(userId: string, message?: string): Promise<BiometricResult> {
    try {
      // Check if biometric is available
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      // Check if keys exist
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      if (!keysExist) {
        throw new Error('Biometric not enrolled. Please enroll first.');
      }

      // Create signature
      const payload = `auth_${userId}_${Date.now()}`;
      const { success, signature, error } = await rnBiometrics.createSignature({
        promptMessage: message || 'Authenticate with biometric',
        payload
      });

      if (!success || !signature) {
        throw new Error(error || 'Authentication failed');
      }

      // Get stored public key
      const publicKey = await AsyncStorage.getItem(`biometric_key_${userId}`);

      return {
        success: true,
        signature,
        publicKey: publicKey || undefined
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateBiometricHash(biometricData: string): Promise<string> {
    // Generate a hash of the biometric data for privacy
    return CryptoJS.SHA256(biometricData).toString();
  }

  async verifyBiometricSignature(
    signature: string,
    payload: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would verify the signature
      // using the public key. For now, we'll simulate it.
      return true;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  getBiometryTypeString(): string {
    switch (this.biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint';
      default:
        return 'Biometric';
    }
  }

  async deleteBiometricData(userId: string): Promise<void> {
    try {
      await rnBiometrics.deleteKeys();
      await AsyncStorage.removeItem(`biometric_key_${userId}`);
    } catch (error) {
      console.error('Error deleting biometric data:', error);
    }
  }
}

export default new BiometricService();