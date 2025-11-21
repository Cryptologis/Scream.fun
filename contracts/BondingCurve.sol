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
import "./IPriceOracle.sol";

/**
 * @title BondingCurve
 * @notice Bonding curve for Scream.fun meme tokens
 * @dev Implements linear bonding curve with rage tax on panic sells
 *      Uses price oracle to maintain USD-stable migration thresholds
 *
 * Phase 1 Fees (pre-migration):
 * - 0.4% total trading fee: 0.2% → dev, 0.2% → RAGE fund
 * - 2% rage tax on >10% loss sells: 70% → RAGE fund, 30% → dev
 *
 * Migration: At target market cap ($69k USD), migrates to Uniswap V2-style pool
 */
contract BondingCurve is ReentrancyGuard, Ownable {
    // Token supply constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant BONDING_CURVE_SUPPLY = 800_000_000 * 10**18; // 80% for bonding curve
    uint256 public constant VIRTUAL_ETH_RESERVE = 30 ether; // Virtual liquidity

    // USD-denominated thresholds (8 decimals to match oracle)
    uint256 public constant TARGET_MIGRATION_USD = 69_000_00000000; // $69,000 USD
    uint256 public constant TARGET_LIQUIDITY_USD = 12_000_00000000; // $12,000 USD

    // Oracle safety
    uint256 public constant MAX_PRICE_STALENESS = 1 hours; // Max age for oracle price
    uint256 public constant MIN_REASONABLE_PRICE = 50000000; // $0.50 minimum (8 decimals)
    uint256 public constant MAX_REASONABLE_PRICE = 10_000_00000000; // $10,000 maximum (8 decimals)

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
    IPriceOracle public priceOracle;
    address public devWallet;
    CustomUniswapV2Factory public uniswapFactory;
    address public uniswapPair;

    uint256 public virtualTokenReserve;
    uint256 public realTokensSold;
    uint256 public ethReserve;
    bool public migrated;
    bool public useOracle; // Emergency flag to disable oracle if needed

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
    event OracleUpdated(address indexed newOracle);
    event OracleDisabled();

    constructor(
        address _devWallet,
        address _rageFund,
        address _uniswapFactory,
        address _wmon,
        address _priceOracle,
        string memory name,
        string memory symbol
    ) Ownable(msg.sender) {
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_rageFund != address(0), "Invalid RAGE fund");
        require(_wmon != address(0), "Invalid WMON");
        require(_priceOracle != address(0), "Invalid price oracle");

        devWallet = _devWallet;
        rageFund = RAGEFund(payable(_rageFund));
        uniswapFactory = CustomUniswapV2Factory(_uniswapFactory);
        wmon = WMON(payable(_wmon));
        priceOracle = IPriceOracle(_priceOracle);
        useOracle = true;

        // Deploy token
        token = new ScreamToken(name, symbol, TOTAL_SUPPLY, address(this));

        // Initialize virtual reserves
        virtualTokenReserve = BONDING_CURVE_SUPPLY;
        ethReserve = VIRTUAL_ETH_RESERVE;
    }

    /**
     * @notice Get current MON/USD price from oracle with safety checks
     * @return price MON price in USD (8 decimals)
     * @return isValid Whether the price is valid and fresh
     */
    function _getOraclePrice() internal view returns (uint256 price, bool isValid) {
        if (!useOracle) {
            return (0, false);
        }

        try priceOracle.isHealthy() returns (bool healthy) {
            if (!healthy) {
                return (0, false);
            }
        } catch {
            return (0, false);
        }

        try priceOracle.getLatestPrice() returns (uint256 latestPrice, uint256 updatedAt) {
            // Check staleness
            if (block.timestamp - updatedAt > MAX_PRICE_STALENESS) {
                return (0, false);
            }

            // Sanity check price range
            if (latestPrice < MIN_REASONABLE_PRICE || latestPrice > MAX_REASONABLE_PRICE) {
                return (0, false);
            }

            return (latestPrice, true);
        } catch {
            return (0, false);
        }
    }

    /**
     * @notice Convert MON amount to USD value
     * @param monAmount Amount of MON (18 decimals)
     * @return usdValue USD value (8 decimals), 0 if oracle unavailable
     */
    function getMonToUsd(uint256 monAmount) public view returns (uint256 usdValue) {
        (uint256 price, bool isValid) = _getOraclePrice();
        if (!isValid) {
            return 0;
        }

        // monAmount (18 decimals) * price (8 decimals) / 1e18 = USD (8 decimals)
        return (monAmount * price) / 1e18;
    }

    /**
     * @notice Convert USD value to MON amount
     * @param usdValue USD value (8 decimals)
     * @return monAmount Amount of MON (18 decimals), 0 if oracle unavailable
     */
    function getUsdToMon(uint256 usdValue) public view returns (uint256 monAmount) {
        (uint256 price, bool isValid) = _getOraclePrice();
        if (!isValid || price == 0) {
            return 0;
        }

        // usdValue (8 decimals) * 1e18 / price (8 decimals) = MON (18 decimals)
        return (usdValue * 1e18) / price;
    }

    /**
     * @notice Get current market cap in USD
     * @return marketCapUsd Market cap in USD (8 decimals)
     */
    function getMarketCapUSD() public view returns (uint256 marketCapUsd) {
        return getMonToUsd(ethReserve);
    }

    /**
     * @notice Get migration threshold in MON based on current price
     * @return thresholdMon Migration threshold in MON (18 decimals)
     */
    function getMigrationThresholdMON() public view returns (uint256 thresholdMon) {
        return getUsdToMon(TARGET_MIGRATION_USD);
    }

    /**
     * @notice Get liquidity allocation in MON based on current price
     * @return liquidityMon Liquidity allocation in MON (18 decimals)
     */
    function getLiquidityAllocationMON() public view returns (uint256 liquidityMon) {
        return getUsdToMon(TARGET_LIQUIDITY_USD);
    }

    /**
     * @notice Check if migration threshold has been reached
     * @return True if ready to migrate
     */
    function shouldMigrate() public view returns (bool) {
        if (migrated) {
            return false;
        }

        (uint256 price, bool isValid) = _getOraclePrice();

        if (isValid) {
            // Use USD-based threshold if oracle is working
            uint256 marketCapUsd = getMonToUsd(ethReserve);
            return marketCapUsd >= TARGET_MIGRATION_USD;
        } else {
            // Fallback: Use a conservative MON threshold (calculated at $25/MON)
            // This ensures migration still works if oracle fails
            uint256 fallbackThreshold = 2_760 ether; // Original $69k at $25/MON
            return ethReserve >= fallbackThreshold;
        }
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

        // Check if migration threshold reached (USD-based or fallback)
        if (shouldMigrate()) {
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
     * @dev Allocates $12k worth of MON (50/50 split) to Uniswap, remaining MON to dev wallet
     *      Uses oracle price to determine MON amount, falls back to 480 MON if oracle unavailable
     */
    function _migrate() internal {
        require(!migrated, "Already migrated");

        migrated = true;

        // Determine liquidity allocation based on oracle availability
        uint256 liquidityAllocation = getLiquidityAllocationMON();

        // Fallback to 480 MON if oracle is unavailable
        if (liquidityAllocation == 0) {
            liquidityAllocation = 480 ether; // $12k at $25/MON
        }

        require(address(this).balance >= liquidityAllocation, "Insufficient balance for migration");

        // Calculate 50/50 split for liquidity pool
        // Half goes to WMON, half to tokens (by value)
        uint256 monForLiquidity = liquidityAllocation / 2;

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
     * @notice Get market cap in native token (MON)
     */
    function getMarketCap() external view returns (uint256) {
        return ethReserve;
    }

    /**
     * @notice Update price oracle (only owner)
     * @param _newOracle Address of new oracle contract
     */
    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        priceOracle = IPriceOracle(_newOracle);
        useOracle = true;
        emit OracleUpdated(_newOracle);
    }

    /**
     * @notice Emergency: Disable oracle and use fallback thresholds (only owner)
     * @dev This allows migration to continue even if oracle fails permanently
     */
    function disableOracle() external onlyOwner {
        useOracle = false;
        emit OracleDisabled();
    }

    /**
     * @notice Re-enable oracle after it was disabled (only owner)
     */
    function enableOracle() external onlyOwner {
        require(address(priceOracle) != address(0), "No oracle set");
        useOracle = true;
        emit OracleUpdated(address(priceOracle));
    }

    receive() external payable {
        revert("Use buy() function");
    }
}
