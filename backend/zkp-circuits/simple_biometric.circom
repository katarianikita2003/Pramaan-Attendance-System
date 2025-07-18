pragma circom 2.0.0;

template BiometricCommitment() {
    signal input biometricHash;
    signal input salt;
    signal output commitment;
    
    commitment <== biometricHash + salt;
}

component main = BiometricCommitment();
