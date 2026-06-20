// Simple Private Voting Circuit
// Voter commits to their vote choice without revealing it
// Proves knowledge of secret that maps to this vote commitment

pragma circom 2.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template PrivateVote() {
    // Public outputs
    output out;  // Vote commitment (hash of secret + choice)
    output out2; // Nullifier hash for double-voting check
    
    // Private inputs
    input private secret;             // Voter's secret (never revealed)
    input private choice;             // Vote choice (0 or 1)
    input private nullifier;          // Prevents double voting
    
    // Verify choice is 0 or 1 (Yes/No)
    choice * (choice - 1) === 0;
    
    // Compute vote commitment
    component voteCommitter = Poseidon(2);
    voteCommitter.inputs[0] <== secret;
    voteCommitter.inputs[1] <== choice;
    out <== voteCommitter.out;
    
    // Compute nullifier hash for on-chain storage to prevent double votes
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== nullifier;
    out2 <== nullifierHasher.out;
}

component main = PrivateVote();
