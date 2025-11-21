// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IPriceOracle
 * @notice Interface for MON/USD price oracle
 * @dev Returns price with 8 decimals (e.g., $25.00 = 25_00000000)
 */
interface IPriceOracle {
    /**
     * @notice Get the latest MON/USD price
     * @return price The current price with 8 decimals
     * @return updatedAt Timestamp of last price update
     */
    function getLatestPrice() external view returns (uint256 price, uint256 updatedAt);

    /**
     * @notice Check if the oracle is functioning properly
     * @return True if oracle is operational
     */
    function isHealthy() external view returns (bool);
}
