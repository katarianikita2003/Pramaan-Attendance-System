// mobile/PramaanExpo/src/services/biometric.service.ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Alert } from 'react-native';

interface BiometricResult {
  success: boolean;
  type: 'face' | 'fingerprint' | 'none';
  data?: string;
  error?: string;
}

interface FaceData {
  imageUri: string;
  features: any;
  hash: string;
}

class BiometricService {
  private isInitialized = false;
  private supportedBiometrics: LocalAuthentication.AuthenticationType[] = [];

  /**
   * Initialize biometric service and check capabilities
   */
  async initialize(): Promise<void> {
    try {
      // Check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          'Biometric Not Supported',
          'This device does not support biometric authentication.'
        );
        return;
      }

      // Check enrolled biometrics
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          'Please enroll biometrics in your device settings.'
        );
        return;
      }

      // Get supported biometric types
      this.supportedBiometrics = await LocalAuthentication.supportedAuthenticationTypesAsync();
      this.isInitialized = true;
    } catch (error) {
      console.error('Biometric initialization error:', error);
      throw error;
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(reason: string = 'Authenticate to continue'): Promise<BiometricResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Determine biometric type used
        const biometricType = this.getBiometricType();
        
        // Generate biometric hash (simulated)
        const biometricData = await this.generateBiometricHash(biometricType);

        return {
          success: true,
          type: biometricType,
          data: biometricData,
        };
      } else {
        return {
          success: false,
          type: 'none',
          error: result.error,
        };
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      return {
        success: false,
        type: 'none',
        error: error.message,
      };
    }
  }

  /**
   * Capture face data for registration using ImagePicker
   */
  async captureFaceData(): Promise<FaceData | null> {
    try {
      // Request camera permissions using ImagePicker
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required for face capture.');
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

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const image = result.assets[0];
      
      // Extract face features (simulated)
      const faceFeatures = await this.extractFaceFeatures(image.uri);
      
      // Generate hash of face data
      const faceDataString = JSON.stringify(faceFeatures);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        faceDataString
      );

      return {
        imageUri: image.uri,
        features: faceFeatures,
        hash,
      };
    } catch (error) {
      console.error('Face capture error:', error);
      return null;
    }
  }

  /**
   * Extract face features from image (simulated)
   */
  private async extractFaceFeatures(imageUri: string): Promise<any> {
    // In a real app, this would use face detection ML
    // For now, return simulated features
    return {
      faceId: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        imageUri + Date.now()
      ),
      landmarks: {
        leftEye: { x: 0.3, y: 0.4 },
        rightEye: { x: 0.7, y: 0.4 },
        nose: { x: 0.5, y: 0.5 },
        mouth: { x: 0.5, y: 0.7 }
      },
      confidence: 0.95
    };
  }

  /**
   * Generate biometric hash (simulated)
   */
  private async generateBiometricHash(type: string): Promise<string> {
    const data = `${type}_${Date.now()}_${Math.random()}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  /**
   * Get biometric type
   */
  private getBiometricType(): 'face' | 'fingerprint' | 'none' {
    if (this.supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    }
    if (this.supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    return 'none';
  }

  /**
   * Capture fingerprint data for registration
   */
  async captureFingerprintData(): Promise<string | null> {
    try {
      const result = await this.authenticate('Scan your fingerprint for registration');
      
      if (result.success && result.type === 'fingerprint') {
        return result.data || null;
      }
      
      return null;
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      return null;
    }
  }
}

export default new BiometricService();