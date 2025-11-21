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
    address public wmon;                 // Wrapped MON for Uniswap pairs
    address public developmentFund;      // 25% of voting revenue for protocol development
    address public communityTreasury;    // 50% of voting revenue for DAO-controlled rewards
    address public owner;

    struct TokenInfo {
        address token;
        address bondingCurve;
        address creator;
        uint256 createdAt;
        string name;
        string symbol;
    }

    struct VoteStats {
        uint256 dailyScreams;       // Screams today
        uint256 totalScreams;       // All-time screams
        uint256 lastDailyReset;     // Last daily reset timestamp
    }

    struct UserVote {
        uint256 lastVoteTime;       // Last vote timestamp for cooldown
        uint256 consecutiveDays;    // Streak counter
        uint256 lastVoteDay;        // Day number of last vote
    }

    TokenInfo[] public allTokens;
    mapping(address => address[]) public creatorTokens;

    // Voting system
    mapping(address => VoteStats) public tokenVotes;           // token => vote stats
    mapping(address => mapping(address => UserVote)) public userVotes; // user => token => vote data

    uint256 public constant VOTE_FEE = 0.0005 ether;           // 0.0005 MON per scream (native token)
    uint256 public constant VOTE_COOLDOWN = 24 hours;          // Once per 24h per token
    uint256 public constant DAILY_RESET_TIME = 1 days;         // Daily contest reset

    event TokenCreated(
        address indexed token,
        address indexed bondingCurve,
        address indexed creator,
        string name,
        string symbol,
        uint256 tokenId
    );

    event TokenScreamed(
        address indexed token,
        address indexed voter,
        uint256 screamPower,      // Vote weight (1x, 2x, etc)
        uint256 streakBonus,      // Consecutive days
        uint256 dailyTotal,
        uint256 allTimeTotal
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _devWallet,
        address _rageFund,
        address _uniswapFactory,
        address _wmon,
        address _developmentFund,
        address _communityTreasury
    ) {
        owner = msg.sender;
        devWallet = _devWallet;
        rageFund = _rageFund;
        uniswapFactory = _uniswapFactory;
        wmon = _wmon;
        developmentFund = _developmentFund;
        communityTreasury = _communityTreasury;
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
            wmon,
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
     * @notice Update WMON address (only owner)
     */
    function setWMON(address _wmon) external onlyOwner {
        wmon = _wmon;
    }

    /**
     * @notice Update development fund (only owner)
     */
    function setDevelopmentFund(address _developmentFund) external onlyOwner {
        developmentFund = _developmentFund;
    }

    /**
     * @notice Update community treasury (only owner)
     */
    function setCommunityTreasury(address _communityTreasury) external onlyOwner {
        communityTreasury = _communityTreasury;
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Scream for a token (vote/support it)
     * @param tokenAddress The token to scream for
     */
    function screamForToken(address tokenAddress) external payable {
        require(msg.value >= VOTE_FEE, "Insufficient vote fee");
        require(tokenAddress != address(0), "Invalid token");

        UserVote storage userVote = userVotes[msg.sender][tokenAddress];
        VoteStats storage stats = tokenVotes[tokenAddress];

        // Check cooldown
        require(
            block.timestamp >= userVote.lastVoteTime + VOTE_COOLDOWN,
            "Cooldown active - wait 24h"
        );

        // Reset daily stats if needed
        if (block.timestamp >= stats.lastDailyReset + DAILY_RESET_TIME) {
            stats.dailyScreams = 0;
            stats.lastDailyReset = block.timestamp;
        }

        // Calculate current day number
        uint256 currentDay = block.timestamp / DAILY_RESET_TIME;
        uint256 lastDay = userVote.lastVoteDay;

        // Update streak (consecutive days voting for this token)
        if (currentDay == lastDay + 1) {
            // Consecutive day - increase streak
            userVote.consecutiveDays++;
        } else if (currentDay == lastDay) {
            // Same day (shouldn't happen due to cooldown, but just in case)
            revert("Already voted today");
        } else {
            // Streak broken - reset to 1
            userVote.consecutiveDays = 1;
        }

        // Calculate scream power with bonuses
        uint256 screamPower = 1;

        // Holder bonus: 2x if user holds tokens
        ScreamToken token = ScreamToken(tokenAddress);
        if (token.balanceOf(msg.sender) > 0) {
            screamPower = screamPower * 2;
        }

        // Streak multiplier (caps at 10x)
        uint256 streakBonus = userVote.consecutiveDays;
        if (streakBonus > 10) streakBonus = 10;
        screamPower = screamPower * streakBonus;

        // Update stats
        stats.dailyScreams += screamPower;
        stats.totalScreams += screamPower;

        // Update user vote data
        userVote.lastVoteTime = block.timestamp;
        userVote.lastVoteDay = currentDay;

        // Distribute vote fees: 25% dev, 25% development fund, 50% community treasury
        uint256 quarterFee = msg.value / 4;
        (bool s1, ) = devWallet.call{value: quarterFee}("");
        (bool s2, ) = developmentFund.call{value: quarterFee}("");
        (bool s3, ) = communityTreasury.call{value: msg.value / 2}("");
        require(s1 && s2 && s3, "Fee transfer failed");

        emit TokenScreamed(
            tokenAddress,
            msg.sender,
            screamPower,
            userVote.consecutiveDays,
            stats.dailyScreams,
            stats.totalScreams
        );
    }

    /**
     * @notice Get vote stats for a token
     */
    function getTokenVoteStats(address tokenAddress)
        external
        view
        returns (
            uint256 dailyScreams,
            uint256 totalScreams,
            uint256 lastDailyReset
        )
    {
        VoteStats memory stats = tokenVotes[tokenAddress];
        return (stats.dailyScreams, stats.totalScreams, stats.lastDailyReset);
    }

    /**
     * @notice Get user's vote data for a specific token
     */
    function getUserVoteData(address user, address tokenAddress)
        external
        view
        returns (
            uint256 lastVoteTime,
            uint256 consecutiveDays,
            uint256 lastVoteDay,
            uint256 cooldownRemaining
        )
    {
        UserVote memory vote = userVotes[user][tokenAddress];
        uint256 cooldownEnd = vote.lastVoteTime + VOTE_COOLDOWN;
        uint256 remaining = 0;

        if (block.timestamp < cooldownEnd) {
            remaining = cooldownEnd - block.timestamp;
        }

        return (vote.lastVoteTime, vote.consecutiveDays, vote.lastVoteDay, remaining);
    }

    /**
     * @notice Get top screamed tokens (daily contest)
     * @param limit Number of top tokens to return
     * @return Array of token addresses sorted by daily screams
     */
    function getTopDailyScreamers(uint256 limit)
        external
        view
        returns (address[] memory)
    {
        uint256 totalTokens = allTokens.length;
        if (totalTokens == 0) return new address[](0);
        if (limit > totalTokens) limit = totalTokens;

        // Create array of all token addresses
        address[] memory tokens = new address[](totalTokens);
        for (uint256 i = 0; i < totalTokens; i++) {
            tokens[i] = allTokens[i].token;
        }

        // Bubble sort by daily screams (descending)
        for (uint256 i = 0; i < tokens.length - 1; i++) {
            for (uint256 j = 0; j < tokens.length - i - 1; j++) {
                if (tokenVotes[tokens[j]].dailyScreams < tokenVotes[tokens[j + 1]].dailyScreams) {
                    address temp = tokens[j];
                    tokens[j] = tokens[j + 1];
                    tokens[j + 1] = temp;
                }
            }
        }

        // Return top N
        address[] memory topTokens = new address[](limit);
        for (uint256 i = 0; i < limit; i++) {
            topTokens[i] = tokens[i];
        }

        return topTokens;
    }

    /**
     * @notice Get top screamed tokens (all-time leaderboard)
     * @param limit Number of top tokens to return
     * @return Array of token addresses sorted by total screams
     */
    function getTopAllTimeScreamers(uint256 limit)
        external
        view
        returns (address[] memory)
    {
        uint256 totalTokens = allTokens.length;
        if (totalTokens == 0) return new address[](0);
        if (limit > totalTokens) limit = totalTokens;

        // Create array of all token addresses
        address[] memory tokens = new address[](totalTokens);
        for (uint256 i = 0; i < totalTokens; i++) {
            tokens[i] = allTokens[i].token;
        }

        // Bubble sort by total screams (descending)
        for (uint256 i = 0; i < tokens.length - 1; i++) {
            for (uint256 j = 0; j < tokens.length - i - 1; j++) {
                if (tokenVotes[tokens[j]].totalScreams < tokenVotes[tokens[j + 1]].totalScreams) {
                    address temp = tokens[j];
                    tokens[j] = tokens[j + 1];
                    tokens[j + 1] = temp;
                }
            }
        }

        // Return top N
        address[] memory topTokens = new address[](limit);
        for (uint256 i = 0; i < limit; i++) {
            topTokens[i] = tokens[i];
        }

        return topTokens;
    }
}
