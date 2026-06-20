# Architecture Guide

## System Overview

The Private Voting System uses zero-knowledge proofs to enable private voting while maintaining cryptographic proof that results are correct.

## Data Flow

### 1. Vote Creation

```
User Input
  ↓
Generate Random Secret
  ↓
Create Vote Commitment = H(secret, choice)
  ↓
Generate Nullifier = H(secret, nonce)
  ↓
Create zk-SNARK Proof
  └─ Proves: "I know secret, choice where H(secret, choice) = commitment"
  └─ And: "choice ∈ {0,1}"
  └─ Without revealing either
  ↓
Submit to Smart Contract
```

### 2. On-Chain Verification

```
Smart Contract Receives:
  - voteCommitment (public)
  - nullifierHash (public)
  - proof (private ZK proof)
  
Verification Steps:
  1. Check nullifierHash not used before
  2. Verify zk-SNARK proof with Verifier contract
  3. If all valid:
     a. Store voteCommitment
     b. Mark nullifierHash as used
     c. Emit PrivateVoteCast event
  4. If invalid: revert transaction
```

### 3. Vote Tallying

```
After Voting Period Closes:
  ↓
Call tallyVotes(proposalId)
  ↓
Count stored commitments
  ↓
Generate aggregate proof (optional)
  └─ Proves: "Sum of all votes verified"
  ↓
Emit ProposalTallied event
  ↓
Results visible to all (without individual votes)
```

## Circuit Architecture

### vote.circom

```
┌─────────────────────────────────────┐
│        Private Vote Circuit         │
├─────────────────────────────────────┤
│                                     │
│  Private Inputs:                    │
│  • secret (32-bit)                  │
│  • choice (1-bit: 0 or 1)           │
│  • nullifier (32-bit)               │
│                                     │
│  Constraints:                       │
│  1. choice * (choice - 1) = 0       │
│     Ensures choice ∈ {0,1}          │
│                                     │
│  2. out = Poseidon(secret, choice)  │
│     Vote commitment                 │
│                                     │
│  3. out2 = Poseidon(secret, nullif.)│
│     Nullifier hash                  │
│                                     │
│  Public Outputs:                    │
│  • commitment                       │
│  • nullifierHash                    │
│                                     │
└─────────────────────────────────────┘
```

### Circuit Constraints

For a valid proof, prover must satisfy:

1. **Binary Choice**: `choice * (choice - 1) = 0`
   - Only satisfied if choice = 0 or 1

2. **Commitment Validity**: Output commitment must hash to known value

3. **Nullifier Generation**: Nullifier must be correctly formed

## Smart Contract State

```solidity
struct Proposal {
    uint256 id;
    string title;
    string description;
    uint256 startTime;
    uint256 endTime;
    uint256 yesVotes;
    uint256 noVotes;
    bool executed;
    mapping(bytes32 => bool) nullifiers;  // Track used nullifiers
}

mapping(uint256 => Proposal) proposals;
mapping(bytes32 => bool) usedNullifiers;  // Global tracking
```

## Proof Generation Flow

```javascript
// Frontend
const proofGenerator = new ProofGenerator()

// 1. Initialize circuits
await proofGenerator.initialize(
  'vote.wasm',
  'vote.zkey'
)

// 2. Create input
const input = {
  secret: userSecret,      // Private - never shared
  choice: voteChoice,      // Private - only in proof
  nullifier: userNullifier // Private - only in proof
}

// 3. Generate proof
const { proof, publicSignals } = 
  await proofGenerator.generateProof(input)
// Returns:
// - proof: zk-SNARK proof
// - publicSignals[0]: commitment (public input)
// - publicSignals[1]: nullifierHash (public input)

// 4. Encode for Solidity
const encodedProof = ProofGenerator.encodeProof(proof)

// 5. Submit to contract
await votingContract.castPrivateVote(
  proposalId,
  commitment,
  nullifierHash,
  encodedProof
)
```

## Security Analysis

### Voter Privacy

| Data | Visible To | Hidden From |
|------|----------|----------|
| Public Address | Everyone | None |
| Vote Commitment | Blockchain | Derived vote meaning |
| Nullifier Hash | Blockchain | Voter identity |
| Secret | Only voter | Everyone (not even validator) |
| Choice | Only voter | Everyone (not even validator) |

### Attack Vectors & Mitigations

#### 1. Double Voting
- **Attack**: Vote twice with different secrets
- **Mitigation**: Nullifiers uniquely identify voter
- **Limitation**: Nullifiers derived from secret, so voter can vote multiple times if they have multiple secrets

#### 2. Proof Replay
- **Attack**: Reuse an old proof
- **Mitigation**: Nullifier hash tracked on-chain
- **Result**: Same proof can only be submitted once

#### 3. Front-Running
- **Attack**: See mempool vote, submit contradicting vote first
- **Mitigation**: Votes are private even in mempool (encrypted)
- **Optional**: Use encrypted mempool (MEV-resistant L2s)

#### 4. Circuit Bugs
- **Attack**: Exploit flaw in circuit logic
- **Mitigation**: 
  - Circuit audits by third parties
  - Formal verification if possible
  - Bounds checking on all inputs

#### 5. Collusion
- **Attack**: Multiple voters share secrets to identify votes
- **Mitigation**: No inherent protection (acceptable for voting)
- **Note**: Voter coercion is general democracy risk

## Gas Optimization

### Current Costs

| Operation | Gas | Notes |
|-----------|-----|-------|
| createProposal | ~50k | Once per proposal |
| castPrivateVote | ~150k | Per vote + proof verification |
| tallyVotes | ~50k + variable | Once per proposal |

### Optimizations

1. **Batch Proof Verification**: Verify multiple proofs together
2. **Use L2**: Deploy on Optimism/Arbitrum for 10x cheaper
3. **Commit-Reveal Separation**: Separate into two transactions if needed
4. **Circuit Optimization**: Simplify constraints if possible

## Scalability

### Current (Mainnet)
- ~20 votes per block (Ethereum)
- Cost: ~$3,000 per vote at $2k ETH + 150k gas

### With Optimism L2
- Similar throughput, cost: ~$0.30 per vote
- Batched verification: ~$0.10 per vote

### Rollup Aggregation
- Off-chain proof aggregation via recursive zk-SNARKs
- Cost: ~$0.01 per vote

## Future Enhancements

### Multi-Choice Voting
Extend circuit to prove choice ∈ {0, 1, 2, ..., n}

### Quadratic Voting
Prove voter_weight² where weight comes from token balance

### Vote Delegation
Use nullifiers to track delegated voting rights

### Time-Weighted Voting
Proof that vote weight ∝ token holding duration

### Cross-Chain Voting
Synchronize voting across multiple chains

---

See [CIRCUIT_SPEC.md](CIRCUIT_SPEC.md) for detailed circuit documentation.
See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.
