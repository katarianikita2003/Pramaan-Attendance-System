// circuits/attendance.circom
pragma circom 2.0.0;

template BiometricVerifier() {
    signal input biometric;
    signal input commitment;
    signal output valid;
    
    // Hash the biometric
    component hasher = Poseidon(1);
    hasher.inputs[0] <== biometric;
    
    // Check if hash matches commitment
    valid <== hasher.out - commitment;
    valid === 0;
}

component main = BiometricVerifier();