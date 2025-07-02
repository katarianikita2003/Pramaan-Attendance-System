#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as snarkjs from 'snarkjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CIRCUITS_DIR = path.join(__dirname, 'circuits');
const BUILD_DIR = path.join(CIRCUITS_DIR, 'build');
const CEREMONY_DIR = path.join(CIRCUITS_DIR, 'ceremony');

console.log('🔧 Setting up ZKP infrastructure for Pramaan Attendance System...\n');

async function ensureDirectories() {
    console.log('📁 Creating directories...');
    await fs.mkdir(CIRCUITS_DIR, { recursive: true });
    await fs.mkdir(BUILD_DIR, { recursive: true });
    await fs.mkdir(CEREMONY_DIR, { recursive: true });
}

async function checkCircomVersion() {
    console.log('📦 Checking Circom installation...');
    try {
        const version = execSync('circom --version', { encoding: 'utf8' });
        console.log('✅ Circom is installed:', version.trim());
        return version;
    } catch (error) {
        console.log('❌ Circom not found. Installing circom2...');
        try {
            // Install circom2 which is the newer version
            console.log('Installing circom2 (this may take a few minutes)...');
            execSync('npm install -g circom2', { stdio: 'inherit' });
            return 'circom2';
        } catch {
            console.log('❌ Failed to install circom2.');
            console.log('Please install manually from: https://docs.circom.io/');
            process.exit(1);
        }
    }
}

async function createSimpleCircuit() {
    console.log('📝 Creating simple biometric verification circuit...');
    
    // Very simple circuit that should work with any circom version
    const circuitCode = `template Multiplier() {
    signal private input a;
    signal private input b;
    signal output c;
    
    c <== a * b;
}

template BiometricAuth() {
    signal private input biometric;
    signal private input salt;
    signal input expected;
    signal output valid;
    
    // Simple computation
    component mult = Multiplier();
    mult.a <== biometric;
    mult.b <== salt;
    
    // Check if result matches expected
    signal diff;
    diff <== mult.c - expected;
    
    // Output 1 if match, 0 otherwise
    component isZero = IsZero();
    isZero.in <== diff;
    valid <== isZero.out;
}

template IsZero() {
    signal input in;
    signal output out;
    
    signal inv;
    inv <-- in != 0 ? 1/in : 0;
    out <== -in*inv + 1;
    in * out === 0;
}

component main = BiometricAuth();`;

    const circuitPath = path.join(CIRCUITS_DIR, 'biometric_auth.circom');
    await fs.writeFile(circuitPath, circuitCode);
    console.log('✅ Circuit created at:', circuitPath);
    return circuitPath;
}

async function compileCircuit(circuitPath) {
    console.log('\n🔨 Compiling circuit...');
    
    try {
        // First, try to compile without specifying output directory
        console.log('Attempting compilation...');
        const compileResult = execSync(`circom "${circuitPath}" --r1cs --wasm --sym`, {
            cwd: CIRCUITS_DIR,
            encoding: 'utf8'
        });
        console.log('Compilation output:', compileResult);
        
        // Check where files were generated
        const possibleLocations = [
            path.join(CIRCUITS_DIR, 'biometric_auth.r1cs'),
            path.join(CIRCUITS_DIR, 'biometric_auth_js'),
            path.join(__dirname, 'biometric_auth.r1cs'),
            path.join(__dirname, 'biometric_auth_js'),
        ];
        
        console.log('\n📂 Looking for generated files...');
        let r1csFound = false;
        let wasmFound = false;
        
        for (const loc of possibleLocations) {
            try {
                await fs.access(loc);
                console.log('✅ Found:', loc);
                
                if (loc.endsWith('.r1cs')) {
                    // Move r1cs file to build directory
                    const destPath = path.join(BUILD_DIR, 'biometric_auth.r1cs');
                    await fs.rename(loc, destPath);
                    console.log('   Moved to:', destPath);
                    r1csFound = true;
                }
                
                if (loc.endsWith('_js') && !loc.includes('build')) {
                    // Move wasm directory to build directory
                    const destPath = path.join(BUILD_DIR, 'biometric_auth_js');
                    try {
                        await fs.rm(destPath, { recursive: true, force: true });
                    } catch {}
                    await fs.rename(loc, destPath);
                    console.log('   Moved to:', destPath);
                    wasmFound = true;
                }
            } catch {
                // File doesn't exist at this location
            }
        }
        
        if (!r1csFound || !wasmFound) {
            throw new Error('Circuit compilation did not generate expected files');
        }
        
        console.log('\n✅ Circuit compiled successfully');
        
        // Print circuit info
        try {
            const r1csPath = path.join(BUILD_DIR, 'biometric_auth.r1cs');
            const info = await snarkjs.r1cs.info(r1csPath);
            console.log('\n📊 Circuit Statistics:');
            console.log(`   Total Constraints: ${info.nConstraints}`);
            console.log(`   Total Variables: ${info.nVars}`);
            console.log(`   Public Inputs: ${info.nPubInputs}`);
            console.log(`   Private Inputs: ${info.nPrvInputs}`);
        } catch (e) {
            console.log('⚠️  Could not read circuit statistics');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Compilation error:', error.message);
        return false;
    }
}

async function downloadPtau() {
    const ptauPath = path.join(CEREMONY_DIR, 'pot12_final.ptau');
    
    try {
        await fs.access(ptauPath);
        console.log('✅ Powers of Tau file already exists');
        return ptauPath;
    } catch {
        console.log('📥 Downloading Powers of Tau file...');
        
        try {
            // Try curl first
            execSync(
                `curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -o "${ptauPath}"`,
                { stdio: 'inherit' }
            );
        } catch {
            // Try PowerShell on Windows
            console.log('Trying PowerShell download...');
            try {
                execSync(
                    `powershell -Command "Invoke-WebRequest -Uri 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau' -OutFile '${ptauPath}'"`,
                    { stdio: 'inherit' }
                );
            } catch {
                console.log('❌ Failed to download Powers of Tau file');
                console.log('Please download manually from:');
                console.log('https://github.com/iden3/snarkjs#7-prepare-phase-2');
                throw new Error('Powers of Tau download failed');
            }
        }
        
        console.log('✅ Powers of Tau file downloaded');
        return ptauPath;
    }
}

async function setupCeremony() {
    console.log('\n🎭 Setting up trusted setup ceremony...');
    
    try {
        const r1csPath = path.join(BUILD_DIR, 'biometric_auth.r1cs');
        const ptauPath = await downloadPtau();
        
        // Generate zkey
        const zkeyPath = path.join(CEREMONY_DIR, 'biometric_auth_0000.zkey');
        console.log('🔑 Generating zkey...');
        await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkeyPath);
        
        // Contribute to ceremony
        const finalZkeyPath = path.join(CEREMONY_DIR, 'biometric_auth_final.zkey');
        console.log('🤝 Contributing to ceremony...');
        await snarkjs.zKey.contribute(
            zkeyPath,
            finalZkeyPath,
            "Pramaan Attendance System",
            crypto.randomBytes(32).toString('hex')
        );
        
        // Export verification key
        const vKeyPath = path.join(CEREMONY_DIR, 'verification_key.json');
        console.log('📤 Exporting verification key...');
        const vKey = await snarkjs.zKey.exportVerificationKey(finalZkeyPath);
        await fs.writeFile(vKeyPath, JSON.stringify(vKey, null, 2));
        
        // Clean up intermediate files
        try {
            await fs.unlink(zkeyPath);
        } catch {}
        
        console.log('✅ Trusted setup complete');
        return true;
    } catch (error) {
        console.error('❌ Ceremony setup failed:', error.message);
        return false;
    }
}

async function createHelperScripts() {
    console.log('\n📄 Creating helper scripts...');
    
    // Create proof generation script
    const proofGenScript = `import * as snarkjs from 'snarkjs';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function generateBiometricProof(biometric, salt, expected) {
    const circuitWasm = await fs.readFile(
        path.join(process.cwd(), 'circuits/build/biometric_auth_js/biometric_auth.wasm')
    );
    const circuitZkey = await fs.readFile(
        path.join(process.cwd(), 'circuits/ceremony/biometric_auth_final.zkey')
    );
    
    // Prepare inputs
    const input = {
        biometric: BigInt(biometric),
        salt: BigInt(salt),
        expected: BigInt(expected)
    };
    
    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        circuitWasm,
        circuitZkey
    );
    
    return { proof, publicSignals };
}

export async function verifyBiometricProof(proof, publicSignals) {
    const vKey = JSON.parse(
        await fs.readFile(
            path.join(process.cwd(), 'circuits/ceremony/verification_key.json'),
            'utf8'
        )
    );
    
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return res;
}

// Helper to create commitment
export function createCommitment(biometric, salt) {
    return BigInt(biometric) * BigInt(salt);
}`;

    await fs.writeFile(
        path.join(__dirname, 'zkp-helpers.js'),
        proofGenScript
    );
    
    // Create a test script
    const testScript = `import { generateBiometricProof, verifyBiometricProof, createCommitment } from './zkp-helpers.js';

async function test() {
    console.log('🧪 Testing ZKP implementation...');
    
    // Test values
    const biometric = 12345;
    const salt = 67890;
    const expected = createCommitment(biometric, salt);
    
    console.log('📊 Test parameters:');
    console.log('  Biometric:', biometric);
    console.log('  Salt:', salt);
    console.log('  Expected:', expected.toString());
    
    try {
        // Generate proof
        console.log('\\n⏳ Generating proof...');
        const startTime = Date.now();
        const { proof, publicSignals } = await generateBiometricProof(biometric, salt, expected);
        const proofTime = Date.now() - startTime;
        console.log('✅ Proof generated in', proofTime, 'ms');
        
        // Verify proof
        console.log('\\n🔍 Verifying proof...');
        const verifyStart = Date.now();
        const isValid = await verifyBiometricProof(proof, publicSignals);
        const verifyTime = Date.now() - verifyStart;
        console.log('✅ Verification completed in', verifyTime, 'ms');
        console.log('Result:', isValid ? 'VALID ✅' : 'INVALID ❌');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

test();`;

    await fs.writeFile(
        path.join(__dirname, 'test-zkp-simple.js'),
        testScript
    );
    
    console.log('✅ Helper scripts created');
}

async function main() {
    try {
        await ensureDirectories();
        await checkCircomVersion();
        
        const circuitPath = await createSimpleCircuit();
        const compiled = await compileCircuit(circuitPath);
        
        if (!compiled) {
            console.log('\n❌ Circuit compilation failed');
            console.log('The system will work in simulation mode.');
            return;
        }
        
        const ceremonyComplete = await setupCeremony();
        if (!ceremonyComplete) {
            console.log('\n⚠️  Ceremony setup failed');
            console.log('The system will work in simulation mode.');
            return;
        }
        
        await createHelperScripts();
        
        console.log('\n✨ ZKP setup complete!');
        console.log('\n📋 Next steps:');
        console.log('1. Test the setup: node test-zkp-simple.js');
        console.log('2. The server will automatically use ZKP if available');
        console.log('3. If ZKP fails, the system will use simulation mode');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.log('\n💡 The system will work in simulation mode.');
        console.log('You can still use all features, but without real ZKP.');
    }
}

// Add crypto import for Node.js
import crypto from 'crypto';

main();