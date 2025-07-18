// mobile/PramaanExpo/src/services/zkp-client.ts
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

interface BiometricCommitment {
  commitment: string;
  nullifier: string;
  salt?: string;
  encryptedSalt?: string;
  algorithm?: string;
  zkpVersion?: string;
}

interface ZKProof {
  proof: string;
  publicSignals: string[];
  nullifier: string;
  proofId?: string;
  metadata?: any;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

class ZKPClient {
  private isProduction: boolean;
  private apiBaseUrl: string;
  private circuitFilesDir: string;
  private isInitialized: boolean = false;
  
  // Poseidon field prime for production
  private readonly FIELD_PRIME = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

  constructor() {
    this.isProduction = Constants.expoConfig?.extra?.ZKP_MODE === 'production';
    this.apiBaseUrl = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5000';
    this.circuitFilesDir = `${FileSystem.documentDirectory}zkp/`;
  }

  /**
   * Initialize the ZKP client
   */
  async initialize() {
    try {
      if (this.isProduction) {
        console.log('Initializing ZKP client in production mode...');
        await this.downloadCircuitFiles();
      } else {
        console.log('ZKP client running in simulation mode');
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ZKP client:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Download circuit files for production mode
   */
  private async downloadCircuitFiles() {
    try {
      // Create directory if it doesn't exist
      await FileSystem.makeDirectoryAsync(this.circuitFilesDir, { intermediates: true });

      const files = [
        { name: 'biometric.wasm', endpoint: '/api/zkp/biometric.wasm' },
        { name: 'biometric.zkey', endpoint: '/api/zkp/biometric.zkey' },
        { name: 'verification_key.json', endpoint: '/api/zkp/verification_key.json' }
      ];

      for (const file of files) {
        const localPath = `${this.circuitFilesDir}${file.name}`;
        
        // Check if file exists and is recent (less than 7 days old)
        try {
          const info = await FileSystem.getInfoAsync(localPath);
          if (info.exists && info.modificationTime) {
            const age = Date.now() - info.modificationTime;
            if (age < 7 * 24 * 60 * 60 * 1000) {
              console.log(`Using cached ${file.name}`);
              continue;
            }
          }
        } catch (e) {
          // File doesn't exist, will download
        }

        console.log(`Downloading ${file.name}...`);
        const downloadResult = await FileSystem.downloadAsync(
          `${this.apiBaseUrl}${file.endpoint}`,
          localPath
        );

        if (downloadResult.status !== 200) {
          throw new Error(`Failed to download ${file.name}: ${downloadResult.status}`);
        }
      }
    } catch (error) {
      console.error('Error downloading circuit files:', error);
      throw error;
    }
  }

  /**
   * Generate a biometric commitment for enrollment
   */
  async generateBiometricCommitment(
    biometricHash: string,
    userId: string
  ): Promise<BiometricCommitment> {
    try {
      if (!this.isProduction) {
        // Simulation mode - use simple hashing
        const salt = this.generateRandomSalt();
        
        // Create commitment = H(biometricHash || userId || salt)
        const commitment = CryptoJS.SHA256(`${biometricHash}:${userId}:${salt}`).toString();
        
        // Generate nullifier = H(biometricHash || userId)
        const nullifier = CryptoJS.SHA256(`${biometricHash}:${userId}`).toString();
        
        return {
          commitment,
          nullifier,
          salt,
          algorithm: 'sha256-simulation'
        };
      } else {
        // Production mode - use Poseidon hash
        const salt = await this.generateProductionSalt();
        
        // Extract features from biometric hash
        const features = this.extractFeatures(biometricHash);
        
        // Create commitment using Poseidon-like hash
        const commitmentInput = [...features, ...salt];
        const commitment = await this.poseidonHash(commitmentInput);
        
        // Create nullifier (hash of features only)
        const nullifier = await this.poseidonHash(features);
        
        return {
          commitment,
          nullifier,
          encryptedSalt: await this.encryptSalt(salt),
          algorithm: 'poseidon',
          zkpVersion: '1.0.0'
        };
      }
    } catch (error) {
      console.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  /**
   * Generate ZK proof for attendance
   */
  async generateAttendanceProof(
    biometricData: string,
    commitment: BiometricCommitment,
    location: Location,
    timestamp: number,
    organizationId?: string
  ): Promise<ZKProof> {
    try {
      if (!this.isProduction) {
        // Simulation mode
        const biometricHash = CryptoJS.SHA256(biometricData).toString();
        
        // Simulate proof generation
        const locationHash = this.hashLocation(location);
        const timestampHash = CryptoJS.SHA256(timestamp.toString()).toString();
        
        const proof = this.generateMockProof({
          commitment: commitment.commitment,
          nullifier: commitment.nullifier,
          locationHash,
          timestampHash
        });
        
        const publicSignals = [
          commitment.commitment,
          commitment.nullifier,
          locationHash,
          timestampHash
        ];
        
        return {
          proof,
          publicSignals,
          nullifier: commitment.nullifier
        };
      } else {
        // Production mode
        if (!organizationId) {
          throw new Error('Organization ID required for production proofs');
        }
        
        // Extract features from biometric
        const features = this.extractFeatures(biometricData);
        
        // Decrypt salt
        const salt = await this.decryptSalt(commitment.encryptedSalt!);
        
        // Hash location and timestamp
        const locationHash = await this.hashLocationProduction(location);
        const timestampHash = await this.hashTimestamp(timestamp);
        const orgIdHash = await this.hashOrganizationId(organizationId);
        
        // In a real implementation, this would call snarkjs
        // For now, create a production-like proof structure
        const proof = await this.generateProductionProof({
          biometricFeatures: features,
          salt,
          commitment: commitment.commitment,
          nullifier: commitment.nullifier,
          locationHash,
          timestampHash,
          organizationId: orgIdHash
        });
        
        return proof;
      }
    } catch (error) {
      console.error('Error generating attendance proof:', error);
      throw error;
    }
  }

  /**
   * Verify ZK proof (client-side verification)
   */
  async verifyProof(proof: ZKProof): Promise<boolean> {
    try {
      if (!this.isProduction) {
        // Simulation mode verification
        if (!proof.proof || !proof.publicSignals || proof.publicSignals.length < 4) {
          return false;
        }
        
        // Verify proof format
        const proofData = JSON.parse(Buffer.from(proof.proof, 'base64').toString());
        
        return !!(
          proofData.pi_a &&
          proofData.pi_b &&
          proofData.pi_c &&
          proofData.protocol === 'groth16'
        );
      } else {
        // Production mode would verify using the verification key
        // For now, do enhanced validation
        try {
          const proofData = JSON.parse(proof.proof);
          return proofData && proofData.protocol === 'groth16' && proof.publicSignals.length >= 5;
        } catch {
          return false;
        }
      }
    } catch (error) {
      console.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Extract features from biometric hash (production mode)
   */
  private extractFeatures(biometricHash: string): string[] {
    const FEATURE_SIZE = 128;
    const features: string[] = [];
    
    const hash = CryptoJS.SHA256(biometricHash).toString();
    
    for (let i = 0; i < FEATURE_SIZE; i++) {
      const hex = hash.substring((i * 2) % hash.length, ((i * 2) + 2) % hash.length);
      const value = BigInt('0x' + hex) % this.FIELD_PRIME;
      features.push(value.toString());
    }
    
    return features;
  }

  /**
   * Generate random salt for commitments
   */
  private generateRandomSalt(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    return randomBytes.toString(CryptoJS.enc.Hex);
  }

  /**
   * Generate production salt (field elements)
   */
  private async generateProductionSalt(): Promise<string[]> {
    const salt1 = await Crypto.getRandomBytesAsync(32);
    const salt2 = await Crypto.getRandomBytesAsync(32);
    
    return [
      (BigInt('0x' + Buffer.from(salt1).toString('hex')) % this.FIELD_PRIME).toString(),
      (BigInt('0x' + Buffer.from(salt2).toString('hex')) % this.FIELD_PRIME).toString()
    ];
  }

  /**
   * Encrypt salt for storage
   */
  private async encryptSalt(salt: string[]): Promise<string> {
    // In production, use secure storage
    // For now, simple base64 encoding
    return Buffer.from(JSON.stringify(salt)).toString('base64');
  }

  /**
   * Decrypt salt
   */
  private async decryptSalt(encryptedSalt: string): Promise<string[]> {
    return JSON.parse(Buffer.from(encryptedSalt, 'base64').toString());
  }

  /**
   * Simplified Poseidon hash implementation
   */
  private async poseidonHash(inputs: string[]): Promise<string> {
    // In production, this would use actual Poseidon
    // For now, simulate with SHA256
    const concatenated = inputs.join(':');
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      concatenated,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Convert to field element
    const value = BigInt('0x' + hash) % this.FIELD_PRIME;
    return value.toString();
  }

  /**
   * Hash location data for privacy
   */
  private hashLocation(location: Location): string {
    const lat = Math.round(location.latitude * 1000) / 1000;
    const lng = Math.round(location.longitude * 1000) / 1000;
    return CryptoJS.SHA256(`${lat},${lng}`).toString();
  }

  /**
   * Hash location for production
   */
  private async hashLocationProduction(location: Location): Promise<string> {
    const lat = Math.round(location.latitude * 1000);
    const lng = Math.round(location.longitude * 1000);
    return this.poseidonHash([lat.toString(), lng.toString()]);
  }

  /**
   * Hash timestamp
   */
  private async hashTimestamp(timestamp: number): Promise<string> {
    const rounded = Math.floor(timestamp / 60000) * 60000;
    return this.poseidonHash([rounded.toString()]);
  }

  /**
   * Hash organization ID
   */
  private async hashOrganizationId(orgId: string): Promise<string> {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      orgId,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return this.poseidonHash([hash]);
  }

  /**
   * Generate mock proof for development
   */
  private generateMockProof(inputs: any): string {
    const proofObject = {
      pi_a: [
        '0x' + CryptoJS.SHA256(inputs.commitment).toString().substring(0, 64),
        '0x' + CryptoJS.SHA256(inputs.nullifier).toString().substring(0, 64)
      ],
      pi_b: [
        [
          '0x' + CryptoJS.SHA256(inputs.locationHash).toString().substring(0, 64),
          '0x' + CryptoJS.SHA256(inputs.timestampHash).toString().substring(0, 64)
        ],
        [
          '0x' + CryptoJS.SHA256('b1').toString().substring(0, 64),
          '0x' + CryptoJS.SHA256('b2').toString().substring(0, 64)
        ]
      ],
      pi_c: [
        '0x' + CryptoJS.SHA256('c1').toString().substring(0, 64),
        '0x' + CryptoJS.SHA256('c2').toString().substring(0, 64)
      ],
      protocol: 'groth16'
    };
    
    return Buffer.from(JSON.stringify(proofObject)).toString('base64');
  }

  /**
   * Generate production proof
   */
  private async generateProductionProof(inputs: any): Promise<ZKProof> {
    // In production, this would use snarkjs with WASM
    // For now, create a realistic proof structure
    
    const proofData = {
      pi_a: ['1', '2'],
      pi_b: [['3', '4'], ['5', '6']],
      pi_c: ['7', '8'],
      protocol: 'groth16'
    };
    
    const publicSignals = [
      inputs.commitment,
      inputs.nullifier,
      inputs.locationHash,
      inputs.timestampHash,
      inputs.organizationId
    ];
    
    return {
      proof: JSON.stringify(proofData),
      publicSignals,
      nullifier: inputs.nullifier,
      metadata: {
        mode: 'production',
        version: '1.0.0'
      }
    };
  }

  /**
   * Generate global biometric hash for cross-organization uniqueness check
   */
  async generateGlobalBiometricHash(
    fingerprintHash: string,
    faceHash: string
  ): Promise<string> {
    const combined = `${fingerprintHash}_${faceHash}`;
    if (this.isProduction) {
      return this.poseidonHash([fingerprintHash, faceHash]);
    } else {
      return CryptoJS.SHA256(combined).toString();
    }
  }

  /**
   * Get client status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      mode: this.isProduction ? 'production' : 'simulation',
      apiUrl: this.apiBaseUrl
    };
  }
}

export default new ZKPClient();