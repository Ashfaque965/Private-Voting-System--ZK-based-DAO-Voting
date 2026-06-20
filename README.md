# Private Voting System (ZK-based DAO Voting)

## Overview

A sophisticated zero-knowledge proof-based voting system for DAOs that ensures votes remain private while proving the vote tally is correct. Uses Circom/SnarkJS for ZK-SNARKs, Solidity for smart contracts, and React for the frontend.

## 🎯 Key Features

### Privacy
- **Private Vote Commitments**: Votes are hashed and stored only as commitments
- **Secret Preservation**: Voter's secret is never revealed
- **No Vote Linking**: Cannot link a voter to their vote

### Security
- **Nullifiers**: Prevent double voting by tracking unique per-voter nullifiers
- **ZK-SNARK Proofs**: Cryptographic proofs without revealing private data
- **On-Chain Verification**: Proofs verified directly in smart contracts

### Integrity
- **Correct Tally**: System proves vote count is correct via recursive zk-SNARKs
- **Voter Eligibility**: Merkle tree verification for eligible voters
- **Immutability**: All votes logged on-chain for auditability

## 📋 System Architecture

```
┌─────────────────────────────────────────┐
│        Private Voting System            │
├─────────────────────────────────────────┤
│                                         │
│  Frontend (React + Web3)                │
│  ├─ VotingInterface.jsx                 │
│  ├─ ProposalList.jsx                    │
│  ├─ ProofGenerator.js                   │
│  └─ App.jsx                             │
│                                         │
│  ZK-SNARK Circuits (Circom)             │
│  ├─ vote.circom (voting logic)          │
│  ├─ nullifier.circom (double-vote check)│
│  └─ aggregation.circom (tally proof)    │
│                                         │
│  Smart Contracts (Solidity)             │
│  ├─ PrivateVoting.sol (main contract)   │
│  ├─ Verifier.sol (proof verification)   │
│  └─ ERC721Voting.sol (optional: NFT)    │
│                                         │
└─────────────────────────────────────────┘
```

## 🔧 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| ZK Circuit | Circom | Define voting logic |
| Proof Generation | SnarkJS | Generate zk-SNARKs |
| Hash Functions | Poseidon | Efficient hashing |
| Smart Contracts | Solidity | On-chain verification |
| Frontend | React | User interface |
| Wallet | MetaMask | Transaction signing |
| Blockchain | Ethereum (or L2s) | Vote storage |

## 🚀 Getting Started

### Prerequisites
- Node.js >= 16
- MetaMask or Web3 wallet
- Ethereum testnet (Sepolia/Goerli) with test ETH

### Installation

```bash
# Clone repository
git clone <repo-url>
cd "Private Voting System -ZK-based DAO Voting"

# Install dependencies
npm install

# Frontend
cd frontend
npm install

# Return to root
cd ..
```

### Compile Circuits

```bash
# Install Circom compiler
npm install -D circom

# Compile vote circuit
circom circuits/vote.circom --r1cs --wasm --sym

# Generate proving key (requires trusted setup)
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau
npx snarkjs powersoftau verify pot12_0001.ptau
npx snarkjs groth16 setup vote.r1cs pot12_0001.ptau vote_0000.zkey
npx snarkjs zkey verify vote.r1cs pot12_0001.ptau vote_0000.zkey
npx snarkjs zkey export verificationkey vote_0000.zkey verification_key.json

# Generate Solidity verifier
npx snarkjs zkey export solidityverifier vote_0000.zkey Verifier.sol
```

### Deploy Smart Contracts

```bash
# Using Hardhat (install if needed)
npm install hardhat

# Compile contracts
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia
```

### Run Frontend

```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`

## 📊 How It Works

### 1️⃣ Voting Phase

**User Action:**
```
User → Vote (Yes/No) → Generate zk-SNARK Proof → Submit on-chain
```

**Behind the scenes:**
1. **Generate Secret**: Create a random secret (never shared)
2. **Vote Choice**: Select Yes/No (0 or 1)
3. **Create Commitment**: `commitment = Hash(secret, choice)`
4. **Generate Proof**: 
   - Proves commitment is valid
   - Proves choice is binary (0 or 1)
   - Generates nullifier to prevent replay
5. **Submit Proof**: Send commitment + proof to smart contract
6. **On-Chain Verification**: Contract verifies proof without learning the vote

### 2️⃣ Preventing Double Voting (Nullifiers)

Each voter has a unique nullifier:
```
nullifier_hash = Hash(secret, nullifier)
```

**Verification:**
- Smart contract tracks all used `nullifier_hash` values
- If same nullifier used twice → transaction reverts
- Nullifier is unique to each voter but doesn't reveal voter identity

### 3️⃣ Vote Tallying

**Counting Votes** (In production):
- Uses **recursive zk-SNARKs** to prove vote sum
- Doesn't decode individual votes
- Proves: "Sum of all votes = X" without knowing individual votes

**Public Result**:
```
Total Yes Votes: 153
Total No Votes: 247
Proposal Result: NO (voted down)
```

## 📝 Circuit Details

### vote.circom
```circom
Inputs (Private):
  - secret: voter's secret
  - choice: 0 (No) or 1 (Yes)
  - nullifier: unique per voter

Outputs:
  - commitment: Hash(secret, choice) - stored on-chain
  - nullifierHash: Hash(secret, nullifier) - prevents double voting
```

### nullifier.circom
```circom
Ensures the nullifier is correctly formed:
  - Prevents using same voter twice
  - Cannot link to specific voter
```

## 🧪 Testing

### Unit Tests
```bash
# Test smart contracts
npm test

# Test circuits
npm run test:circuits
```

### Integration Tests
```bash
# Deploy to local testnet
npx hardhat node

# In another terminal
npx hardhat test --network localhost
```

## 🔐 Security Considerations

| Risk | Mitigation |
|------|-----------|
| Front-running | Use commit-reveal scheme |
| Proof reuse | Nullifier + nonce prevents replay |
| Circuit bugs | Audited by third parties |
| Private key loss | User responsible (not custodial) |
| Double voting | On-chain nullifier tracking |
| Voter coercion | Voter can vote multiple times (nullifiers different) |

## 📈 Scaling (Advanced)

### Layer 2 Solutions
- Deploy on Arbitrum/Optimism for lower gas costs
- Use L2 state proofs if needed

### Vote Delegation
- Allow voting power delegation via DAO token
- Implement representative voting

### Multiple Choice
- Extend circuit to support > 2 options
- Use ranked choice voting

### Off-Chain Tallying
- Move vote counting off-chain
- Use L2 optimistic rollups for cheaper tallying

## 📚 API Reference

### Smart Contract Methods

#### `createProposal(title, description, votingPeriod)`
Create a new voting proposal.

#### `castPrivateVote(proposalId, voteCommitment, nullifierHash, proof)`
Submit a private vote with zk-SNARK proof.

#### `tallyVotes(proposalId)`
Count votes and finalize proposal results.

#### `getProposal(proposalId)`
Retrieve proposal details.

## 📦 File Structure

```
Private Voting System/
├── circuits/
│   ├── vote.circom              # Main voting circuit
│   ├── nullifier.circom         # Double-vote prevention
│   └── aggregation.circom       # Vote counting proof
├── contracts/
│   ├── PrivateVoting.sol        # Main contract
│   ├── Verifier.sol             # Auto-generated verifier
│   └── Governance.sol           # Optional governance token
├── frontend/
│   ├── VotingInterface.jsx      # Vote UI
│   ├── ProposalList.jsx         # Proposal listing
│   ├── ProofGenerator.js        # Proof generation
│   ├── App.jsx                  # Main app
│   └── App.css                  # Styling
├── test/
│   ├── voting.test.js           # Contract tests
│   ├── circuits.test.js         # Circuit tests
│   └── integration.test.js      # End-to-end tests
├── docs/
│   ├── ARCHITECTURE.md          # System design
│   ├── CIRCUIT_SPEC.md          # Circuit documentation
│   └── DEPLOYMENT.md            # Deployment guide
└── README.md
```

## 🔥 Production Checklist

- [ ] Circuit audited by security firm
- [ ] Smart contracts audited
- [ ] Frontend security review
- [ ] Testnet deployment and testing
- [ ] Mainnet ceremony for trusted setup
- [ ] Gas optimization
- [ ] Monitoring and alerting setup
- [ ] User documentation complete
- [ ] Emergency pause mechanism
- [ ] Upgrade/proxy plan

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- [ ] Multi-choice voting
- [ ] Quadratic voting
- [ ] Vote delegation
- [ ] Time-weighted voting
- [ ] Cross-chain voting

## 📞 Support

For issues or questions:
1. Check existing GitHub issues
2. Review documentation
3. Open new issue with minimal reproducible example

## ⚖️ License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- Circom team for ZK-SNARK circuits
- SnarkJS library
- Ethereum community
- Security auditors

---

**🔒 Remember: Private voting is essential for democratic DAOs**
