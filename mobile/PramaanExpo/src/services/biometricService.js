// mobile/PramaanExpo/src/services/biometricService.js
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

class BiometricService {
  async checkBiometricSupport() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return { 
          supported: false, 
          error: 'Device does not support biometric authentication' 
        };
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return { 
          supported: false, 
          error: 'No biometric data enrolled on this device' 
        };
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return {
        supported: true,
        types: types,
        hasFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
        hasFaceRecognition: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      };
    } catch (error) {
      console.error('Biometric support check error:', error);
      return { supported: false, error: error.message };
    }
  }

  async captureFingerprint() {
    try {
      // First check if biometrics are supported
      const support = await this.checkBiometricSupport();
      if (!support.supported) {
        Alert.alert('Error', support.error);
        return { success: false, error: support.error };
      }

      // Authenticate using biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan your fingerprint for enrollment',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Generate a unique fingerprint ID
        const fingerprintId = `FP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // In a real app, you would capture actual biometric template here
        // For now, we'll simulate it with the fingerprint ID
        return {
          success: true,
          data: {
            id: fingerprintId,
            timestamp: new Date().toISOString(),
            type: 'fingerprint',
            // In production, this would be the actual biometric template
            template: this.generateMockBiometricTemplate(),
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication cancelled',
        };
      }
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      return {
        success: false,
        error: error.message || 'Failed to capture fingerprint',
      };
    }
  }

  async authenticateWithBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to mark attendance',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: true,
      });

      return result;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  generateMockBiometricTemplate() {
    // In production, this would be replaced with actual biometric template generation
    // This is just a mock for demonstration
    const template = {
      type: 'fingerprint',
      version: '1.0',
      data: Array.from({ length: 512 }, () => Math.floor(Math.random() * 256)),
      hash: this.generateHash(),
    };
    return JSON.stringify(template);
  }

  generateHash() {
    return 'xxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
      return (Math.random() * 16 | 0).toString(16);
    });
  }
}

export default new BiometricService();