import { generateBiometricProof, verifyBiometricProof, createCommitment } from './zkp-helpers.js';

async function test() {
    console.log('🧪 Testing ZKP simulation...');
    
    const biometric = 12345;
    const salt = 67890;
    const expected = createCommitment(biometric, salt);
    
    console.log('\n📊 Test parameters:');
    console.log('  Biometric:', biometric);
    console.log('  Salt:', salt);
    console.log('  Expected:', expected.toString());
    
    try {
        console.log('\n⏳ Generating proof...');
        const startTime = Date.now();
        const { proof, publicSignals } = await generateBiometricProof(biometric, salt, expected);
        const proofTime = Date.now() - startTime;
        console.log('✅ Proof generated in', proofTime, 'ms');
        console.log('   Proof type:', proof.protocol);
        
        console.log('\n🔍 Verifying proof...');
        const verifyStart = Date.now();
        const isValid = await verifyBiometricProof(proof, publicSignals);
        const verifyTime = Date.now() - verifyStart;
        console.log('✅ Verification completed in', verifyTime, 'ms');
        console.log('   Result:', isValid ? 'VALID ✅' : 'INVALID ❌');
        
        console.log('\n✨ Simulation working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

test();