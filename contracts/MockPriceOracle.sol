// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IPriceOracle.sol";

/**
 * @title MockPriceOracle
 * @notice Mock oracle for testing - allows manual price setting
 * @dev DO NOT USE IN PRODUCTION - for testing only
 */
contract MockPriceOracle is IPriceOracle {
    uint256 private price;
    uint256 private updatedAt;
    bool private healthy;

    constructor(uint256 initialPrice) {
        price = initialPrice;
        updatedAt = block.timestamp;
        healthy = true;
    }

    /**
     * @notice Set the MON/USD price (testing only)
     * @param newPrice Price with 8 decimals
     */
    function setPrice(uint256 newPrice) external {
        price = newPrice;
        updatedAt = block.timestamp;
    }

    /**
     * @notice Set oracle health status (testing only)
     */
    function setHealthy(bool status) external {
        healthy = status;
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function getLatestPrice() external view returns (uint256, uint256) {
        return (price, updatedAt);
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function isHealthy() external view returns (bool) {
        return healthy;
    }
}
