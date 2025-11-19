// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BondingCurve.sol";
import "./ScreamToken.sol";

/**
 * @title ScreamFactory
 * @notice Factory for creating new meme tokens with bonding curves on Scream.fun
 * @dev Anyone can create a token, but fees go to configured wallets
 */
contract ScreamFactory {
    address public devWallet;
    address public rageFund;
    address public uniswapFactory;
    address public owner;

    struct TokenInfo {
        address token;
        address bondingCurve;
        address creator;
        uint256 createdAt;
        string name;
        string symbol;
    }

    TokenInfo[] public allTokens;
    mapping(address => address[]) public creatorTokens;

    event TokenCreated(
        address indexed token,
        address indexed bondingCurve,
        address indexed creator,
        string name,
        string symbol,
        uint256 tokenId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _devWallet, address _rageFund, address _uniswapFactory) {
        owner = msg.sender;
        devWallet = _devWallet;
        rageFund = _rageFund;
        uniswapFactory = _uniswapFactory;
    }

    /**
     * @notice Create a new meme token with bonding curve
     * @param name Token name
     * @param symbol Token symbol
     * @return token Address of created token
     * @return bondingCurve Address of bonding curve
     */
    function createToken(
        string memory name,
        string memory symbol
    ) external returns (address token, address bondingCurve) {
        // Deploy bonding curve (which deploys the token)
        BondingCurve curve = new BondingCurve(
            devWallet,
            rageFund,
            uniswapFactory,
            name,
            symbol
        );

        bondingCurve = address(curve);
        token = address(curve.token());

        // Store token info
        TokenInfo memory info = TokenInfo({
            token: token,
            bondingCurve: bondingCurve,
            creator: msg.sender,
            createdAt: block.timestamp,
            name: name,
            symbol: symbol
        });

        allTokens.push(info);
        creatorTokens[msg.sender].push(token);

        emit TokenCreated(token, bondingCurve, msg.sender, name, symbol, allTokens.length - 1);

        return (token, bondingCurve);
    }

    /**
     * @notice Get total number of tokens created
     */
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @notice Get tokens created by a specific address
     */
    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    /**
     * @notice Get token info by index
     */
    function getTokenInfo(uint256 index) external view returns (TokenInfo memory) {
        require(index < allTokens.length, "Invalid index");
        return allTokens[index];
    }

    /**
     * @notice Update dev wallet (only owner)
     */
    function setDevWallet(address _devWallet) external onlyOwner {
        devWallet = _devWallet;
    }

    /**
     * @notice Update RAGE fund (only owner)
     */
    function setRageFund(address _rageFund) external onlyOwner {
        rageFund = _rageFund;
    }

    /**
     * @notice Update Uniswap factory (only owner)
     */
    function setUniswapFactory(address _uniswapFactory) external onlyOwner {
        uniswapFactory = _uniswapFactory;
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
