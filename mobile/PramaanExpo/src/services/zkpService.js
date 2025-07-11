// src/services/zkpService.js - Zero-Knowledge Proof Implementation
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { zkpService as apiService } from './api';

const ZKP_STORAGE_KEYS = {
  COMMITMENT: 'zkp_commitment',
  PRIVATE_KEY: 'zkp_private_key',
  PUBLIC_KEY: 'zkp_public_key',
  CIRCUIT_PARAMS: 'zkp_circuit_params',
  PROOF_HISTORY: 'zkp_proof_history',
};

class ZKPService {
  constructor() {
    this.circuitParams = null;
    this.isInitialized = false;
  }

  // Initialize ZKP service
  async initialize() {
    try {
      // Load circuit parameters (in real implementation, these would be downloaded)
      await this.loadCircuitParameters();
      
      // Generate or load key pair
      await this.generateKeyPair();
      
      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      console.error('ZKP initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Load circuit parameters for ZKP
  async loadCircuitParameters() {
    try {
      // Check if parameters are cached locally
      const cachedParams = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.CIRCUIT_PARAMS);
      
      if (cachedParams) {
        this.circuitParams = JSON.parse(cachedParams);
        return this.circuitParams;
      }

      // In real implementation, download from backend
      // For demo, we'll use simulated parameters
      const simulatedParams = {
        circuitId: 'biometric_attendance_v1',
        version: '1.0.0',
        curveType: 'bn128',
        provingKey: this.generateSimulatedProvingKey(),
        verifyingKey: this.generateSimulatedVerifyingKey(),
        constraints: 1000000, // Number of constraints in the circuit
        publicInputs: 3, // commitment, timestamp, location_hash
        privateInputs: 2, // biometric_data, randomness
      };

      // Cache parameters
      await AsyncStorage.setItem(
        ZKP_STORAGE_KEYS.CIRCUIT_PARAMS, 
        JSON.stringify(simulatedParams)
      );

      this.circuitParams = simulatedParams;
      return simulatedParams;
    } catch (error) {
      console.error('Error loading circuit parameters:', error);
      throw error;
    }
  }

  // Generate simulated proving key (in real implementation, this would be downloaded)
  generateSimulatedProvingKey() {
    return {
      alpha: this.generateRandomPoint(),
      beta: this.generateRandomPoint(),
      gamma: this.generateRandomPoint(),
      delta: this.generateRandomPoint(),
      ic: Array.from({ length: 4 }, () => this.generateRandomPoint()),
    };
  }

  // Generate simulated verifying key
  generateSimulatedVerifyingKey() {
    return {
      alpha: this.generateRandomPoint(),
      beta: this.generateRandomPoint(),
      gamma: this.generateRandomPoint(),
      delta: this.generateRandomPoint(),
      ic: Array.from({ length: 4 }, () => this.generateRandomPoint()),
    };
  }

  // Generate random point for simulation
  generateRandomPoint() {
    return {
      x: Math.random().toString(36).substring(2),
      y: Math.random().toString(36).substring(2),
    };
  }

  // Generate key pair for ZKP
  async generateKeyPair() {
    try {
      // Check if keys already exist
      const existingPrivateKey = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.PRIVATE_KEY);
      const existingPublicKey = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.PUBLIC_KEY);

      if (existingPrivateKey && existingPublicKey) {
        return {
          privateKey: existingPrivateKey,
          publicKey: existingPublicKey,
        };
      }

      // Generate new key pair
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const privateKey = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Derive public key (simulated)
      const publicKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        privateKey
      );

      // Store keys
      await AsyncStorage.setItem(ZKP_STORAGE_KEYS.PRIVATE_KEY, privateKey);
      await AsyncStorage.setItem(ZKP_STORAGE_KEYS.PUBLIC_KEY, publicKey);

      return { privateKey, publicKey };
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw error;
    }
  }

  // Generate biometric commitment
  async generateBiometricCommitment(biometricData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Generate randomness for commitment
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const randomness = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Create commitment: H(biometric_data || randomness)
      const commitmentInput = JSON.stringify({
        biometricData: this.hashBiometricData(biometricData),
        randomness,
        timestamp: Date.now(),
      });

      const commitment = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        commitmentInput
      );

      // Generate nullifier to prevent double-spending
      const nullifierInput = `${commitment}:${randomness}:${Date.now()}`;
      const nullifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nullifierInput
      );

      const commitmentData = {
        commitment,
        nullifier,
        randomness,
        timestamp: Date.now(),
        biometricHash: this.hashBiometricData(biometricData),
      };

      // Store commitment locally
      await AsyncStorage.setItem(
        ZKP_STORAGE_KEYS.COMMITMENT,
        JSON.stringify(commitmentData)
      );

      // Send commitment to backend
      const response = await apiService.generateCommitment({
        commitment,
        nullifier,
        timestamp: commitmentData.timestamp,
      });

      if (response.success) {
        return {
          success: true,
          commitment,
          nullifier,
          commitmentId: response.data.commitmentId,
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  // Hash biometric data consistently
  hashBiometricData(biometricData) {
    // Create consistent hash regardless of data order
    const normalizedData = {
      face: biometricData.face ? this.normalizeArray(biometricData.face.features || []) : null,
      fingerprint: biometricData.fingerprint ? this.normalizeArray(biometricData.fingerprint.template || []) : null,
    };

    return JSON.stringify(normalizedData);
  }

  // Normalize array to ensure consistent hashing
  normalizeArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(val => typeof val === 'number' ? parseFloat(val.toFixed(6)) : val);
  }

  // Generate attendance proof using ZKP
  async generateAttendanceProof(attendanceData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get stored commitment
      const storedCommitment = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.COMMITMENT);
      if (!storedCommitment) {
        throw new Error('No biometric commitment found. Please complete enrollment first.');
      }

      const commitmentData = JSON.parse(storedCommitment);

      // Prepare public inputs
      const publicInputs = [
        commitmentData.commitment,
        attendanceData.timestamp.toString(),
        attendanceData.locationHash || '0',
      ];

      // Prepare private inputs (witness)
      const witness = {
        biometricHash: commitmentData.biometricHash,
        randomness: commitmentData.randomness,
        currentBiometric: this.hashBiometricData(attendanceData.biometricData),
        location: attendanceData.location,
      };

      // Generate proof (simulated)
      const proof = await this.generateProof(witness, publicInputs);

      // Create proof object
      const attendanceProof = {
        proof: proof.proof,
        publicSignals: publicInputs,
        timestamp: attendanceData.timestamp,
        proofId: await this.generateProofId(),
        metadata: {
          authMethod: attendanceData.authMethod,
          location: attendanceData.location,
          quality: attendanceData.quality,
        },
      };

      // Store proof in history
      await this.storeProofInHistory(attendanceProof);

      // Send proof to backend for verification
      const response = await apiService.generateProof({
        ...attendanceProof,
        commitmentId: commitmentData.commitmentId,
      });

      if (response.success) {
        return {
          success: true,
          proof: attendanceProof,
          verified: response.data.verified,
          attestationId: response.data.attestationId,
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  // Generate ZKP proof (simulated implementation)
  async generateProof(witness, publicInputs) {
    try {
      // In real implementation, this would use a ZK-SNARK library like circomlib
      // For demo, we'll simulate the proof generation process

      // Simulate proof generation time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create witness hash
      const witnessHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(witness)
      );

      // Create public inputs hash
      const publicHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(publicInputs)
      );

      // Simulate proof components
      const proof = {
        a: [this.generateRandomFieldElement(), this.generateRandomFieldElement()],
        b: [
          [this.generateRandomFieldElement(), this.generateRandomFieldElement()],
          [this.generateRandomFieldElement(), this.generateRandomFieldElement()],
        ],
        c: [this.generateRandomFieldElement(), this.generateRandomFieldElement()],
        protocol: 'groth16',
        curve: 'bn128',
      };

      // Combine with witness and public inputs for verification
      const proofString = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${witnessHash}:${publicHash}:${JSON.stringify(proof)}`
      );

      return {
        proof: proofString,
        components: proof,
        witnessHash,
        publicHash,
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error;
    }
  }

  // Generate random field element for simulation
  generateRandomFieldElement() {
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    return randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify ZKP proof
  async verifyProof(proofData) {
    try {
      // Send to backend for verification
      const response = await apiService.verifyProof(proofData);
      
      if (response.success) {
        return {
          success: true,
          valid: response.data.valid,
          attendanceData: response.data.attendanceData,
          verificationTime: response.data.verificationTime,
        };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      return {
        success: false,
        error: error.message,
        valid: false,
      };
    }
  }

  // Generate unique proof ID
  async generateProofId() {
    const timestamp = Date.now();
    const randomBytes = await Crypto.getRandomBytesAsync(8);
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `PROOF_${timestamp}_${randomHex}`;
  }

  // Store proof in local history
  async storeProofInHistory(proof) {
    try {
      const existingHistory = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.PROOF_HISTORY);
      const history = existingHistory ? JSON.parse(existingHistory) : [];
      
      history.unshift({
        ...proof,
        createdAt: Date.now(),
      });

      // Keep only last 100 proofs
      if (history.length > 100) {
        history.splice(100);
      }

      await AsyncStorage.setItem(ZKP_STORAGE_KEYS.PROOF_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error storing proof in history:', error);
    }
  }

  // Get proof history
  async getProofHistory() {
    try {
      const history = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.PROOF_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error getting proof history:', error);
      return [];
    }
  }

  // Clear proof history
  async clearProofHistory() {
    try {
      await AsyncStorage.removeItem(ZKP_STORAGE_KEYS.PROOF_HISTORY);
    } catch (error) {
      console.error('Error clearing proof history:', error);
    }
  }

  // Export proof for sharing
  async exportProof(proofId) {
    try {
      const history = await this.getProofHistory();
      const proof = history.find(p => p.proofId === proofId);
      
      if (!proof) {
        throw new Error('Proof not found');
      }

      // Create exportable proof data
      const exportData = {
        proofId: proof.proofId,
        proof: proof.proof,
        publicSignals: proof.publicSignals,
        timestamp: proof.timestamp,
        metadata: proof.metadata,
        version: this.circuitParams?.version || '1.0.0',
        circuit: this.circuitParams?.circuitId || 'biometric_attendance_v1',
      };

      // Generate QR code data
      const qrData = JSON.stringify(exportData);
      
      return {
        success: true,
        qrData,
        exportData,
        downloadUrl: await this.generateDownloadUrl(exportData),
      };
    } catch (error) {
      console.error('Error exporting proof:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate download URL for proof
  async generateDownloadUrl(proofData) {
    try {
      // In real implementation, this would upload to a secure storage service
      // For demo, we'll create a data URL
      const dataString = JSON.stringify(proofData, null, 2);
      const base64Data = btoa(dataString);
      return `data:application/json;base64,${base64Data}`;
    } catch (error) {
      console.error('Error generating download URL:', error);
      return null;
    }
  }

  // Get stored commitment
  async getStoredCommitment() {
    try {
      const stored = await AsyncStorage.getItem(ZKP_STORAGE_KEYS.COMMITMENT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting stored commitment:', error);
      return null;
    }
  }

  // Update commitment
  async updateCommitment(newBiometricData) {
    try {
      // Generate new commitment
      const result = await this.generateBiometricCommitment(newBiometricData);
      
      if (result.success) {
        return {
          success: true,
          commitment: result.commitment,
          nullifier: result.nullifier,
        };
      } else {
        throw new Error('Failed to update commitment');
      }
    } catch (error) {
      console.error('Error updating commitment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Clear all ZKP data
  async clearZKPData() {
    try {
      await AsyncStorage.removeItem(ZKP_STORAGE_KEYS.COMMITMENT);
      await AsyncStorage.removeItem(ZKP_STORAGE_KEYS.PRIVATE_KEY);
      await AsyncStorage.removeItem(ZKP_STORAGE_KEYS.PUBLIC_KEY);
      await AsyncStorage.removeItem(ZKP_STORAGE_KEYS.PROOF_HISTORY);
      // Keep circuit params for reuse
    } catch (error) {
      console.error('Error clearing ZKP data:', error);
    }
  }

  // Get ZKP statistics
  async getZKPStats() {
    try {
      const history = await this.getProofHistory();
      const commitment = await this.getStoredCommitment();
      
      return {
        totalProofs: history.length,
        lastProofTime: history.length > 0 ? history[0].timestamp : null,
        commitmentTimestamp: commitment?.timestamp || null,
        isEnrolled: commitment !== null,
        circuitVersion: this.circuitParams?.version || 'unknown',
      };
    } catch (error) {
      console.error('Error getting ZKP stats:', error);
      return {
        totalProofs: 0,
        lastProofTime: null,
        commitmentTimestamp: null,
        isEnrolled: false,
        circuitVersion: 'unknown',
      };
    }
  }
}

// Export singleton instance
const zkpService = new ZKPService();
export default zkpService;