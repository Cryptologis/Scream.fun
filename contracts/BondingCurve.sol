// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ScreamToken.sol";
import "./RAGEFund.sol";
import "./WMON.sol";
import "./CustomUniswapV2Factory.sol";
import "./CustomUniswapV2Pair.sol";

/**
 * @title BondingCurve
 * @notice Bonding curve for Scream.fun meme tokens
 * @dev Implements linear bonding curve with rage tax on panic sells
 *
 * Phase 1 Fees (pre-migration):
 * - 0.4% total trading fee: 0.2% → dev, 0.2% → RAGE fund
 * - 2% rage tax on >10% loss sells: 70% → RAGE fund, 30% → dev
 *
 * Migration: At target market cap, migrates to Uniswap V2-style pool
 */
contract BondingCurve is ReentrancyGuard, Ownable {
    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant BONDING_CURVE_SUPPLY = 800_000_000 * 10**18; // 80% for bonding curve
    uint256 public constant MIGRATION_THRESHOLD = 2_760 ether; // Market cap to trigger migration ($69k at $25/MON)
    uint256 public constant LIQUIDITY_ALLOCATION = 480 ether; // Liquidity for Uniswap ($12k at $25/MON)
    uint256 public constant VIRTUAL_ETH_RESERVE = 30 ether; // Virtual liquidity

    // Fee constants (in basis points, 10000 = 100%)
    uint256 public constant TRADING_FEE_BPS = 40; // 0.4%
    uint256 public constant RAGE_TAX_BPS = 200; // 2%
    uint256 public constant RAGE_LOSS_THRESHOLD_BPS = 1000; // 10%

    // Fee splits
    uint256 public constant DEV_SHARE_BPS = 5000; // 50% of trading fees
    uint256 public constant RAGE_TAX_TO_FUND_BPS = 7000; // 70% of rage tax to fund

    // State variables
    ScreamToken public token;
    RAGEFund public rageFund;
    WMON public wmon;
    address public devWallet;
    CustomUniswapV2Factory public uniswapFactory;
    address public uniswapPair;

    uint256 public virtualTokenReserve;
    uint256 public realTokensSold;
    uint256 public ethReserve;
    bool public migrated;

    // User tracking for rage tax
    struct UserPosition {
        uint256 totalTokensBought;
        uint256 totalEthSpent;
        uint256 averageBuyPrice; // MON per token * 1e18 (native token)
    }

    mapping(address => UserPosition) public userPositions;

    // Events
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 fee);
    event TokensSold(address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 fee, uint256 rageTax);
    event Migrated(address indexed pool, uint256 ethAmount, uint256 tokenAmount);
    event RageTaxCollected(address indexed seller, uint256 amount);

    constructor(
        address _devWallet,
        address _rageFund,
        address _uniswapFactory,
        address _wmon,
        string memory name,
        string memory symbol
    ) Ownable(msg.sender) {
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_rageFund != address(0), "Invalid RAGE fund");
        require(_wmon != address(0), "Invalid WMON");

        devWallet = _devWallet;
        rageFund = RAGEFund(payable(_rageFund));
        uniswapFactory = CustomUniswapV2Factory(_uniswapFactory);
        wmon = WMON(payable(_wmon));

        // Deploy token
        token = new ScreamToken(name, symbol, TOTAL_SUPPLY, address(this));

        // Initialize virtual reserves
        virtualTokenReserve = BONDING_CURVE_SUPPLY;
        ethReserve = VIRTUAL_ETH_RESERVE;
    }

    /**
     * @notice Calculate tokens received for native token (before fees)
     * @dev Uses linear bonding curve: price = k * supply
     */
    function calculatePurchaseReturn(uint256 ethAmount) public view returns (uint256) {
        if (ethAmount == 0) return 0;

        // Linear bonding curve formula
        // When buying: new_price = old_price + (tokens_bought * price_increment)
        // Simplified: tokens_out = (2 * eth_in * total_supply) / (2 * eth_reserve + eth_in)

        uint256 ethAfterFee = ethAmount * (10000 - TRADING_FEE_BPS) / 10000;
        uint256 newEthReserve = ethReserve + ethAfterFee;

        // Constant product: k = ethReserve * tokenReserve
        uint256 k = ethReserve * virtualTokenReserve;
        uint256 newTokenReserve = k / newEthReserve;

        uint256 tokensOut = virtualTokenReserve - newTokenReserve;

        require(tokensOut <= virtualTokenReserve, "Insufficient liquidity");
        return tokensOut;
    }

    /**
     * @notice Calculate native token received for tokens (before fees)
     */
    function calculateSaleReturn(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0) return 0;

        // Reverse of purchase calculation
        uint256 newTokenReserve = virtualTokenReserve + tokenAmount;

        uint256 k = ethReserve * virtualTokenReserve;
        uint256 newEthReserve = k / newTokenReserve;

        uint256 ethOut = ethReserve - newEthReserve;
        uint256 ethAfterFee = ethOut * (10000 - TRADING_FEE_BPS) / 10000;

        return ethAfterFee;
    }

    /**
     * @notice Check if a sell would trigger rage tax
     */
    function wouldTriggerRageTax(address seller, uint256 tokenAmount) public view returns (bool, uint256) {
        UserPosition memory pos = userPositions[seller];

        if (pos.totalTokensBought == 0) return (false, 0);

        uint256 saleValue = calculateSaleReturn(tokenAmount);
        uint256 avgCost = (pos.averageBuyPrice * tokenAmount) / 1e18;

        // Check if selling at >10% loss
        if (saleValue < avgCost) {
            uint256 loss = avgCost - saleValue;
            uint256 lossPercentage = (loss * 10000) / avgCost;

            if (lossPercentage > RAGE_LOSS_THRESHOLD_BPS) {
                uint256 rageTax = saleValue * RAGE_TAX_BPS / 10000;
                return (true, rageTax);
            }
        }

        return (false, 0);
    }

    /**
     * @notice Buy tokens with native token (MON on Monad)
     */
    function buy(uint256 minTokensOut) external payable nonReentrant {
        require(!migrated, "Already migrated");
        require(msg.value > 0, "No ETH sent");

        uint256 tokensOut = calculatePurchaseReturn(msg.value);
        require(tokensOut >= minTokensOut, "Slippage too high");
        require(tokensOut <= virtualTokenReserve, "Insufficient liquidity");

        // Calculate fees
        uint256 fee = msg.value * TRADING_FEE_BPS / 10000;
        uint256 ethAfterFee = msg.value - fee;

        // Split fees
        uint256 devFee = fee / 2;
        uint256 rageFee = fee - devFee;

        // Update reserves
        virtualTokenReserve -= tokensOut;
        realTokensSold += tokensOut;
        ethReserve += ethAfterFee;

        // Update user position
        UserPosition storage pos = userPositions[msg.sender];
        uint256 newTotalTokens = pos.totalTokensBought + tokensOut;
        uint256 newTotalEth = pos.totalEthSpent + msg.value;
        pos.averageBuyPrice = (newTotalEth * 1e18) / newTotalTokens;
        pos.totalTokensBought = newTotalTokens;
        pos.totalEthSpent = newTotalEth;

        // Transfer tokens
        require(token.transfer(msg.sender, tokensOut), "Transfer failed");

        // Distribute fees
        (bool devSuccess, ) = devWallet.call{value: devFee}("");
        require(devSuccess, "Dev fee transfer failed");

        rageFund.deposit{value: rageFee}(address(token));

        emit TokensPurchased(msg.sender, msg.value, tokensOut, fee);

        // Check if migration threshold reached
        if (ethReserve >= MIGRATION_THRESHOLD) {
            _migrate();
        }
    }

    /**
     * @notice Sell tokens for native token (MON on Monad)
     */
    function sell(uint256 tokenAmount, uint256 minEthOut, bool acceptRageTax) external nonReentrant {
        require(!migrated, "Already migrated");
        require(tokenAmount > 0, "No tokens specified");
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        uint256 ethOut = calculateSaleReturn(tokenAmount);

        // Check for rage tax
        (bool isRageSell, uint256 rageTax) = wouldTriggerRageTax(msg.sender, tokenAmount);

        if (isRageSell) {
            require(acceptRageTax, "Rage tax not accepted");

            uint256 rageTaxToFund = rageTax * RAGE_TAX_TO_FUND_BPS / 10000;
            uint256 rageTaxToDev = rageTax - rageTaxToFund;

            ethOut -= rageTax;

            // Distribute rage tax
            (bool devSuccess, ) = devWallet.call{value: rageTaxToDev}("");
            require(devSuccess, "Dev rage tax transfer failed");

            rageFund.deposit{value: rageTaxToFund}(address(token));

            emit RageTaxCollected(msg.sender, rageTax);
        }

        // Calculate trading fees
        uint256 fee = (ethOut + (isRageSell ? rageTax : 0)) * TRADING_FEE_BPS / 10000;
        ethOut -= fee;

        require(ethOut >= minEthOut, "Slippage too high");

        // Split fees
        uint256 devFee = fee / 2;
        uint256 rageFee = fee - devFee;

        // Update reserves
        virtualTokenReserve += tokenAmount;
        realTokensSold -= tokenAmount;
        ethReserve -= (ethOut + fee);

        // Transfer tokens from user
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");

        // Send ETH to user
        (bool success, ) = msg.sender.call{value: ethOut}("");
        require(success, "ETH transfer failed");

        // Distribute fees
        (bool devSuccess, ) = devWallet.call{value: devFee}("");
        require(devSuccess, "Dev fee transfer failed");

        rageFund.deposit{value: rageFee}(address(token));

        emit TokensSold(msg.sender, tokenAmount, ethOut, fee, isRageSell ? rageTax : 0);
    }

    /**
     * @notice Migrate to Uniswap V2 pool (internal)
     * @dev Allocates 480 MON (50/50 split) to Uniswap, remaining MON to dev wallet
     */
    function _migrate() internal {
        require(!migrated, "Already migrated");
        require(address(this).balance >= LIQUIDITY_ALLOCATION, "Insufficient balance");

        migrated = true;

        // Calculate 50/50 split for liquidity pool
        // Half of LIQUIDITY_ALLOCATION goes to WMON, half to tokens (by value)
        uint256 monForLiquidity = LIQUIDITY_ALLOCATION / 2; // 240 MON

        // Calculate token amount needed for 50/50 value split
        // Current price = ethReserve / virtualTokenReserve
        // Token amount = monForLiquidity * virtualTokenReserve / ethReserve
        uint256 tokenAmount = (monForLiquidity * virtualTokenReserve) / ethReserve;

        require(tokenAmount <= virtualTokenReserve, "Insufficient token reserve");

        // Update reserves
        virtualTokenReserve -= tokenAmount;

        // Create pair if it doesn't exist
        address token0 = address(token);
        address token1 = address(wmon);

        if (uniswapFactory.getPair(token0, token1) == address(0)) {
            uniswapPair = uniswapFactory.createPair(token0, token1);
        } else {
            uniswapPair = uniswapFactory.getPair(token0, token1);
        }

        // Wrap MON to WMON
        wmon.deposit{value: monForLiquidity}();

        // Transfer tokens to pair
        require(token.transfer(uniswapPair, tokenAmount), "Token transfer failed");

        // Transfer WMON to pair
        require(wmon.transfer(uniswapPair, monForLiquidity), "WMON transfer failed");

        // Mint LP tokens (sent to this contract for now - could be burned or sent to dev)
        CustomUniswapV2Pair(uniswapPair).mint(devWallet);

        // Send remaining MON to dev wallet
        uint256 remainingMon = address(this).balance;
        if (remainingMon > 0) {
            (bool success, ) = devWallet.call{value: remainingMon}("");
            require(success, "Remaining MON transfer failed");
        }

        emit Migrated(uniswapPair, monForLiquidity, tokenAmount);
    }

    /**
     * @notice Get current token price in native token
     */
    function getCurrentPrice() external view returns (uint256) {
        if (virtualTokenReserve == 0) return 0;
        return (ethReserve * 1e18) / virtualTokenReserve;
    }

    /**
     * @notice Get market cap in native token
     */
    function getMarketCap() external view returns (uint256) {
        return ethReserve;
    }

    receive() external payable {
        revert("Use buy() function");
    }
}
