// ===== mobile/src/services/zkp.service.js =====
import RNFS from 'react-native-fs';
import { NativeModules, Platform } from 'react-native';
import crypto from 'react-native-crypto';
import { Buffer } from 'buffer';
import * as snarkjs from 'snarkjs';

const { ZKPModule } = NativeModules;

class ZKPService {
  constructor() {
    this.isInitialized = false;
    this.circuits = {};
    this.fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  }

  async initialize() {
    try {
      // Load circuit files from app bundle
      const circuitBasePath = Platform.OS === 'ios' 
        ? `${RNFS.MainBundlePath}/circuits`
        : 'circuits';
      
      // Load WASM and zkey files
      const wasmPath = `${circuitBasePath}/biometric_auth.wasm`;
      const zkeyPath = `${circuitBasePath}/biometric_auth_final.zkey`;
      
      // Read files
      const wasmData = await RNFS.readFile(wasmPath, 'base64');
      const zkeyData = await RNFS.readFile(zkeyPath, 'base64');
      
      this.circuits = {
        wasm: Buffer.from(wasmData, 'base64'),
        zkey: Buffer.from(zkeyData, 'base64')
      };
      
      this.isInitialized = true;
      console.log('ZKP Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ZKP Service:', error);
      // Fall back to native module if available
      if (ZKPModule && ZKPModule.initialize) {
        await ZKPModule.initialize();
        this.isInitialized = true;
      }
    }
  }

  async generateBiometricCommitment(biometricData) {
    const salt = crypto.randomBytes(32).toString('hex');
    const commitment = await this.poseidonHash([
      this.biometricToFieldElement(biometricData.fingerprint),
      this.biometricToFieldElement(biometricData.face),
      this.saltToFieldElement(salt)
    ]);
    
    return {
      commitment: commitment.toString(),
      salt
    };
  }

  async generateAttendanceProof(input) {
    const {
      biometricData,
      commitment,
      scholarId,
      organizationId,
      location,
      timestamp
    } = input;

    if (!this.isInitialized) {
      throw new Error('ZKP Service not initialized');
    }

    try {
      // Use native module for better performance if available
      if (ZKPModule && ZKPModule.generateProof) {
        return await ZKPModule.generateProof(input);
      }

      // Fallback to JavaScript implementation
      const circuitInput = {
        // Private inputs
        fingerprintData: this.preprocessFingerprint(biometricData.fingerprint),
        faceData: this.preprocessFace(biometricData.face),
        salt: this.saltToFieldElements(biometricData.salt),
        
        // Public inputs
        expectedCommitment: commitment,
        scholarId: this.stringToFieldElement(scholarId),
        organizationId: this.stringToFieldElement(organizationId),
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        locationLat: this.coordinateToFieldElement(location.latitude),
        locationLng: this.coordinateToFieldElement(location.longitude)
      };

      console.log('Generating ZK proof...');
      const startTime = Date.now();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        this.circuits.wasm,
        this.circuits.zkey
      );

      const proofTime = Date.now() - startTime;
      console.log(`Proof generated in ${proofTime}ms`);

      // Generate unique proof hash
      const proofHash = this.generateProofHash(proof, publicSignals);

      return {
        proof,
        publicSignals,
        proofHash,
        generationTime: proofTime,
        isRealProof: true
      };
    } catch (error) {
      console.error('Proof generation failed:', error);
      throw new Error('Failed to generate attendance proof');
    }
  }

  // Helper methods
  preprocessFingerprint(fingerprintData) {
    if (!fingerprintData) return Array(4).fill('0');
    
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
    
    return this.hashToFieldElements(hash, 4);
  }

  preprocessFace(faceData) {
    if (!faceData) return Array(4).fill('0');
    
    const features = {
      embedding: faceData.embedding || [],
      landmarks: faceData.landmarks || {},
      quality: faceData.quality || 0
    };
    
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(features))
      .digest('hex');
    
    return this.hashToFieldElements(hash, 4);
  }

  hashToFieldElements(hash, count) {
    const elements = [];
    const chunkSize = Math.floor(64 / count);
    
    for (let i = 0; i < count; i++) {
      const chunk = hash.substring(i * chunkSize, (i + 1) * chunkSize);
      const value = BigInt('0x' + chunk) % this.fieldSize;
      elements.push(value.toString());
    }
    
    return elements;
  }

  saltToFieldElements(salt) {
    if (!salt) return ['0', '0'];
    
    return [
      (BigInt('0x' + salt.substring(0, 32)) % this.fieldSize).toString(),
      (BigInt('0x' + salt.substring(32)) % this.fieldSize).toString()
    ];
  }

  stringToFieldElement(str) {
    const hash = crypto.createHash('sha256').update(str).digest('hex');
    return (BigInt('0x' + hash.substring(0, 31)) % this.fieldSize).toString();
  }

  coordinateToFieldElement(coord) {
    return Math.floor(coord * 1e6).toString();
  }

  biometricToFieldElement(data) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return (BigInt('0x' + hash.substring(0, 31)) % this.fieldSize).toString();
  }

  async poseidonHash(inputs) {
    // In production, use actual Poseidon hash from circomlib
    // For now, using SHA256 as placeholder
    const data = inputs.join('');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return BigInt('0x' + hash) % this.fieldSize;
  }

  generateProofHash(proof, publicSignals) {
    const data = JSON.stringify({ proof, publicSignals, timestamp: Date.now() });
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const zkpService = new ZKPService();
