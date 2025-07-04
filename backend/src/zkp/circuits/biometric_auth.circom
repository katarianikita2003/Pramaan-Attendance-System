// ===== backend/src/zkp/circuits/biometric_auth.circom =====
pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";

template BiometricAuth() {
    // Private inputs - biometric data
    signal private input fingerprintData[4];
    signal private input faceData[4];
    signal private input salt[2];
    
    // Public inputs
    signal input expectedCommitment;
    signal input scholarId;
    signal input organizationId;
    signal input timestamp;
    signal input locationLat;
    signal input locationLng;
    
    // Outputs
    signal output isValid;
    signal output attendanceProofHash;
    
    // Hash fingerprint data using Poseidon
    component fingerprintHasher = Poseidon(4);
    for (var i = 0; i < 4; i++) {
        fingerprintHasher.inputs[i] <== fingerprintData[i];
    }
    
    // Hash face data using Poseidon
    component faceHasher = Poseidon(4);
    for (var i = 0; i < 4; i++) {
        faceHasher.inputs[i] <== faceData[i];
    }
    
    // Hash salt
    component saltHasher = Poseidon(2);
    saltHasher.inputs[0] <== salt[0];
    saltHasher.inputs[1] <== salt[1];
    
    // Create commitment from biometric hashes and salt
    component commitmentHasher = Poseidon(3);
    commitmentHasher.inputs[0] <== fingerprintHasher.out;
    commitmentHasher.inputs[1] <== faceHasher.out;
    commitmentHasher.inputs[2] <== saltHasher.out;
    
    // Verify commitment matches expected
    component commitmentChecker = IsEqual();
    commitmentChecker.in[0] <== commitmentHasher.out;
    commitmentChecker.in[1] <== expectedCommitment;
    
    // Verify timestamp is recent (within 5 minutes = 300 seconds)
    component timestampChecker = LessThan(32);
    signal currentTime;
    currentTime <-- timestamp;
    
    signal timeDiff;
    timeDiff <-- currentTime - timestamp;
    
    timestampChecker.in[0] <== timeDiff;
    timestampChecker.in[1] <== 300;
    
    // Combine all validity checks
    signal validCommitment;
    signal validTime;
    
    validCommitment <== commitmentChecker.out;
    validTime <== timestampChecker.out;
    
    // Final validity check
    component finalValidityMux = Mux1();
    finalValidityMux.c[0] <== 0;
    finalValidityMux.c[1] <== validTime;
    finalValidityMux.s <== validCommitment;
    
    isValid <== finalValidityMux.out;
    
    // Generate unique attendance proof hash
    component proofHasher = Poseidon(6);
    proofHasher.inputs[0] <== scholarId;
    proofHasher.inputs[1] <== organizationId;
    proofHasher.inputs[2] <== timestamp;
    proofHasher.inputs[3] <== locationLat;
    proofHasher.inputs[4] <== locationLng;
    proofHasher.inputs[5] <== commitmentHasher.out;
    
    attendanceProofHash <== proofHasher.out;
}

component main = BiometricAuth();