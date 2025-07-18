
pragma circom 2.0.0;

template Poseidon(nInputs) {
    signal input inputs[nInputs];
    signal output out;
    
    // Simplified hash for development
    var sum = 0;
    for (var i = 0; i < nInputs; i++) {
        sum = sum + inputs[i];
    }
    out <== sum;
}
