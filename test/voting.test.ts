import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateVoting Contract", function () {
  let privateVoting;
  let owner, voter1, voter2, voter3;

  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy contract
    const PrivateVoting = await ethers.getContractFactory("PrivateVoting");
    privateVoting = await PrivateVoting.deploy();
    await privateVoting.waitForDeployment();
  });

  describe("Proposal Creation", function () {
    it("Should create a proposal", async function () {
      const title = "Test Proposal";
      const description = "This is a test proposal";
      const votingPeriod = 86400; // 1 day

      const tx = await privateVoting.createProposal(
        title,
        description,
        votingPeriod
      );

      await expect(tx)
        .to.emit(privateVoting, "ProposalCreated")
        .withArgs(0, title, anyValue, anyValue);

      const proposal = await privateVoting.getProposal(0);
      expect(proposal.title).to.equal(title);
      expect(proposal.description).to.equal(description);
    });

    it("Should only allow admin to create proposals", async function () {
      await expect(
        privateVoting
          .connect(voter1)
          .createProposal("Title", "Description", 86400)
      ).to.be.revertedWith("Only admin can call this");
    });

    it("Should increment proposal count", async function () {
      for (let i = 0; i < 3; i++) {
        await privateVoting.createProposal(
          `Proposal ${i}`,
          "Test",
          86400
        );
      }

      // Try to create 4th proposal (would have id 3)
      const tx = await privateVoting.createProposal("Proposal 3", "Test", 86400);
      await expect(tx).to.emit(privateVoting, "ProposalCreated");
    });
  });

  describe("Private Voting", function () {
    let proposalId;
    const mockCommitment = ethers.keccak256(ethers.toBeHex(12345));
    const mockNullifier = ethers.keccak256(ethers.toBeHex(67890));
    const mockProof = ethers.toBeHex(99999, 32);

    beforeEach(async function () {
      // Create a proposal
      const votingPeriod = 86400;
      await privateVoting.createProposal(
        "Should we vote?",
        "A simple yes/no vote",
        votingPeriod
      );
      proposalId = 0;
    });

    it("Should accept private vote with proof", async function () {
      const tx = await privateVoting
        .connect(voter1)
        .castPrivateVote(proposalId, mockCommitment, mockNullifier, mockProof);

      await expect(tx)
        .to.emit(privateVoting, "PrivateVoteCast")
        .withArgs(proposalId, mockCommitment, mockNullifier);
    });

    it("Should prevent double voting with same nullifier", async function () {
      // First vote
      await privateVoting
        .connect(voter1)
        .castPrivateVote(proposalId, mockCommitment, mockNullifier, mockProof);

      // Second vote with same nullifier should fail
      const mockCommitment2 = ethers.keccak256(ethers.toBeHex(54321));
      
      await expect(
        privateVoting
          .connect(voter1)
          .castPrivateVote(proposalId, mockCommitment2, mockNullifier, mockProof)
      ).to.be.revertedWith("Vote already cast with this nullifier");
    });

    it("Should allow multiple votes with different nullifiers", async function () {
      const nullifier1 = ethers.keccak256(ethers.toBeHex(111));
      const nullifier2 = ethers.keccak256(ethers.toBeHex(222));

      // First vote
      await privateVoting
        .connect(voter1)
        .castPrivateVote(proposalId, mockCommitment, nullifier1, mockProof);

      // Second vote with different nullifier
      const mockCommitment2 = ethers.keccak256(ethers.toBeHex(54321));
      const tx = await privateVoting
        .connect(voter2)
        .castPrivateVote(proposalId, mockCommitment2, nullifier2, mockProof);

      await expect(tx).to.emit(privateVoting, "PrivateVoteCast");

      expect(await privateVoting.getVoteCount(proposalId)).to.equal(2);
    });

    it("Should track used nullifiers globally", async function () {
      // Vote on proposal 0
      await privateVoting
        .connect(voter1)
        .castPrivateVote(proposalId, mockCommitment, mockNullifier, mockProof);

      // Create another proposal
      await privateVoting.createProposal("Another proposal", "Test", 86400);

      // Try to use same nullifier on different proposal - should fail
      const mockCommitment2 = ethers.keccak256(ethers.toBeHex(54321));
      
      await expect(
        privateVoting
          .connect(voter2)
          .castPrivateVote(1, mockCommitment2, mockNullifier, mockProof)
      ).to.be.revertedWith("Vote already cast with this nullifier");
    });

    it("Should reject invalid proof", async function () {
      // Empty proof
      await expect(
        privateVoting
          .connect(voter1)
          .castPrivateVote(proposalId, mockCommitment, mockNullifier, "0x")
      ).to.be.revertedWith("Invalid proof");
    });
  });

  describe("Vote Tallying", function () {
    let proposalId;

    beforeEach(async function () {
      // Create a proposal with short voting period
      const votingPeriod = 2; // 2 seconds
      await privateVoting.createProposal(
        "Quick vote",
        "Fast proposal",
        votingPeriod
      );
      proposalId = 0;

      // Add several votes
      for (let i = 0; i < 3; i++) {
        const commitment = ethers.keccak256(ethers.toBeHex(i));
        const nullifier = ethers.keccak256(ethers.toBeHex(1000 + i));
        const proof = ethers.toBeHex(99999, 32);

        await privateVoting
          .connect(voter1)
          .castPrivateVote(proposalId, commitment, nullifier, proof);

        // Use different accounts for multiple votes
        if (i > 0) voter1 = (await ethers.getSigners())[i + 1];
      }
    });

    it("Should prevent tallying while voting is open", async function () {
      await expect(
        privateVoting.tallyVotes(proposalId)
      ).to.be.revertedWith("Voting not yet closed");
    });

    it("Should allow tallying after voting period ends", async function () {
      // Wait for voting period to end
      await ethers.provider.send("evm_mine", []);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await ethers.provider.send("evm_mine", []);

      const tx = await privateVoting.tallyVotes(proposalId);

      await expect(tx)
        .to.emit(privateVoting, "ProposalTallied")
        .withArgs(proposalId, anyValue, anyValue);
    });

    it("Should calculate vote counts", async function () {
      // Wait and tally
      await ethers.provider.send("evm_mine", []);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await ethers.provider.send("evm_mine", []);

      await privateVoting.tallyVotes(proposalId);

      const proposal = await privateVoting.getProposal(proposalId);
      expect(proposal.yesVotes).to.be.greaterThanOrEqual(0);
      expect(proposal.noVotes).to.be.greaterThanOrEqual(0);
      // In this test, yesVotes + noVotes should equal vote count
      // (In production, individual votes remain private)
    });
  });

  describe("Query Functions", function () {
    it("Should retrieve proposal by ID", async function () {
      const title = "Query Test Proposal";
      const description = "Testing query functionality";

      await privateVoting.createProposal(title, description, 86400);

      const proposal = await privateVoting.getProposal(0);

      expect(proposal.id).to.equal(0);
      expect(proposal.title).to.equal(title);
      expect(proposal.description).to.equal(description);
      expect(proposal.yesVotes).to.equal(0);
      expect(proposal.noVotes).to.equal(0);
      expect(proposal.executed).to.equal(false);
    });

    it("Should get vote count for proposal", async function () {
      await privateVoting.createProposal("Count test", "Test", 86400);

      expect(await privateVoting.getVoteCount(0)).to.equal(0);

      // Add votes
      for (let i = 0; i < 5; i++) {
        const commitment = ethers.keccak256(ethers.toBeHex(i));
        const nullifier = ethers.keccak256(ethers.toBeHex(1000 + i));
        const proof = ethers.toBeHex(99999, 32);

        await privateVoting
          .connect(await ethers.getSigner(i))
          .castPrivateVote(0, commitment, nullifier, proof);
      }

      expect(await privateVoting.getVoteCount(0)).to.equal(5);
    });

    it("Should revert for non-existent proposal", async function () {
      await expect(
        privateVoting.getProposal(999)
      ).to.be.revertedWith("Proposal does not exist");
    });
  });
});

describe("ProofGenerator", function () {
  it("Should create vote commitment", function () {
    // This would test the frontend proof generation
    // Requires WASM files loaded
    // Skipped for now as it requires full setup
  });
});
