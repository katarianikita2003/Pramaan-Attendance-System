template BiometricAuth() {
    signal private input biometric;
    signal private input salt;
    signal input commitment;
    signal output valid;
    
    signal hash;
    hash <== biometric * biometric + salt;
    
    component eq = IsEqual();
    eq.in[0] <== hash;
    eq.in[1] <== commitment;
    
    valid <== eq.out;
}

template IsEqual() {
    signal input in[2];
    signal output out;
    signal diff;
    diff <== in[0] - in[1];
    component isz = IsZero();
    isz.in <== diff;
    out <== isz.out;
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