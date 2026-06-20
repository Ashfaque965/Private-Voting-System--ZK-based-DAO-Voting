// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title GovernanceToken
 * @dev Optional ERC20 token for DAO governance
 * Voters should hold this token to participate
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is ERC20, Ownable {
    // Voting power per token (in this case, 1 token = 1 vote)
    uint256 public constant VOTING_POWER_PER_TOKEN = 1;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        // Mint initial supply to deployer
        _mint(msg.sender, _initialSupply * 10 ** decimals());
    }

    /**
     * @dev Mint new tokens (only owner)
     */
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @dev Get voting power of an address
     */
    function getVotingPower(address _account) public view returns (uint256) {
        return balanceOf(_account) * VOTING_POWER_PER_TOKEN;
    }
}
