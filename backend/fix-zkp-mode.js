// fix-zkp-mode.js
// Run this script from the backend directory: node fix-zkp-mode.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing ZKP mode to force simulation...\n');

// Path to the zkpService.js file
const zkpServicePath = path.join(__dirname, 'src', 'services', 'zkpService.js');

// Check if the file exists
if (!fs.existsSync(zkpServicePath)) {
  console.error('❌ zkpService.js not found at:', zkpServicePath);
  process.exit(1);
}

// Read the current file
const currentContent = fs.readFileSync(zkpServicePath, 'utf8');

// Create backup
const backupPath = zkpServicePath + '.backup';
fs.writeFileSync(backupPath, currentContent);
console.log('✅ Created backup at:', backupPath);

// Find the section where it checks for real circuits and force simulation mode
let fixedContent = currentContent;

// Look for the initialization logic
if (currentContent.includes('Real ZKP files found - running in production mode')) {
  // Replace the production mode logic
  fixedContent = currentContent.replace(
    /if\s*\(\s*this\.hasRealCircuits\s*\)\s*{[\s\S]*?this\.mode\s*=\s*['"]production['"]/gm,
    `if (this.hasRealCircuits && process.env.ZKP_MODE === 'production') {
        logger.info('Real ZKP files found AND production mode requested');
        this.mode = 'production'`
  );
  
  // Update the log message
  fixedContent = fixedContent.replace(
    'Real ZKP files found - running in production mode',
    'Real ZKP files found but respecting ZKP_MODE environment variable'
  );
} else {
  console.log('⚠️  zkpService.js might already be modified or has different structure');
}

// Ensure simulation mode is set when ZKP_MODE is not production
if (!fixedContent.includes('process.env.ZKP_MODE')) {
  // Add environment check at the beginning of initialize method
  fixedContent = fixedContent.replace(
    /async initialize\(\) {/,
    `async initialize() {
      // Force simulation mode based on environment
      const envMode = process.env.ZKP_MODE || 'simulation';
      logger.info(\`ZKP_MODE from environment: \${envMode}\`);`
  );
}

// Write the fixed content
fs.writeFileSync(zkpServicePath, fixedContent);
console.log('✅ Fixed zkpService.js to respect ZKP_MODE environment variable');

// Also check and handle the mock files
const zkpCircuitsPath = path.join(__dirname, 'zkp-circuits');
if (fs.existsSync(zkpCircuitsPath)) {
  const wasmPath = path.join(zkpCircuitsPath, 'biometric.wasm');
  if (fs.existsSync(wasmPath)) {
    try {
      const wasmContent = fs.readFileSync(wasmPath);
      if (wasmContent.toString().includes('mock')) {
        console.log('\n⚠️  Found mock WASM file that contains invalid data');
        // Create a proper WebAssembly magic number header for mock
        const mockWasm = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
        fs.writeFileSync(wasmPath + '.proper', mockWasm);
        console.log('✅ Created a proper mock WASM file');
        
        // Rename the bad one
        fs.renameSync(wasmPath, wasmPath + '.textmock');
        fs.renameSync(wasmPath + '.proper', wasmPath);
        console.log('✅ Replaced text mock with proper WASM mock');
      }
    } catch (error) {
      console.log('⚠️  Could not check WASM file:', error.message);
    }
  }
}

console.log('\n✨ Fix applied successfully!');
console.log('🔄 Please restart your server for changes to take effect.');
console.log('\nTo verify the fix:');
console.log('1. Stop the server (Ctrl+C)');
console.log('2. Run: npm run dev');
console.log('3. Check the logs - should show "simulation mode"');
console.log('4. Try marking attendance with Scholar 62');

// Also create a direct patch for immediate use
const directPatchPath = path.join(__dirname, 'src', 'services', 'zkpService.patched.js');
const patchedContent = `// Patched zkpService.js - Forces simulation mode
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ZKPService {
  constructor() {
    this.poseidon = null;
    this.snarkjs = null;
    this.verificationKey = null;
    this.isInitialized = false;
    this.mode = 'simulation'; // Force simulation
    this.hasRealCircuits = false;
  }

  async initialize() {
    try {
      logger.info('Initializing ZKP Service...');

      // Initialize Poseidon hash function
      this.poseidon = await buildPoseidon();
      logger.info('Poseidon hash function initialized');

      // Load snarkjs
      this.snarkjs = snarkjs;
      logger.info('snarkjs loaded successfully');

      // Always use simulation mode for now
      this.mode = 'simulation';
      logger.info('ZKP Service initialized in simulation mode');
      
      // Create mock verification key
      this.verificationKey = {
        protocol: "groth16",
        curve: "bn128",
        nPublic: 2
      };

      this.isInitialized = true;
      
    } catch (error) {
      logger.error('Failed to initialize ZKP service:', error);
      this.mode = 'simulation';
      this.isInitialized = true;
    }
  }

  // Get ZKP status
  getStatus() {
    return {
      initialized: this.isInitialized,
      mode: this.mode,
      hasSnarkjs: !!this.snarkjs,
      hasVerificationKey: !!this.verificationKey,
      hasRealCircuits: false,
      circuitPath: path.join(process.cwd(), 'zkp-circuits'),
      features: {
        biometricCommitment: true,
        attendanceProof: true,
        proofVerification: true,
        realTimeProofs: false
      }
    };
  }

  // Convert BigInt to string for JSON serialization
  bigIntToString(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }

  // Generate biometric commitment
  async generateBiometricCommitment(biometricData, salt) {
    if (!this.isInitialized) await this.initialize();

    try {
      const biometricHash = this.poseidon.F.toString(
        this.poseidon([BigInt(biometricData)])
      );
      
      const commitment = this.poseidon.F.toString(
        this.poseidon([BigInt(biometricHash), BigInt(salt)])
      );

      return this.bigIntToString({ commitment, biometricHash });
    } catch (error) {
      logger.error('Error generating biometric commitment:', error);
      throw error;
    }
  }

  // Generate attendance proof - always simulated
  async generateAttendanceProof(scholarId, biometricData, timestamp, locationValid) {
    if (!this.isInitialized) await this.initialize();

    logger.info('Generating simulated attendance proof');
    
    const proof = {
      pi_a: [
        crypto.randomBytes(32).toString('hex'),
        crypto.randomBytes(32).toString('hex'),
        "1"
      ],
      pi_b: [[
        crypto.randomBytes(32).toString('hex'),
        crypto.randomBytes(32).toString('hex')
      ], [
        crypto.randomBytes(32).toString('hex'),
        crypto.randomBytes(32).toString('hex')
      ], ["1", "0"]],
      pi_c: [
        crypto.randomBytes(32).toString('hex'),
        crypto.randomBytes(32).toString('hex'),
        "1"
      ],
      protocol: "groth16",
      curve: "bn128"
    };

    return {
      proof: JSON.stringify(proof),
      publicInputs: {
        commitment: biometricData.commitment || crypto.randomBytes(32).toString('hex'),
        nullifier: biometricData.nullifier || crypto.randomBytes(32).toString('hex'),
        timestamp: timestamp,
        scholarId: scholarId,
        locationValid: locationValid
      },
      proofId: crypto.randomBytes(16).toString('hex')
    };
  }

  // Verify attendance proof
  async verifyAttendanceProof(proof, publicInputs) {
    if (!this.isInitialized) await this.initialize();

    try {
      // Simulation verification - just check structure
      const proofData = typeof proof === 'string' ? JSON.parse(proof) : proof;
      return !!(
        proofData.pi_a && 
        proofData.pi_b && 
        proofData.pi_c &&
        publicInputs.commitment &&
        publicInputs.nullifier
      );
    } catch (error) {
      logger.error('Error verifying proof:', error);
      return false;
    }
  }

  // Get mode
  getMode() {
    return this.mode;
  }

  // Check if initialized
  isReady() {
    return this.isInitialized;
  }
}

// Create singleton instance
const zkpService = new ZKPService();

// Export both the class and the instance
export { ZKPService, zkpService };
export default zkpService;
`;

fs.writeFileSync(directPatchPath, patchedContent);
console.log('\n📄 Also created a patched version at:', directPatchPath);
console.log('   You can manually replace zkpService.js with zkpService.patched.js if needed');