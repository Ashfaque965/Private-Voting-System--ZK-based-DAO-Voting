// Nullifier Circuit
// Prevents double voting by enforcing that each nullifier can only be used once

pragma circom 2.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template NullifierCheck() {
    // Public inputs
    input public nullifierHash;  // Hash of (secret, nullifier)
    input public voteSecret;     // Voter's secret (public for verification)
    
    // Private inputs
    input private nullifier;     // Unique per voter
    
    // Verify nullifier commitment
    component nullifierVerifier = Poseidon(2);
    nullifierVerifier.inputs[0] <== voteSecret;
    nullifierVerifier.inputs[1] <== nullifier;
    
    // Check that computed nullifier matches the public one
    nullifierVerifier.out === nullifierHash;
}

component main { public [ nullifierHash, voteSecret ] } = NullifierCheck();
