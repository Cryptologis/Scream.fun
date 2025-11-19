// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RAGEFund
 * @notice Accumulates rage taxes and trading fees, distributes to holders
 * @dev Supports pro-rata distribution to current token holders
 */
contract RAGEFund is Ownable, ReentrancyGuard {
    // Mapping of token address => total accumulated ETH
    mapping(address => uint256) public tokenBalance;

    // Mapping of token address => total distributed ETH
    mapping(address => uint256) public totalDistributed;

    // Mapping of token address => user address => claimed amount
    mapping(address => mapping(address => uint256)) public userClaimed;

    // Mapping of token address => snapshot epoch => total supply at epoch
    mapping(address => mapping(uint256 => uint256)) public supplySnapshots;

    // Mapping of token address => current distribution epoch
    mapping(address => uint256) public currentEpoch;

    event Deposited(address indexed token, uint256 amount);
    event Distributed(address indexed token, uint256 epoch, uint256 amount);
    event Claimed(address indexed token, address indexed user, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Deposit ETH for a specific token
     * @param token The token address this deposit is for
     */
    function deposit(address token) external payable {
        require(msg.value > 0, "No ETH sent");
        tokenBalance[token] += msg.value;
        emit Deposited(token, msg.value);
    }

    /**
     * @notice Trigger distribution for a token (creates snapshot)
     * @param token The token to distribute for
     */
    function distribute(address token) external onlyOwner nonReentrant {
        uint256 amount = tokenBalance[token];
        require(amount > 0, "No balance to distribute");

        uint256 epoch = currentEpoch[token];
        IERC20 tokenContract = IERC20(token);

        // Take snapshot of total supply
        supplySnapshots[token][epoch] = tokenContract.totalSupply();

        // Move to next epoch
        currentEpoch[token] = epoch + 1;

        // Update total distributed
        totalDistributed[token] += amount;

        // Reset balance
        tokenBalance[token] = 0;

        emit Distributed(token, epoch, amount);
    }

    /**
     * @notice Calculate claimable amount for a user
     * @param token The token address
     * @param user The user address
     * @return The claimable ETH amount
     */
    function getClaimable(address token, address user) public view returns (uint256) {
        uint256 totalClaimable = 0;
        IERC20 tokenContract = IERC20(token);
        uint256 userBalance = tokenContract.balanceOf(user);

        if (userBalance == 0) return 0;

        // Calculate share from all past epochs
        uint256 currentEpochNum = currentEpoch[token];
        for (uint256 i = 0; i < currentEpochNum; i++) {
            uint256 supply = supplySnapshots[token][i];
            if (supply > 0) {
                uint256 epochDistribution = totalDistributed[token] / currentEpochNum;
                uint256 userShare = (epochDistribution * userBalance) / supply;
                totalClaimable += userShare;
            }
        }

        // Subtract already claimed
        totalClaimable -= userClaimed[token][user];

        return totalClaimable;
    }

    /**
     * @notice Claim distributed ETH
     * @param token The token address
     */
    function claim(address token) external nonReentrant {
        uint256 claimable = getClaimable(token, msg.sender);
        require(claimable > 0, "Nothing to claim");

        userClaimed[token][msg.sender] += claimable;

        (bool success, ) = msg.sender.call{value: claimable}("");
        require(success, "ETH transfer failed");

        emit Claimed(token, msg.sender, claimable);
    }

    /**
     * @notice Emergency withdraw (only owner)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 amount = tokenBalance[token];
        require(amount > 0, "No balance");

        tokenBalance[token] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    receive() external payable {
        revert("Use deposit(address) function");
    }
}
