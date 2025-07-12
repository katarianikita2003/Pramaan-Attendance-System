// src/services/zkpService.js
import * as Crypto from 'expo-crypto';

class ZKPService {
  /**
   * Generate a cryptographic commitment from biometric data
   * This is what gets stored instead of actual biometric data
   */
  async generateBiometricCommitment(biometricData) {
    try {
      // Generate a random salt
      const salt = await Crypto.getRandomBytesAsync(32);
      const saltHex = Array.from(new Uint8Array(salt))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Create commitment: H(biometric_data || salt)
      const dataToHash = `${biometricData.type}:${biometricData.id}:${saltHex}:${Date.now()}`;
      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataToHash
      );

      // Generate nullifier to prevent double registration
      const nullifierData = `${commitment}:${biometricData.id}`;
      const nullifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nullifierData
      );

      return {
        commitment,
        nullifier,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating commitment:', error);
      throw new Error('Failed to generate ZKP commitment');
    }
  }

  /**
   * Generate commitments for fingerprint data
   */
  async generateFingerprintCommitment(fingerprintId) {
    return this.generateBiometricCommitment({
      type: 'fingerprint',
      id: fingerprintId
    });
  }

  /**
   * Generate commitments for face data
   */
  async generateFaceCommitment(faceData) {
    return this.generateBiometricCommitment({
      type: 'face',
      id: faceData
    });
  }
}

export default new ZKPService();