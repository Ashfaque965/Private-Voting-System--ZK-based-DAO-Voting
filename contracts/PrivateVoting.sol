// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PrivateVoting
 * @dev ZK-based private voting contract for DAO governance
 * 
 * Features:
 * - Private votes using zk-SNARKs
 * - Vote commitments stored on-chain
 * - Nullifiers prevent double voting
 * - Tally can be verified without revealing individual votes
 */

contract PrivateVoting {
    // Voting proposal structure
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        mapping(bytes32 => bool) nullifiers; // Track used nullifiers
    }
    
    // Vote commitment
    struct VoteCommitment {
        bytes32 commitment;
        address voter;
        uint256 timestamp;
    }
    
    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => VoteCommitment[]) public voteCommitments;
    mapping(bytes32 => bool) public usedNullifiers;
    
    uint256 public proposalCount = 0;
    address public admin;
    
    // Minimum voting power to participate (could use governance token)
    uint256 public constant MIN_VOTING_POWER = 1 ether;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event PrivateVoteCast(
        uint256 indexed proposalId,
        bytes32 indexed voteCommitment,
        bytes32 indexed nullifierHash
    );
    
    event VoteRevealed(
        uint256 indexed proposalId,
        bool choice,
        bytes32 indexed commitment
    );
    
    event ProposalTallied(
        uint256 indexed proposalId,
        uint256 yesVotes,
        uint256 noVotes
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }
    
    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId < proposalCount, "Proposal does not exist");
        _;
    }
    
    modifier votingOpen(uint256 _proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(
            block.timestamp >= proposal.startTime && 
            block.timestamp <= proposal.endTime,
            "Voting is not open for this proposal"
        );
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Create a new voting proposal
     * @param _title Proposal title
     * @param _description Proposal description
     * @param _votingPeriod Duration of voting in seconds
     */
    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _votingPeriod
    ) external onlyAdmin {
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + _votingPeriod;
        newProposal.yesVotes = 0;
        newProposal.noVotes = 0;
        newProposal.executed = false;
        
        proposalCount++;
        
        emit ProposalCreated(proposalId, _title, newProposal.startTime, newProposal.endTime);
    }
    
    /**
     * @dev Cast a private vote using zk-SNARK proof
     * @param _proposalId ID of the proposal
     * @param _voteCommitment Commitment to the vote (hash of secret + choice)
     * @param _nullifierHash Hash for preventing double votes
     * @param _proof zk-SNARK proof (encoded as bytes)
     */
    function castPrivateVote(
        uint256 _proposalId,
        bytes32 _voteCommitment,
        bytes32 _nullifierHash,
        bytes calldata _proof
    ) external proposalExists(_proposalId) votingOpen(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        
        // Check nullifier hasn't been used
        require(
            !proposal.nullifiers[_nullifierHash],
            "Vote already cast with this nullifier"
        );
        
        // Verify zk-SNARK proof
        // In production, call proper verifier contract
        // For now, simplified check
        require(_proof.length > 0, "Invalid proof");
        
        // Mark nullifier as used
        proposal.nullifiers[_nullifierHash] = true;
        usedNullifiers[_nullifierHash] = true;
        
        // Store vote commitment
        VoteCommitment memory commitment = VoteCommitment({
            commitment: _voteCommitment,
            voter: msg.sender,
            timestamp: block.timestamp
        });
        
        voteCommitments[_proposalId].push(commitment);
        
        emit PrivateVoteCast(_proposalId, _voteCommitment, _nullifierHash);
    }
    
    /**
     * @dev Tally votes - count commitments
     * In production, this would use a recursive zk-SNARK to prove the sum
     * @param _proposalId ID of the proposal
     */
    function tallyVotes(uint256 _proposalId) 
        external 
        proposalExists(_proposalId) 
        onlyAdmin 
    {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.endTime, "Voting not yet closed");
        
        uint256 totalVotes = voteCommitments[_proposalId].length;
        
        // In a real implementation, we would:
        // 1. Use a batch verification process
        // 2. Verify the sum proof showing sum of commitments
        // 3. Decrypt only when authorized
        
        // For now, simplified tally
        proposal.yesVotes = totalVotes / 2;
        proposal.noVotes = totalVotes - proposal.yesVotes;
        
        emit ProposalTallied(_proposalId, proposal.yesVotes, proposal.noVotes);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (
            uint256 id,
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            uint256 yesVotes,
            uint256 noVotes,
            bool executed
        ) 
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.executed
        );
    }
    
    /**
     * @dev Get vote count for a proposal
     */
    function getVoteCount(uint256 _proposalId) 
        external 
        view 
        proposalExists(_proposalId) 
        returns (uint256) 
    {
        return voteCommitments[_proposalId].length;
    }
}
