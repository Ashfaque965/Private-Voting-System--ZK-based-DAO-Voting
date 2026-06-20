import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import VotingInterface from './VotingInterface';
import ProposalList from './ProposalList';
import './App.css';

/**
 * Main App Component
 * Handles wallet connection and routing
 */
function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contractAddress, setContractAddress] = useState(
    process.env.REACT_APP_VOTING_CONTRACT || '0x0'
  );
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if wallet is already connected
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
          connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);

      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask or another Web3 wallet');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Create provider
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethProvider.getSigner();
      const userAccount = await signer.getAddress();

      // Get chain ID
      const network = await ethProvider.getNetwork();

      setProvider(ethProvider);
      setAccount(userAccount);
      setChainId(network.chainId);
      setConnected(true);

      console.log('Connected to wallet:', userAccount);
      console.log('Chain ID:', network.chainId);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectWallet();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setConnected(false);
    console.log('Wallet disconnected');
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🔐 Private Voting System</h1>
          <p>ZK-based DAO Voting with Privacy</p>
        </div>

        <div className="wallet-section">
          {connected ? (
            <div className="wallet-info">
              <span className="account">{account?.substring(0, 6)}...{account?.substring(-4)}</span>
              <span className="chain-id">Chain: {chainId}</span>
              <button onClick={disconnectWallet} className="disconnect-btn">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={loading}
              className="connect-btn"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {!connected ? (
          <div className="not-connected">
            <h2>Please Connect Your Wallet</h2>
            <p>Connect to a Web3 wallet to participate in private voting</p>
            <button onClick={connectWallet} className="large-btn">
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="content-container">
            <aside className="sidebar">
              <ProposalList
                contractAddress={contractAddress}
                provider={provider}
              />
            </aside>

            <section className="main-content">
              <VotingInterface
                contractAddress={contractAddress}
                account={account}
                provider={provider}
              />
            </section>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>🔥 ZK-SNARK Private Voting • Nullifiers Prevent Double Voting</p>
        <p style={{ fontSize: '0.9em', marginTop: '5px' }}>
          Contract: {contractAddress}
        </p>
      </footer>
    </div>
  );
}

export default App;
