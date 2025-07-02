template Multiplier() {
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

component main = BiometricAuth();