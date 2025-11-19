// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CustomUniswapV2Pair.sol";

/**
 * @title CustomUniswapV2Factory
 * @notice Factory for creating custom fee-enabled AMM pairs
 * @dev Creates pairs with 0.3% total fee (0.15% dev, 0.10% RAGE, 0.05% buyback)
 */
contract CustomUniswapV2Factory {
    address public feeTo; // Dev wallet
    address public communityFeeTo; // RAGE fund
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        // Deploy new pair
        CustomUniswapV2Pair newPair = new CustomUniswapV2Pair();
        pair = address(newPair);

        // Initialize pair
        newPair.initialize(token0, token1);

        // Set fee recipients if configured
        if (feeTo != address(0)) {
            newPair.setFeeTo(feeTo);
        }
        if (communityFeeTo != address(0)) {
            newPair.setCommunityFeeTo(communityFeeTo);
        }

        // Store pair
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "FORBIDDEN");
        feeTo = _feeTo;
    }

    function setCommunityFeeTo(address _communityFeeTo) external {
        require(msg.sender == feeToSetter, "FORBIDDEN");
        communityFeeTo = _communityFeeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "FORBIDDEN");
        feeToSetter = _feeToSetter;
    }

    /**
     * @notice Update fee recipients for an existing pair
     */
    function updatePairFees(address pair) external {
        require(msg.sender == feeToSetter, "FORBIDDEN");
        CustomUniswapV2Pair(pair).setFeeTo(feeTo);
        CustomUniswapV2Pair(pair).setCommunityFeeTo(communityFeeTo);
    }
}
