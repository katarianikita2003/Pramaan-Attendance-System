pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template BiometricAttendance() {
    // Private inputs
    signal private input biometricHash;
    signal private input salt;
    
    // Public inputs  
    signal input commitment;
    signal input nullifier;
    
    // Create commitment hasher
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== biometricHash;
    commitmentHasher.inputs[1] <== salt;
    
    // Verify commitment matches
    component commitmentChecker = IsEqual();
    commitmentChecker.in[0] <== commitmentHasher.out;
    commitmentChecker.in[1] <== commitment;
    
    // Enforce commitment equality
    commitmentChecker.out === 1;
    
    // Create nullifier hasher  
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== biometricHash;
    
    // Verify nullifier matches
    component nullifierChecker = IsEqual();
    nullifierChecker.in[0] <== nullifierHasher.out;
    nullifierChecker.in[1] <== nullifier;
    
    // Enforce nullifier equality
    nullifierChecker.out === 1;
}

component main = BiometricAttendance();
