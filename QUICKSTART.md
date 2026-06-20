# 🚀 Quick Start Guide

## 5-Minute Setup

### 1. prerequisites
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment
```bash
# Copy template
cp .env.example .env

# Edit .env with your values:
INFURA_API_KEY=your_key_here
PRIVATE_KEY=0x...
```

### 3. Compile & Deploy
```bash
# Compile smart contracts
npm run build

# Deploy to Sepolia testnet
npm run deploy:testnet
```

### 4. Run Frontend
```bash
npm run frontend:start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What You Get

✅ **Private Voting Smart Contract**
- Create proposals
- Cast private votes
- Prevent double-voting with nullifiers

✅ **Zero-Knowledge Circuits**
- vote.circom - Private voting logic
- nullifier.circom - Anti-replay mechanism

✅ **React Frontend**
- Connect MetaMask wallet
- Create proposals
- Cast private votes
- View vote tallies

## Key Concepts

### 🔐 Privacy Guarantee
Your actual vote (Yes/No) is **never revealed** to anyone, even the contract. Only this exists:
- Vote commitment (hash of your secret + choice)
- Nullifier hash (prevents double voting)
- zk-SNARK proof (proves both are valid)

### ✅ Correctness Proof
The contract cryptographically verifies:
1. Your proof is correct
2. Your choice is binary (0 or 1)
3. You haven't voted before (nullifier check)

### 🎯 How It Works

```
You → Enter vote choice → 
  Generate random secret → 
  Create proof of (secret, choice) → 
  Submit commitment + proof to blockchain
  
Smart Contract → Verify proof → 
  Check nullifier not used → 
  Store commitment → 
  ✅ Vote recorded privately!
```

## First Vote Steps

1. **Connect Wallet**
   - Click "Connect Wallet"
   - Choose MetaMask/other wallet
   - Approve connection
   - Ensure you're on Sepolia testnet

2. **Select Proposal**
   - List of active proposals appears
   - Click on the one you want to vote on

3. **Cast Vote**
   - Choose "Yes" or "No"
   - Click "Cast Private Vote"
   - Approve MetaMask transaction
   - Wait for confirmation

4. **Vote is Private**
   - Your commitment is stored on-chain
   - But no one knows which way you voted!

## Testing

```bash
# Run contract tests
npm test

# Run circuit tests
npm run test:circuits
```

## Advanced Setup (Optional)

### Deploy on Different Network

```bash
# Arbitrum (cheaper gas)
npm run deploy:arbitrum

# Optimism
npm run deploy:optimism

# Mainnet (⚠️ use real money)
npm run deploy:mainnet
```

### Compile Circuits Locally

```bash
# Install Circom if needed
# https://docs.circom.io/getting-started/installation/

# Compile
circom circuits/vote.circom --r1cs --wasm --sym

# Generate keys (2-5 minutes)
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau
npx snarkjs groth16 setup vote.r1cs pot12_0001.ptau vote_0000.zkey
npx snarkjs zkey export solidityverifier vote_0000.zkey contracts/Verifier.sol
```

## Troubleshooting

### "MetaMask not found"
- Install MetaMask: https://metamask.io
- Set network to Sepolia testnet

### "Insufficient balance"
- Get free Sepolia ETH: https://www.sepolia-faucet.io
- Need ~0.1 ETH minimum

### "Proof generation failed"
- Ensure frontend files include WASM
- Check browser console for errors
- Verify zkey file is accessible

### Contract doesn't work
- Verify contract is deployed: `npx hardhat run scripts/deploy.js --network sepolia`
- Check contract address in frontend .env
- Ensure you're on correct testnet

## Common Issues

| Issue | Solution |
|-------|----------|
| "Function not found" | Recreate frontend .env, restart dev server |
| "Proof failed" | Clear browser cache, reload page |
| "No proposals" | Create proposal: `npx hardhat run scripts/createProposal.js` |
| "Already voted" | Contract tracks nullifiers, you need different secret |

## Next Steps

1. **Customize**
   - Modify proposal details in contract
   - Change voting period
   - Add governance token requirement

2. **Scale**
   - Deploy on Arbitrum/Optimism for cheaper votes
   - Implement vote delegation
   - Add multi-choice voting

3. **Audit**
   - Get circuit audit
   - Security review of contracts
   - Load testing

4. **Launch**
   - Mainnet deployment
   - Community voting phase
   - Monitor and maintain

## Resources

📚 **Documentation**
- [README](../README.md) - Full documentation
- [ARCHITECTURE](../docs/ARCHITECTURE.md) - System design
- [CIRCUIT_SPEC](../docs/CIRCUIT_SPEC.md) - ZK circuits
- [DEPLOYMENT](../docs/DEPLOYMENT.md) - Production guide

🔗 **External Links**
- [Circom Docs](https://docs.circom.io/)
- [SnarkJS](https://github.com/iden3/snarkjs)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Ethers.js](https://docs.ethers.org/)

💡 **Learning**
- Zero-Knowledge Proofs: https://blog.cryptographyengineering.com/2014/11/27/zero-knowledge-proofs-illustrated-primer/
- Circom Tutorial: https://github.com/iden3/circom_examples
- DAO Voting: https://ethereum.org/en/dao/

## Support

- Check GitHub issues
- Review documentation
- Open new issue with details

## 🔥 Remember

> **Private voting is essential for democratic governance. Use this power responsibly.**

---

Happy voting! 🗳️
