# Circuit Specification

## Overview

The Private Voting System uses Circom circuits to generate zero-knowledge proofs that:
1. **Voter knows their secret** but it's never revealed
2. **Voter's choice is valid** (0 = No, 1 = Yes)
3. **Voter hasn't voted twice** via nullifier mechanism

## Circuit: vote.circom

### Purpose
Generate a proof that proves:
- Voter knows a secret
- Voter has committed to a vote choice
- Vote choice is binary (0 or 1)

### Inputs

#### Private Inputs
```circom
input private secret;       // 32-bit random number unique per voter
input private choice;       // 1-bit (0 or 1)
input private nullifier;    // 32-bit random number for double-vote prevention
```

**Notes:**
- `secret`: Should be generated cryptographically randomly per voter once
- `choice`: 0 = "No" / 1 = "Yes" (can be extended for multiple options)
- `nullifier`: Unique identifier preventing replay on same proposal

#### Public Inputs
None (all voting data is private)

### Outputs

```circom
output out;     // Vote commitment = Hash(secret, choice)
output out2;    // Nullifier hash = Hash(secret, nullifier)
```

**Explanation:**
- `out`: Published on-chain. Links to vote without revealing choice or secret
- `out2`: Published on-chain. Prevents same voter from voting twice

### Constraints

#### 1. Binary Choice Constraint
```circom
choice * (choice - 1) === 0
```

**Purpose:** Ensure choice is either 0 or 1.

**How:**
- If choice = 0: `0 * (0-1) = 0 * (-1) = 0` ✓
- If choice = 1: `1 * (1-1) = 1 * 0 = 0` ✓
- If choice = 2: `2 * (2-1) = 2 * 1 = 2 ≠ 0` ✗ (fails)

#### 2. Commitment Generation
```circom
component voteCommitter = Poseidon(2);
voteCommitter.inputs[0] <== secret;
voteCommitter.inputs[1] <== choice;
out <== voteCommitter.out;
```

**Purpose:** Create vote commitment from secret and choice.

**Properties:**
- Deterministic: Same (secret, choice) → Same commitment
- One-way: Cannot reverse to get secret or choice from commitment
- Collision-resistant: Different (secret, choice) → Different commitment

#### 3. Nullifier Hash Generation
```circom
component nullifierHasher = Poseidon(2);
nullifierHasher.inputs[0] <== secret;
nullifierHasher.inputs[1] <== nullifier;
out2 <== nullifierHasher.out;
```

**Purpose:** Create unique identifier per voter per proposal.

**Key Property:** If same voter tries to vote twice:
- They must use the same `secret` (it's derived from identity)
- If nonce == on-chain record: Same nullifier hash → Rejection
- If nonce ≠ nonce: Different nullifier hash → Allowed (feature, not bug)

## Circuit: nullifier.circom

### Purpose
Verify that a nullifier hash was correctly computed.

### Inputs
```circom
input public nullifierHash;       // The public nullifier to verify
input public voteSecret;          // Voter's secret (shared for verification)
input private nullifier;          // The actual nullifier (private)
```

### Constraints
```circom
component nullifierVerifier = Poseidon(2);
nullifierVerifier.inputs[0] <== voteSecret;
nullifierVerifier.inputs[1] <== nullifier;
nullifierVerifier.out === nullifierHash;
```

**Purpose:** Prove that `Hash(secret, nullifier) == nullifierHash`

## Data Flow

### Vote Submission

```
User supplies:
  ├─ Secret (new, random)
  ├─ Choice (0 or 1)
  └─ Nullifier (per proposal)

Circuit proves:
  ├─ commitment = Hash(secret, choice)
  ├─ nullifierHash = Hash(secret, nullifier)
  └─ choice ∈ {0, 1}

Output proof contains:
  ├─ Public inputs: none
  └─ Public outputs: commitment, nullifierHash

Voter publishes to blockchain:
  ├─ commitment (proves vote exists, not which way)
  ├─ nullifierHash (proves voter identity for this proposal)
  └─ proof (cryptographic proof of above)
```

### Smart Contract Verification

```
Contract receives:
  ├─ proposalId
  ├─ commitment
  ├─ nullifierHash
  └─ proof

Contract checks:
  1. Is nullifierHash already used? (prevents double voting)
  2. Does proof verify commitment and nullifierHash?

If both pass:
  ├─ Store commitment
  ├─ Mark nullifierHash as used
  └─ Emit VoteCast event

If either fails:
  └─ Revert transaction
```

## Hash Functions

### Poseidon Hash

**Why Poseidon?**
- Optimized for zero-knowledge proofs
- Much fewer constraints than Keccak256
- Therefore: Smaller proofs, faster verification, lower gas

**Formula:**
```
Poseidon(x, y) = H(x, y)
  where H is a cryptographic sponge
  with specific S-box chosen for ZK efficiency
```

**Properties:**
- Deterministic: H(x,y) always produces same output
- One-way: Cannot reverse to find x or y from H(x,y)
- Collision-resistant: Different (x,y) pairs very likely produce different hashes
- Efficient: 50-100 constraints in Circom (vs 50,000+ for Keccak)

## Security Analysis

### Threat Model

#### Threat: Voter Impersonation
**Scenario:** Alice tries to vote as Bob

**Why it fails:**
- Alice doesn't know Bob's `secret`
- Even if Alice knows Bob's nullifier, she can't create the proof without secret
- Proof would fail to verify without secret

**Mitigation:** secret is unique to each voter

#### Threat: Vote Linkage
**Scenario:** Observer tries to link voter to vote

**Why it's prevented:**
1. Vote commitment reveals nothing about choice
   ```
   Hash(secret, 0) ≠ Hash(secret, 1)
   (different inputs, different outputs)
   ```
   But both are indistinguishable single hashes

2. Nullifier hash reveals voter, but no vote direction
   ```
   nullifierHash = Hash(secret, nullifier)
   (used to prevent double voting, not identify vote)
   ```

**Result:** Observer can see votes exist and who voted, but cannot infer vote direction

#### Threat: Double Voting
**Scenario:** Voter tries to vote twice on same proposal

**Why it fails:**
- First vote: nullifierHash stored on-chain
- Second vote: Same secret + nullifier → Same nullifierHash
- Contract checks: nullifierHash already used → Transaction reverts

**Note:** Nullifier is per-proposal, so same voter can vote on different proposals

#### Threat: Proof Forgery
**Scenario:** Attacker tries to create proof without knowing inputs

**Why it fails:**
- Proof system is zero-knowledge but still sound
- Cannot prove `commitment = Hash(secret, choice)` without knowing actual secret
- Cannot prove `choice ∈ {0,1}` if choice = 2 or 3 or any other value
- Verification would catch any fake proof

## Advanced Features

### Extension 1: Merkle Tree Verification
Add voter eligibility checking via Merkle proof:

```circom
input private pathElements[10];  // Merkle path
input private pathIndex[10];      // Path direction

// Verify leaf in tree
component merkleVerifier = MerkleTreeVerifier(10);
merkleVerifier.leaf <== leafCommitment;
merkleVerifier.pathElements <== pathElements;
merkleVerifier.pathIndices <== pathIndex;

// Root must match DAO's voter list
merkleVerifier.root === knownVoterListRoot;
```

### Extension 2: Weighted Voting
Prove voting weight from token balance:

```circom
input private votingWeight;  // Tokens owned
input private weighting;      // Scaling factor

// Ensure weight is in valid range
weighting >= 1;
weighting <= MAX_WEIGHT;

// Prove knowledge of weight
commitment = Hash(secret, choice, weighting);
```

### Extension 3: Rate Limiting
Prove vote is recent (not submitted too quickly):

```circom
input private blockNumber;  // When vote was made
input private nonce;         // Prevents replay

// Prove blockNumber is within valid range
blockNumber > MIN_BLOCK;
blockNumber <= block.number;
```

## Formal Specification

**Circuit Name:** `vote.circom`

**Prover:** SnarkJS Groth16 prover

**Verifier:** Solidity contract (auto-generated)

**Curve:** BN254 (Barreto-Naehrig)

**Size:** ~1000 constraints (estimated)

**Proof Size:** ~288 bytes
- a: 32 bytes (G1 point)
- b: 64 bytes (G2 point)  
- c: 32 bytes (G1 point)
- Public signals: Variable (1-2 outputs × 32 bytes)

**Verification Gas:** ~200k gas including pairing checks

## Tutorial: Creating a Proof

### Key Generation
```bash
# Generate proving key from circuit
npx snarkjs groth16 setup vote.r1cs pot12_final.ptau vote_0000.zkey
```

### Witness Generation
```bash
# Create input file: input.json
{
  "secret": "12345",
  "choice": "1",
  "nullifier": "67890"
}

# Generate witness
npx snarkjs wtns calculate vote_js/vote.wasm input.json witness.wtns
```

### Proof Generation
```bash
# Create proof
npx snarkjs groth16 prove vote_0000.zkey witness.wtns proof.json public.json
```

### Proof Verification
```bash
# Verify offline
npx snarkjs groth16 verify vk.json public.json proof.json

# Verify on-chain
# Smart contract performs verification during block execution
```

---

For implementation details, see [ARCHITECTURE.md](ARCHITECTURE.md)
For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
