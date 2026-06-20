import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import snarkjs from 'snarkjs';

/**
 * VotingInterface Component
 * Main interface for casting private votes
 */
const VotingInterface = ({ contractAddress, account, provider }) => {
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteChoice, setVoteChoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState(null);
  const [message, setMessage] = useState('');

  // Load proposals from contract
  useEffect(() => {
    loadProposals();
  }, [contractAddress]);

  const loadProposals = async () => {
    try {
      // Fetch proposals from smart contract
      setLoading(true);
      // Implementation would fetch from contract ABI
      setLoading(false);
    } catch (error) {
      setMessage(`Error loading proposals: ${error.message}`);
      setLoading(false);
    }
  };

  /**
   * Generate zk-SNARK proof for the vote
   */
  const generateVoteProof = async () => {
    try {
      setLoading(true);
      setMessage('Generating zero-knowledge proof...');

      // These would come from user input/secure storage
      const secret = Math.floor(Math.random() * (2 ** 32)); // Random secret
      const nullifier = Math.floor(Math.random() * (2 ** 32));
      const choice = voteChoice ? 1 : 0; // 1 for Yes, 0 for No

      // Create witness for the circuit
      const circuitInput = {
        secret: secret.toString(),
        choice: choice.toString(),
        nullifier: nullifier.toString()
      };

      // In production, would load actual WASM and zkey files
      // const wasmFile = require('../circuits/vote_js/vote.wasm');
      // const zkeyFile = require('../circuits/vote.zkey');

      // For now, simulate proof generation
      console.log('Generating proof with input:', circuitInput);

      // const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      //   circuitInput,
      //   wasmFile,
      //   zkeyFile
      // );

      setMessage('Proof generated successfully!');
      setProof({
        secret,
        nullifier,
        choice
      });

      return {
        secret,
        nullifier,
        choice
      };
    } catch (error) {
      setMessage(`Error generating proof: ${error.message}`);
      console.error('Proof generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cast a private vote
   */
  const castPrivateVote = async () => {
    try {
      if (!selectedProposal) {
        setMessage('Please select a proposal');
        return;
      }

      if (voteChoice === null) {
        setMessage('Please select Yes or No');
        return;
      }

      setLoading(true);
      setMessage('Casting your private vote...');

      // Generate proof
      const proofData = await generateVoteProof();
      if (!proofData) return;

      // Hash the vote commitment
      // In production: hash(secret + choice)
      const commitment = hashCommitment(proofData.secret, proofData.choice);
      const nullifierHash = hashNullifier(proofData.secret, proofData.nullifier);

      // Send to smart contract
      const signer = provider.getSigner();
      const votingContract = new ethers.Contract(
        contractAddress,
        VOTING_ABI,
        signer
      );

      const tx = await votingContract.castPrivateVote(
        selectedProposal.id,
        commitment,
        nullifierHash,
        proofData // Encoded proof
      );

      const receipt = await tx.wait();
      setMessage(`Vote cast successfully! Tx: ${receipt.transactionHash}`);

      // Clear selections
      setVoteChoice(null);
      setSelectedProposal(null);
      setProof(null);

    } catch (error) {
      setMessage(`Error casting vote: ${error.message}`);
      console.error('Vote casting error:', error);
    } finally {
      setLoading(false);
    }
  };

  const hashCommitment = (secret, choice) => {
    // In production: use Poseidon hash
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [secret, choice]
      )
    );
  };

  const hashNullifier = (secret, nullifier) => {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256'],
        [secret, nullifier]
      )
    );
  };

  return (
    <div className="voting-interface">
      <h2>Private Voting System</h2>
      
      <div className="proposal-selector">
        <h3>Select Proposal</h3>
        {proposals.map((proposal) => (
          <button
            key={proposal.id}
            onClick={() => setSelectedProposal(proposal)}
            className={selectedProposal?.id === proposal.id ? 'selected' : ''}
          >
            {proposal.title}
          </button>
        ))}
      </div>

      {selectedProposal && (
        <div className="voting-panel">
          <h3>{selectedProposal.title}</h3>
          <p>{selectedProposal.description}</p>

          <div className="vote-options">
            <button
              onClick={() => setVoteChoice(true)}
              className={voteChoice === true ? 'selected' : ''}
              disabled={loading}
            >
              Yes
            </button>
            <button
              onClick={() => setVoteChoice(false)}
              className={voteChoice === false ? 'selected' : ''}
              disabled={loading}
            >
              No
            </button>
          </div>

          <button
            onClick={castPrivateVote}
            disabled={loading || voteChoice === null}
            className="submit-vote"
          >
            {loading ? 'Processing...' : 'Cast Private Vote'}
          </button>
        </div>
      )}

      {message && <div className="message">{message}</div>}
    </div>
  );
};

const VOTING_ABI = [
  'function castPrivateVote(uint256 proposalId, bytes32 voteCommitment, bytes32 nullifierHash, bytes proof) external',
  'function getProposal(uint256 proposalId) external view returns (uint256, string, string, uint256, uint256, uint256, uint256, bool)',
  'function getVoteCount(uint256 proposalId) external view returns (uint256)'
];

export default VotingInterface;
