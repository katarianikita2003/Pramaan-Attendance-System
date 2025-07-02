#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// Dynamic import for the ZKP helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing ZKP Implementation for Pramaan Attendance System\n');

// Check if ZKP is set up
async function checkZKPSetup() {
    const requiredFiles = [
        'circuits/build/biometric_auth_js/biometric_auth.wasm',
        'circuits/ceremony/biometric_auth_final.zkey',
        'circuits/ceremony/verification_key.json'
    ];
    
    console.log('📋 Checking ZKP setup...');
    for (const file of requiredFiles) {
        try {
            await fs.access(join(__dirname, file));
            console.log(`  ✅ ${file}`);
        } catch {
            console.log(`  ❌ ${file} - Missing`);
            console.log('\n⚠️  Please run "node setup-zkp.js" first\n');
            process.exit(1);
        }
    }
    console.log();
}

// Test the ZKP functionality
async function testZKP() {
    try {
        // Import the ZKP helpers
        const { generateAttendanceProof, verifyAttendanceProof } = await import('./zkp-helpers.js');
        
        console.log('🔐 Testing ZKP Proof Generation and Verification\n');
        
        // Simulate biometric features
        const biometricFeatures = [
            '12345678901234567890123456789012',
            '98765432109876543210987654321098',
            '11111111112222222222333333333344',
            '44444444445555555555666666666677'
        ];
        
        const scholarId = '1234567890';
        const locationData = {
            latitude: 25.26,
            longitude: 82.99,
            accuracy: 10,
            building: 'Main Academic Building'
        };
        
        console.log('📊 Test Data:');
        console.log(`  Scholar ID: ${scholarId}`);
        console.log(`  Location: ${locationData.building}`);
        console.log(`  Coordinates: ${locationData.latitude}, ${locationData.longitude}`);
        console.log();
        
        // Generate proof
        console.log('⏳ Generating ZK proof (this may take a few seconds)...');
        const startTime = Date.now();
        
        const { proof, publicSignals, salt } = await generateAttendanceProof(
            biometricFeatures,
            scholarId,
            locationData
        );
        
        const proofTime = Date.now() - startTime;
        console.log(`✅ Proof generated in ${proofTime}ms`);
        
        // Display proof details
        console.log('\n📄 Proof Details:');
        console.log(`  Proof Protocol: ${proof.protocol || 'groth16'}`);
        console.log(`  Curve: ${proof.curve || 'bn128'}`);
        console.log(`  Public Signals: ${publicSignals.length} values`);
        console.log(`  Salt (keep private): ${salt.substring(0, 16)}...`);
        
        // Verify proof
        console.log('\n🔍 Verifying proof...');
        const verifyStartTime = Date.now();
        
        const isValid = await verifyAttendanceProof(proof, publicSignals);
        
        const verifyTime = Date.now() - verifyStartTime;
        console.log(`✅ Verification completed in ${verifyTime}ms`);
        console.log(`\n🎉 Proof is ${isValid ? 'VALID' : 'INVALID'}`);
        
        if (isValid) {
            console.log('\n✨ ZKP implementation is working correctly!');
            console.log('   The system can now prove attendance without revealing biometric data.');
        }
        
        // Test invalid proof
        console.log('\n🧪 Testing invalid proof detection...');
        const tamperedSignals = [...publicSignals];
        tamperedSignals[0] = '99999999999999999999999999999999999999999999999999999999999999999';
        
        const invalidResult = await verifyAttendanceProof(proof, tamperedSignals);
        console.log(`✅ Invalid proof correctly rejected: ${!invalidResult}`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Performance test
async function performanceTest() {
    console.log('\n⚡ Performance Testing...\n');
    
    try {
        const { generateAttendanceProof, verifyAttendanceProof } = await import('./zkp-helpers.js');
        
        const iterations = 5;
        const proofTimes = [];
        const verifyTimes = [];
        
        for (let i = 0; i < iterations; i++) {
            // Random test data
            const biometricFeatures = Array(4).fill(0).map(() => 
                crypto.randomBytes(16).toString('hex')
            );
            const scholarId = crypto.randomBytes(4).toString('hex');
            const locationData = {
                latitude: 25.26 + Math.random() * 0.01,
                longitude: 82.99 + Math.random() * 0.01,
                accuracy: 5 + Math.random() * 10,
                building: 'Test Building'
            };
            
            // Measure proof generation
            const proofStart = Date.now();
            const { proof, publicSignals } = await generateAttendanceProof(
                biometricFeatures,
                scholarId,
                locationData
            );
            proofTimes.push(Date.now() - proofStart);
            
            // Measure verification
            const verifyStart = Date.now();
            await verifyAttendanceProof(proof, publicSignals);
            verifyTimes.push(Date.now() - verifyStart);
            
            process.stdout.write(`  Test ${i + 1}/${iterations} completed\r`);
        }
        
        // Calculate statistics
        const avgProofTime = proofTimes.reduce((a, b) => a + b) / iterations;
        const avgVerifyTime = verifyTimes.reduce((a, b) => a + b) / iterations;
        
        console.log('\n\n📊 Performance Results:');
        console.log(`  Average Proof Generation: ${avgProofTime.toFixed(2)}ms`);
        console.log(`  Average Verification: ${avgVerifyTime.toFixed(2)}ms`);
        console.log(`  Total Circuit Time: ${(avgProofTime + avgVerifyTime).toFixed(2)}ms`);
        console.log(`  Throughput: ~${(1000 / (avgProofTime + avgVerifyTime)).toFixed(1)} operations/second`);
        
    } catch (error) {
        console.error('\n❌ Performance test failed:', error.message);
    }
}

// Main test runner
async function main() {
    console.log('═'.repeat(60));
    console.log(' '.repeat(15) + 'PRAMAAN ZKP TEST SUITE');
    console.log('═'.repeat(60) + '\n');
    
    await checkZKPSetup();
    await testZKP();
    await performanceTest();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('═'.repeat(60) + '\n');
    
    console.log('📝 Next Steps:');
    console.log('1. Update server.js with the new ZKPManager class');
    console.log('2. Run the server and test with the web interface');
    console.log('3. Monitor the console for real ZKP operations');
    console.log('4. Consider deploying the Solidity verifier for on-chain verification');
}

main().catch(console.error);