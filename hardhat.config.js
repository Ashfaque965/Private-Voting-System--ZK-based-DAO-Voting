require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://localhost:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Local testing network
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY || ""}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY || ""}`,
      accounts: [PRIVATE_KEY],
      chainId: 1,
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 42161,
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      accounts: [PRIVATE_KEY],
      chainId: 10,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};
