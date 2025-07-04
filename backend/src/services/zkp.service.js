// backend/src/services/zkp.service.js
import * as snarkjs from 'snarkjs';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { CONSTANTS } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ZKPService {
  constructor() {
    this.isInitialized = false;
    this.circuits = {};
    this.verificationKeys = {};
  }

  async initialize() {
    try {
      const circuitPath = path.join(__dirname, '../zkp/circuits/build');
      const ceremonyPath = path.join(__dirname, '../zkp/circuits/ceremony');

      // Load biometric authentication circuit
      this.circuits.biometricAuth = {
        wasm: path.join(circuitPath, 'biometric_auth_js/biometric_auth.wasm'),
        zkey: path.join(ceremonyPath, 'biometric_auth_final.zkey')
      };

      // Load verification key
      const vKeyPath = path.join(ceremonyPath, 'verification_key.json');
      this.verificationKeys.biometricAuth = JSON.parse(
        await fs.readFile(vKeyPath, 'utf8')
      );

      // Verify circuit files exist
      await fs.access(this.circuits.biometricAuth.wasm);
      await fs.access(this.circuits.biometricAuth.zkey);

      this.isInitialized = true;
      logger.info('ZKP Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ZKP Service:', error);
      logger.warn('Running in simulation mode');
      this.isInitialized = false;
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
      return this.generateSimulatedProof(input);
    }

    try {
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

      logger.info('Generating ZK proof...');
      const startTime = Date.now();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        this.circuits.biometricAuth.wasm,
        this.circuits.biometricAuth.zkey
      );

      const proofTime = Date.now() - startTime;
      logger.info(`Proof generated in ${proofTime}ms`);

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
      logger.error('Proof generation failed:', error);
      throw new Error('Failed to generate attendance proof');
    }
  }

  async verifyProof(proof, publicSignals) {
    if (!this.isInitialized) {
      return this.verifySimulatedProof(proof, publicSignals);
    }

    try {
      const result = await snarkjs.groth16.verify(
        this.verificationKeys.biometricAuth,
        publicSignals,
        proof
      );
      return result;
    } catch (error) {
      logger.error('Proof verification failed:', error);
      return false;
    }
  }

  // Simulation methods for development
  generateSimulatedProof(input) {
    logger.warn('Generating simulated proof (not cryptographically secure)');
    
    const proof = {
      pi_a: [
        "0x" + crypto.randomBytes(32).toString('hex'),
        "0x" + crypto.randomBytes(32).toString('hex')
      ],
      pi_b: [[
        "0x" + crypto.randomBytes(32).toString('hex'),
        "0x" + crypto.randomBytes(32).toString('hex')
      ], [
        "0x" + crypto.randomBytes(32).toString('hex'),
        "0x" + crypto.randomBytes(32).toString('hex')
      ]],
      pi_c: [
        "0x" + crypto.randomBytes(32).toString('hex'),
        "0x" + crypto.randomBytes(32).toString('hex')
      ],
      protocol: "groth16",
      curve: "bn128"
    };

    const publicSignals = [
      input.commitment,
      this.stringToFieldElement(input.scholarId),
      this.stringToFieldElement(input.organizationId),
      input.timestamp?.toString() || Math.floor(Date.now() / 1000).toString()
    ];

    const proofHash = this.generateProofHash(proof, publicSignals);

    return {
      proof,
      publicSignals,
      proofHash,
      generationTime: Math.floor(Math.random() * 500) + 500,
      isRealProof: false
    };
  }

  verifySimulatedProof(proof, publicSignals) {
    // In simulation mode, verify basic structure
    return !!(
      proof.pi_a && proof.pi_b && proof.pi_c &&
      publicSignals && publicSignals.length >= 4
    );
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
      const value = BigInt('0x' + chunk) % CONSTANTS.FIELD_SIZE;
      elements.push(value.toString());
    }
    
    return elements;
  }

  saltToFieldElements(salt) {
    if (!salt) return ['0', '0'];
    
    return [
      (BigInt('0x' + salt.substring(0, 32)) % CONSTANTS.FIELD_SIZE).toString(),
      (BigInt('0x' + salt.substring(32)) % CONSTANTS.FIELD_SIZE).toString()
    ];
  }

  stringToFieldElement(str) {
    const hash = crypto.createHash('sha256').update(str).digest('hex');
    return (BigInt('0x' + hash.substring(0, 31)) % CONSTANTS.FIELD_SIZE).toString();
  }

  coordinateToFieldElement(coord) {
    return Math.floor(coord * 1e6).toString();
  }

  biometricToFieldElement(data) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return (BigInt('0x' + hash.substring(0, 31)) % CONSTANTS.FIELD_SIZE).toString();
  }

  async poseidonHash(inputs) {
    // In production, use actual Poseidon hash
    // For now, using SHA256 as placeholder
    const data = inputs.join('');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return BigInt('0x' + hash) % CONSTANTS.FIELD_SIZE;
  }

  generateProofHash(proof, publicSignals) {
    const data = JSON.stringify({ proof, publicSignals, timestamp: Date.now() });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async generateGlobalBiometricHash(fingerprintData, faceData) {
    const combined = {
      fingerprint: this.preprocessFingerprint(fingerprintData),
      face: this.preprocessFace(faceData)
    };
    
    const hash = crypto.createHash('sha512')
      .update(JSON.stringify(combined))
      .digest('hex');
    
    return hash;
  }
}