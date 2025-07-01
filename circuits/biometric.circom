
pragma circom 2.0.0;

template BiometricVerification() {
    signal input biometricHash[2];
    signal input storedHash[2];
    signal input nonce;
    signal output isValid;
    
    // Verify that biometric matches stored hash
    component eq1 = IsEqual();
    eq1.in[0] <== biometricHash[0];
    eq1.in[1] <== storedHash[0];
    
    component eq2 = IsEqual();
    eq2.in[0] <== biometricHash[1];
    eq2.in[1] <== storedHash[1];
    
    // Both parts must match
    isValid <== eq1.out * eq2.out;
}

template IsEqual() {
    signal input in[2];
    signal output out;
    
    signal diff;
    diff <== in[0] - in[1];
    
    component isZero = IsZero();
    isZero.in <== diff;
    out <== isZero.out;
}

template IsZero() {
    signal input in;
    signal output out;
    
    signal inv;
    inv <-- in != 0 ? 1/in : 0;
    out <== -in*inv + 1;
    in * out === 0;
}

component main = BiometricVerification();
        