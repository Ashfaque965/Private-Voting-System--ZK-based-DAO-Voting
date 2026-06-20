import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const ProposalList = ({ contractAddress, provider }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contractAddress && provider) {
      fetchProposals();
    }
  }, [contractAddress, provider]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      
      const votingContract = new ethers.Contract(
        contractAddress,
        VOTING_ABI,
        provider
      );

      // Fetch proposal count first
      // In production, would need to implement getAllProposals or similar
      const proposalCount = 0; // Placeholder

      const proposalsList = [];
      
      // Fetch each proposal
      for (let i = 0; i < proposalCount; i++) {
        const proposal = await votingContract.getProposal(i);
        proposalsList.push({
          id: proposal[0],
          title: proposal[1],
          description: proposal[2],
          startTime: Number(proposal[3]),
          endTime: Number(proposal[4]),
          yesVotes: Number(proposal[5]),
          noVotes: Number(proposal[6]),
          executed: proposal[7]
        });
      }

      setProposals(proposalsList);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVotingActive = (proposal) => {
    const now = Math.floor(Date.now() / 1000);
    return now >= proposal.startTime && now <= proposal.endTime;
  };

  const timeRemaining = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;

    if (diff <= 0) return 'Voting ended';
    if (diff < 60) return `${diff}s remaining`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m remaining`;
    return `${Math.floor(diff / 3600)}h remaining`;
  };

  return (
    <div className="proposal-list">
      <h2>Active Proposals</h2>
      
      {loading && <p>Loading proposals...</p>}
      
      {proposals.length === 0 && !loading && (
        <p className="no-proposals">No proposals found</p>
      )}

      <div className="proposals">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className={`proposal-item ${isVotingActive(proposal) ? 'active' : 'ended'}`}
          >
            <h3>{proposal.title}</h3>
            <p className="description">{proposal.description}</p>
            
            <div className="status">
              {isVotingActive(proposal) ? (
                <span className="active-badge">Active</span>
              ) : (
                <span className="ended-badge">Ended</span>
              )}
              <span className="time">{timeRemaining(proposal.endTime)}</span>
            </div>

            <div className="vote-stats">
              <div className="stat">
                <span className="label">Yes:</span>
                <span className="value">{proposal.yesVotes}</span>
              </div>
              <div className="stat">
                <span className="label">No:</span>
                <span className="value">{proposal.noVotes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={fetchProposals} disabled={loading} className="refresh-btn">
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
};

const VOTING_ABI = [
  'function getProposal(uint256 proposalId) external view returns (uint256, string, string, uint256, uint256, uint256, uint256, bool)',
];

export default ProposalList;
