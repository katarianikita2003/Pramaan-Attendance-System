// src/services/biometric.service.ts
import * as LocalAuthentication from 'expo-local-authentication';
import * as Camera from 'expo-camera';
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
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        type: 'none',
        error: error.message,
      };
    }
  }

  /**
   * Capture face data for registration
   */
  async captureFaceData(): Promise<FaceData | null> {
    try {
      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required for face capture.');
        return null;
      }

      // In a real app, this would open camera and capture face
      // For simulation, we'll generate mock data
      const mockImageUri = `${FileSystem.documentDirectory}face_${Date.now()}.jpg`;
      
      // Extract face features (in real app, use face detection ML)
      const faceFeatures = await this.extractFaceFeatures(mockImageUri);
      
      // Generate hash of face data
      const faceDataString = JSON.stringify(faceFeatures);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        faceDataString
      );

      return {
        imageUri: mockImageUri,
        features: faceFeatures,
        hash,
      };
    } catch (error) {
      console.error('Face capture error:', error);
      return null;
    }
  }

  /**
   * Capture fingerprint data for registration
   */
  async captureFingerprintData(): Promise<string | null> {
    try {
      const result = await this.authenticate('Scan your fingerprint for registration');
      
      if (result.success && result.type === 'fingerprint') {
        // In a real app, this would capture actual fingerprint template
        // For simulation, we generate a unique hash
        const fingerprintData = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `fingerprint_${Date.now()}_${Math.random()}`
        );
        
        return fingerprintData;
      }
      
      return null;
    } catch (error) {
      console.error('Fingerprint capture error:', error);
      return null;
    }
  }

  /**
   * Verify liveness (anti-spoofing)
   */
  async verifyLiveness(imageUri: string): Promise<boolean> {
    try {
      // In a real app, this would use ML models for liveness detection
      // Check for:
      // - Eye blink detection
      // - Head movement
      // - Facial expression changes
      // - 3D depth analysis
      
      // For simulation, we'll return true
      return true;
    } catch (error) {
      console.error('Liveness verification error:', error);
      return false;
    }
  }

  /**
   * Compare biometric data for verification
   */
  async compareBiometrics(
    capturedData: string,
    storedCommitment: string,
    type: 'face' | 'fingerprint'
  ): Promise<boolean> {
    try {
      // In a real app, this would perform secure biometric matching
      // Using techniques like:
      // - Homomorphic encryption
      // - Secure multiparty computation
      // - Fuzzy extractors
      
      // For simulation, we'll use basic comparison
      const capturedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        capturedData
      );
      
      // This would be done securely without revealing the actual biometric
      return true; // Simulated match
    } catch (error) {
      console.error('Biometric comparison error:', error);
      return false;
    }
  }

  // Private helper methods
  private getBiometricType(): 'face' | 'fingerprint' {
    if (this.supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'face';
    } else if (this.supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    return 'fingerprint'; // Default
  }

  private async generateBiometricHash(type: 'face' | 'fingerprint'): Promise<string> {
    // In a real app, this would generate hash from actual biometric data
    const data = `${type}_${Date.now()}_${Math.random()}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  private async extractFaceFeatures(imageUri: string): Promise<any> {
    // In a real app, this would use face recognition ML models
    // to extract facial features like:
    // - Face landmarks (eyes, nose, mouth positions)
    // - Face embeddings (128-512 dimensional vector)
    // - Facial geometry measurements
    
    return {
      landmarks: {
        leftEye: { x: 0.3, y: 0.4 },
        rightEye: { x: 0.7, y: 0.4 },
        nose: { x: 0.5, y: 0.5 },
        mouth: { x: 0.5, y: 0.7 },
      },
      embedding: Array(128).fill(0).map(() => Math.random()),
      geometry: {
        faceWidth: 0.4,
        faceHeight: 0.6,
        eyeDistance: 0.4,
      },
    };
  }
}

export default new BiometricService();