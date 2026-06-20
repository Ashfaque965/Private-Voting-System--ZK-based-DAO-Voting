# Deployment Guide

## Prerequisites

- Node.js >= 16 with npm
- Hardhat installed: `npm install -D hardhat`
- MetaMask or hardware wallet
- Testnet ETH (Sepolia recommended)
- Git

## Step 1: Environment Setup

Create `.env` file in project root:

```env
# Ethereum RPC Provider (Infura, Alchemy, etc.)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Private key for deployment account (🔒 KEEP SECRET)
PRIVATE_KEY=0x...

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# Contract deployment addresses
VOTING_CONTRACT_ADDRESS=0x...
```

⚠️ **NEVER commit `.env` to Git!**

## Step 2: Compile Smart Contracts

```bash
# Install dependencies
npm install

# Compile all contracts
npx hardhat compile

# Output: artifacts/ folder with ABIs
```

## Step 3: Circuit Preparation

### Install Circom

```bash
# On Ubuntu/WSL
wget https://github.com/iden3/circom/releases/download/v2.1.0/circom-linux-amd64
chmod +x circom-linux-amd64

# Add to PATH or use full path
```

### Compile Circuits

```bash
# Compile vote circuit
circom circuits/vote.circom --r1cs --wasm --sym

# Output:
# - vote.r1cs (circuit constraint system)
# - vote_js/vote.wasm (WASM for proof generation)
# - vote.sym (symbol table)
```

### Generate Proving Keys (Trusted Setup)

```bash
# 1. Create initial powers of tau file
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau

# 2. Contribute randomness (interactive - add entropy)
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="Contribution 1" --entropy="random text here"

# 3. Verify contributions
npx snarkjs powersoftau verify pot12_0001.ptau

# 4. Create circuit-specific zkey
npx snarkjs groth16 setup vote.r1cs pot12_0001.ptau vote_0000.zkey

# 5. Verify zkey
npx snarkjs zkey verify vote.r1cs pot12_0001.ptau vote_0000.zkey

# 6. Export Solidity verifier (auto-generates Verifier.sol)
npx snarkjs zkey export solidityverifier vote_0000.zkey contracts/Verifier.sol

# 7. Export verification key (for frontend)
npx snarkjs zkey export verificationkey vote_0000.zkey vk.json

# 8. Export WASM and zkey for JavaScript (frontend)
cp vote_js/vote.wasm frontend/public/vote.wasm
cp vote_0000.zkey frontend/public/vote_0000.zkey
```

## Step 4: Deploy to Testnet

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying PrivateVoting contract...");

  const privateVoting = await hre.ethers.deployContract("PrivateVoting");
  await privateVoting.waitForDeployment();

  const address = await privateVoting.getAddress();
  console.log("PrivateVoting deployed to:", address);

  // Save address for frontend
  const fs = require('fs');
  fs.writeFileSync(
    'frontend/.env.local',
    `REACT_APP_VOTING_CONTRACT=${address}\n`
  );

  console.log("✅ Deployment complete!");
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Deploy:

```bash
# To Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Output: Contract address like 0x742d35Cc6634C0532925a3b844Bc9e7595f42e0
```

## Step 5: Verify Contract on Etherscan

```bash
npx hardhat verify \
  --network sepolia \
  CONTRACT_ADDRESS
```

## Step 6: Frontend Configuration

Update `frontend/.env.local`:

```env
REACT_APP_VOTING_CONTRACT=0x742d35Cc6634C0532925a3b844Bc9e7595f42e0
REACT_APP_NETWORK_ID=11155111
REACT_APP_ETHERSCAN_URL=https://sepolia.etherscan.io
```

Copy WASM and zkey files:

```bash
# From project root
cp frontend/public/vote.wasm frontend/public/
cp frontend/public/vote_0000.zkey frontend/public/

# Verify files exist
ls -la frontend/public/*.wasm
ls -la frontend/public/*.zkey
```

## Step 7: Test Deployment

```bash
# Start frontend
cd frontend
npm start

# In browser:
# 1. Go to localhost:3000
# 2. Connect MetaMask to Sepolia
# 3. Create a test proposal
# 4. Cast a test vote
```

## Step 8: Create Initial Proposal

```bash
# Create helper script
cat > scripts/createProposal.js << 'EOF'
const hre = require("hardhat");

async function main() {
  const votingAddress = process.env.VOTING_CONTRACT_ADDRESS;
  const voting = await hre.ethers.getContractAt("PrivateVoting", votingAddress);

  const tx = await voting.createProposal(
    "Should we increase DAO treasury allocation?",
    "Proposal to increase treasury for new initiatives",
    86400 * 7  // 7 days
  );

  await tx.wait();
  console.log("✅ Proposal created!");
}

main().catch(console.error);
EOF

# Run it
VOTING_CONTRACT_ADDRESS=0x... npx hardhat run scripts/createProposal.js --network sepolia
```

## Deployment Checklist

- [ ] `.env` file created with correct network URL and private key
- [ ] Contracts compile without errors
- [ ] Circom circuits compiled successfully
- [ ] Powers of tau ceremony completed
- [ ] Verification keys generated
- [ ] Solidity verifier generated
- [ ] Contracts deployed to testnet
- [ ] Contract verified on Etherscan
- [ ] Frontend environment variables configured
- [ ] WASM and zkey files copied to frontend
- [ ] Test proposal created
- [ ] Test vote cast successfully
- [ ] Vote commitment stored on-chain
- [ ] Gas optimization verified

## Mainnet Deployment (⚠️ CAUTION)

For mainnet deployment:

1. **Conduct full security audit** of:
   - Circuit logic
   - Smart contracts
   - Frontend code

2. **Mainnet trusted setup ceremony**:
   - Coordinate public ceremony for powers of tau
   - Multiple independent contributors
   - Document all participants

3. **Multi-sig deployment**:
   - Use multi-sig wallet for contract deployment
   - Require multiple signers

4. **Phase 1 launch**:
   - Start with small voting periods
   - Monitor for issues
   - Gradually increase participation

5. **Emergency procedures**:
   - Implement pause mechanism
   - Set upgrade proxy if needed

## Testnet Addresses (Sepolia)

Common testnet faucets:
- Sepolia Faucet: https://www.sepolia-faucet.io
- Alchemy Faucet: https://www.alchemy.com/faucets

## Troubleshooting

### Error: "Invalid private key"
- Check PRIVATE_KEY in `.env` starts with 0x
- Ensure key is from account with testnet ETH

### Circuit compilation fails
- Ensure Circom is in PATH: `which circom`
- Check circuit syntax: `circom --version`

### Proof generation fails in frontend
- Verify WASM file is loaded
- Check browser console for errors
- Ensure zkey file is accessible

### Contract verification fails
- Wait 30 seconds after deployment
- Check Etherscan API key
- Verify constructor arguments match

## Monitoring Deployment

```bash
# Check contract status
curl https://api.etherscan.io/api \
  ?module=contract \
  &action=getsourcecode \
  &address=0x... \
  &apikey=YourApiKeyToken

# Monitor transactions
curl https://api.etherscan.io/api \
  ?module=account \
  &action=txlist \
  &address=0x... \
  &startblock=0 \
  &endblock=99999999 \
  &apikey=YourApiKeyToken
```

## Rollback Procedures

If issues detected:

```bash
# Pause voting
npx hardhat run scripts/pause.js --network sepolia

# Investigate
# - Check transaction logs
# - Review circuit/contract logic
# - Fix bugs

# Redeploy to new address
npm run deploy:testnet

# Update frontend .env with new address
```

---

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details.
