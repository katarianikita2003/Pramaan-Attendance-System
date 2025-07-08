// src/services/zkp.service.ts
import * as Crypto from 'expo-crypto';
import api from './api';

interface BiometricData {
  type: 'face' | 'fingerprint';
  data: string;
  timestamp: number;
}

interface ZKPCommitment {
  commitment: string;
  nullifier: string;
  timestamp: number;
}

interface ZKPProof {
  proof: string;
  publicSignals: string[];
  commitment: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

class ZKPService {
  /**
   * Generate a cryptographic commitment from biometric data
   * This commitment will be stored instead of the actual biometric
   */
  async generateCommitment(biometricData: BiometricData): Promise<ZKPCommitment> {
    try {
      // Generate a unique salt for this commitment
      const salt = await Crypto.getRandomBytesAsync(32);
      const saltHex = Array.from(salt)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Create commitment: H(biometric_data || salt)
      const dataToHash = `${biometricData.type}:${biometricData.data}:${saltHex}`;
      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataToHash
      );

      // Generate nullifier to prevent double-spending
      const nullifierData = `${commitment}:${biometricData.timestamp}`;
      const nullifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nullifierData
      );

      return {
        commitment,
        nullifier,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error generating commitment:', error);
      throw new Error('Failed to generate ZKP commitment');
    }
  }

  /**
   * Generate a zero-knowledge proof for attendance
   * This proves the person has registered biometrics without revealing them
   */
  async generateAttendanceProof(
    biometricData: BiometricData,
    commitment: string,
    location?: { latitude: number; longitude: number }
  ): Promise<ZKPProof> {
    try {
      // In a real implementation, this would use a ZK-SNARK library
      // For now, we'll simulate the proof generation
      
      // Generate witness (private input)
      const witness = await this.generateWitness(biometricData, commitment);
      
      // Generate proof using the witness
      const proofData = await this.simulateProofGeneration(witness);
      
      // Create the proof object
      const proof: ZKPProof = {
        proof: proofData.proof,
        publicSignals: [
          commitment,
          Date.now().toString(),
          location ? `${location.latitude},${location.longitude}` : 'no-location'
        ],
        commitment,
        timestamp: Date.now(),
        location,
      };

      return proof;
    } catch (error) {
      console.error('Error generating proof:', error);
      throw new Error('Failed to generate attendance proof');
    }
  }

  /**
   * Verify a ZKP attendance proof
   */
  async verifyProof(proof: ZKPProof): Promise<boolean> {
    try {
      // Send proof to backend for verification
      const response = await api.post('/zkp/verify', {
        proof: proof.proof,
        publicSignals: proof.publicSignals,
        commitment: proof.commitment,
      });

      return response.data.valid;
    } catch (error) {
      console.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Check if biometric is already registered (privacy-preserving)
   */
  async checkBiometricUniqueness(biometricData: BiometricData): Promise<boolean> {
    try {
      // Generate a temporary commitment for checking
      const tempCommitment = await this.generateCommitment(biometricData);
      
      // Send to backend for privacy-preserving comparison
      const response = await api.post('/zkp/check-uniqueness', {
        commitment: tempCommitment.commitment,
        type: biometricData.type,
      });

      return response.data.isUnique;
    } catch (error) {
      console.error('Error checking biometric uniqueness:', error);
      throw new Error('Failed to verify biometric uniqueness');
    }
  }

  /**
   * Generate a verifiable credential for attendance
   */
  async generateVerifiableCredential(proof: ZKPProof): Promise<string> {
    try {
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'AttendanceCredential'],
        issuer: 'did:pramaan:org',
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          attendance: {
            timestamp: proof.timestamp,
            location: proof.location,
            proofHash: await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              proof.proof
            ),
          },
        },
        proof: {
          type: 'ZKPSignature2024',
          created: new Date().toISOString(),
          proofValue: proof.proof,
        },
      };

      return JSON.stringify(credential);
    } catch (error) {
      console.error('Error generating credential:', error);
      throw new Error('Failed to generate verifiable credential');
    }
  }

  // Private helper methods
  private async generateWitness(
    biometricData: BiometricData,
    commitment: string
  ): Promise<any> {
    // In a real implementation, this would generate the witness for the ZK circuit
    // For simulation, we'll create a mock witness
    return {
      biometricHash: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        biometricData.data
      ),
      commitment,
      timestamp: Date.now(),
    };
  }

  private async simulateProofGeneration(witness: any): Promise<{ proof: string }> {
    // In a real implementation, this would use snarkjs or similar
    // For simulation, we'll generate a mock proof
    const proofData = {
      pi_a: ['0x1234...', '0x5678...'],
      pi_b: [['0xabcd...', '0xef01...'], ['0x2345...', '0x6789...']],
      pi_c: ['0xbcde...', '0xf012...'],
      protocol: 'groth16',
    };

    return {
      proof: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(proofData)
      ),
    };
  }
}

export default new ZKPService();