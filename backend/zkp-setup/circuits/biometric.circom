pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template BiometricProof() {
    // Private inputs (never revealed)
    signal private input biometricHash;
    signal private input salt;
    
    // Public inputs (visible to verifier)
    signal input commitment;
    signal input nullifier;
    
    // Create hasher component
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== biometricHash;
    commitmentHasher.inputs[1] <== salt;
    
    // Verify commitment matches
    commitment === commitmentHasher.out;
    
    // Create nullifier hasher
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== biometricHash;
    
    // Verify nullifier matches
    nullifier === nullifierHasher.out;
}

component main = BiometricProof();