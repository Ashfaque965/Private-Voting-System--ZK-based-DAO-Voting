const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}\n`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance < ethers.parseEther("0.1")) {
    throw new Error("❌ Insufficient balance for deployment! Need at least 0.1 ETH");
  }

  // Deploy PrivateVoting contract
  console.log("📦 Deploying PrivateVoting contract...");
  const PrivateVoting = await ethers.getContractFactory("PrivateVoting");
  const privateVoting = await PrivateVoting.deploy();
  await privateVoting.waitForDeployment();

  const votingAddress = await privateVoting.getAddress();
  console.log(`✅ PrivateVoting deployed to: ${votingAddress}\n`);

  // Save deployment addresses
  const deploymentAddresses = {
    network: hre.network.name,
    chain_id: (await ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      PrivateVoting: votingAddress,
    },
  };

  const deploymentPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentAddresses, null, 2));
  console.log(`📄 Deployment addresses saved to: ${deploymentPath}\n`);

  // Update frontend .env
  const frontendEnvPath = path.join(__dirname, "../frontend/.env.local");
  const frontendEnv = `REACT_APP_VOTING_CONTRACT=${votingAddress}
REACT_APP_NETWORK_ID=${(await ethers.provider.getNetwork()).chainId}
REACT_APP_ETHERSCAN_URL=https://sepolia.etherscan.io`;

  fs.writeFileSync(frontendEnvPath, frontendEnv);
  console.log(`🌐 Frontend environment updated: ${frontendEnvPath}\n`);

  // Create test proposal
  console.log("📋 Creating test proposal...");
  try {
    const tx = await privateVoting.createProposal(
      "Test Proposal: Should we increase DAO treasury?",
      "This is a test proposal to demonstrate private voting functionality",
      7 * 24 * 60 * 60 // 7 days
    );

    const receipt = await tx.wait();
    console.log(`✅ Test proposal created (Tx: ${receipt.hash})\n`);
  } catch (error) {
    console.log(`⚠️  Could not create test proposal: ${error.message}\n`);
  }

  // Summary
  console.log("═══════════════════════════════════════");
  console.log("✨ DEPLOYMENT COMPLETE ✨");
  console.log("═══════════════════════════════════════\n");

  console.log("📍 Contract Addresses:");
  console.log(`   PrivateVoting: ${votingAddress}\n`);

  console.log("🔗 Network:");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Chain ID: ${(await ethers.provider.getNetwork()).chainId}\n`);

  console.log("📚 Next Steps:");
  console.log("   1. Verify contract on Etherscan:");
  console.log(`      npx hardhat verify --network ${hre.network.name} ${votingAddress}\n`);

  console.log("   2. Start frontend development server:");
  console.log("      cd frontend && npm start\n");

  console.log("   3. Compile circuits (if not done):");
  console.log("      circom circuits/vote.circom --r1cs --wasm --sym\n");

  console.log("   4. Create additional proposals:");
  console.log("      npx hardhat run scripts/createProposal.js --network ", hre.network.name, "\n");

  return votingAddress;
}

main()
  .then((address) => {
    console.log("✅ Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
