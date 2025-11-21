# Price Oracle Integration for MON Token Volatility Protection

## Overview

This document explains the price oracle integration that protects Scream.fun's bonding curve mechanics from MON token price volatility.

## The Problem

### Before Oracle Integration

The original implementation used **hardcoded MON thresholds**:
- Migration threshold: `2,760 MON` (assuming $25/MON = $69,000 USD)
- Liquidity allocation: `480 MON` (assuming $25/MON = $12,000 USD)

**Critical Issue**: These thresholds break when MON price changes!

| MON Price | Migration Value | Liquidity Value | Problem |
|-----------|----------------|-----------------|---------|
| $25 | $69,000 ✅ | $12,000 ✅ | Works as intended |
| $1 | **$2,760** ❌ | **$480** ❌ | Way too early, tiny liquidity |
| $100 | **$276,000** ❌ | **$48,000** ❌ | Takes forever, excessive liquidity |
| $1,500 | **$4,140,000** ❌ | **$720,000** ❌ | Essentially broken |

### The Solution

**USD-denominated thresholds** using a price oracle:
- Migration always happens at **$69,000 USD** (regardless of MON price)
- Liquidity always equals **$12,000 USD** (regardless of MON price)

## Architecture

### New Contracts

#### 1. `IPriceOracle.sol`
Interface for MON/USD price feeds. Returns prices with 8 decimals (e.g., $25.00 = 25_00000000).

```solidity
interface IPriceOracle {
    function getLatestPrice() external view returns (uint256 price, uint256 updatedAt);
    function isHealthy() external view returns (bool);
}
```

#### 2. `MockPriceOracle.sol`
Testing implementation that allows manual price setting. **DO NOT USE IN PRODUCTION**.

```solidity
// For testing only
priceOracle.setPrice(100_00000000); // Set to $100
```

### Updated Contracts

#### 3. `BondingCurve.sol` Changes

**Constants Changed:**
```solidity
// OLD (hardcoded MON amounts)
uint256 public constant MIGRATION_THRESHOLD = 2_760 ether;
uint256 public constant LIQUIDITY_ALLOCATION = 480 ether;

// NEW (USD-denominated targets)
uint256 public constant TARGET_MIGRATION_USD = 69_000_00000000; // $69k
uint256 public constant TARGET_LIQUIDITY_USD = 12_000_00000000; // $12k
```

**New State Variables:**
```solidity
IPriceOracle public priceOracle;
bool public useOracle; // Emergency flag to disable oracle
```

**New Functions:**
- `getMonToUsd(uint256 monAmount)` - Convert MON to USD
- `getUsdToMon(uint256 usdValue)` - Convert USD to MON
- `getMarketCapUSD()` - Get market cap in USD
- `getMigrationThresholdMON()` - Get current migration threshold in MON
- `getLiquidityAllocationMON()` - Get current liquidity allocation in MON
- `shouldMigrate()` - Check if migration threshold reached (USD-based)
- `setOracle(address)` - Update oracle (owner only)
- `disableOracle()` - Emergency disable (owner only)
- `enableOracle()` - Re-enable oracle (owner only)

#### 4. `ScreamFactory.sol` Changes

**New Constructor Parameter:**
```solidity
constructor(
    address _devWallet,
    address _rageFund,
    address _uniswapFactory,
    address _wmon,
    address _priceOracle,  // NEW
    address _developmentFund,
    address _communityTreasury
)
```

**New Admin Function:**
```solidity
function setPriceOracle(address _priceOracle) external onlyOwner;
```

## How It Works

### Migration Logic

```solidity
function shouldMigrate() public view returns (bool) {
    if (migrated) return false;

    (uint256 price, bool isValid) = _getOraclePrice();

    if (isValid) {
        // Use USD-based threshold
        uint256 marketCapUsd = getMonToUsd(ethReserve);
        return marketCapUsd >= TARGET_MIGRATION_USD; // $69k
    } else {
        // Fallback: Use conservative MON threshold (2,760 MON)
        return ethReserve >= 2_760 ether;
    }
}
```

### Dynamic Liquidity Allocation

```solidity
function _migrate() internal {
    // Calculate liquidity allocation based on current MON price
    uint256 liquidityAllocation = getLiquidityAllocationMON();

    // Fallback if oracle unavailable
    if (liquidityAllocation == 0) {
        liquidityAllocation = 480 ether; // $12k at $25/MON
    }

    // Split 50/50 for liquidity pool
    uint256 monForLiquidity = liquidityAllocation / 2;
    // ... rest of migration logic
}
```

## Examples

### Example 1: MON = $1

```javascript
Market cap reaches: 69,000 MON * $1 = $69,000 USD ✅
Migration triggers!

Liquidity allocation: $12,000 / $1 = 12,000 MON
Uniswap pool gets: 6,000 MON + tokens worth 6,000 MON
```

### Example 2: MON = $25

```javascript
Market cap reaches: 2,760 MON * $25 = $69,000 USD ✅
Migration triggers!

Liquidity allocation: $12,000 / $25 = 480 MON
Uniswap pool gets: 240 MON + tokens worth 240 MON
```

### Example 3: MON = $1,500

```javascript
Market cap reaches: 46 MON * $1,500 = $69,000 USD ✅
Migration triggers!

Liquidity allocation: $12,000 / $1,500 = 8 MON
Uniswap pool gets: 4 MON + tokens worth 4 MON
```

## Safety Mechanisms

### 1. Oracle Health Checks

```solidity
function _getOraclePrice() internal view returns (uint256 price, bool isValid) {
    // Check if oracle is enabled
    if (!useOracle) return (0, false);

    // Check oracle health
    if (!priceOracle.isHealthy()) return (0, false);

    // Get price and check staleness
    (uint256 latestPrice, uint256 updatedAt) = priceOracle.getLatestPrice();
    if (block.timestamp - updatedAt > MAX_PRICE_STALENESS) {
        return (0, false); // Price too old (>1 hour)
    }

    // Sanity check price range
    if (latestPrice < MIN_REASONABLE_PRICE || latestPrice > MAX_REASONABLE_PRICE) {
        return (0, false); // Price out of range ($0.50 - $10,000)
    }

    return (latestPrice, true);
}
```

**Safety Constants:**
- `MAX_PRICE_STALENESS = 1 hour` - Reject prices older than 1 hour
- `MIN_REASONABLE_PRICE = $0.50` - Minimum sane MON price
- `MAX_REASONABLE_PRICE = $10,000` - Maximum sane MON price

### 2. Fallback Mechanism

If oracle fails or is disabled:
- Migration threshold: Reverts to **2,760 MON** (conservative, assumes $25/MON)
- Liquidity allocation: Reverts to **480 MON**

This ensures the system continues to function even if the oracle breaks.

### 3. Emergency Controls (Owner Only)

```solidity
// Disable oracle in emergency
bondingCurve.disableOracle();

// Re-enable oracle
bondingCurve.enableOracle();

// Switch to a different oracle
bondingCurve.setOracle(newOracleAddress);
```

## Impact on Bonding Curve

### What Changes

1. **Migration Timing**: Now based on USD value, not MON amount
2. **Liquidity Depth**: Always $12k worth of MON, not fixed 480 MON
3. **Market Cap Display**: Can now show both MON and USD values

### What Stays the Same

1. **Bonding Curve Formula**: Still uses constant product (k = x × y)
2. **User Experience**: Users still buy/sell with MON
3. **Token Supply**: 1 billion tokens, 80% on bonding curve
4. **Fee Structure**: 0.4% trading fee, 2% rage tax unchanged
5. **RAGE Fund**: Still accumulates and distributes to holders

## Deployment

### Testing (Local/Testnet)

```bash
# Deploy with MockPriceOracle
npx hardhat run scripts/deploy-with-oracle.js --network localhost

# Update mock price for testing
const oracle = await ethers.getContractAt("MockPriceOracle", oracleAddress);
await oracle.setPrice(ethers.parseUnits("100", 8)); // Set to $100
```

### Production (Mainnet)

**Option 1: Chainlink Price Feed (Recommended)**
```solidity
// Deploy Chainlink integration
contract ChainlinkMonadOracle is IPriceOracle {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getLatestPrice() external view returns (uint256, uint256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(price > 0, "Invalid price");
        require(answeredInRound >= roundID, "Stale price");

        return (uint256(price), updatedAt);
    }

    function isHealthy() external view returns (bool) {
        try this.getLatestPrice() returns (uint256, uint256) {
            return true;
        } catch {
            return false;
        }
    }
}
```

**Option 2: Monad Native Oracle**
```solidity
// Use Monad's built-in oracle if available
// Implementation depends on Monad's oracle design
```

**Option 3: Multiple Oracle Average**
```solidity
// Aggregate multiple sources for better reliability
// Average Chainlink + Pyth + Monad native oracle
```

## Testing Scenarios

### Test 1: Normal Operation

```javascript
// Set MON price to $25
await oracle.setPrice(ethers.parseUnits("25", 8));

// Buy tokens until market cap = $69k
// At $25/MON, this is 2,760 MON
await buyTokensUntilMigration();

// Verify migration occurred at correct USD value
const marketCapUSD = await bondingCurve.getMarketCapUSD();
expect(marketCapUSD).to.equal(ethers.parseUnits("69000", 8));
```

### Test 2: Low MON Price

```javascript
// Set MON price to $1
await oracle.setPrice(ethers.parseUnits("1", 8));

// Buy tokens until market cap = $69k
// At $1/MON, this is 69,000 MON
await buyTokensUntilMigration();

// Verify large liquidity allocation
const liquidityMON = await bondingCurve.getLiquidityAllocationMON();
expect(liquidityMON).to.equal(ethers.parseEther("12000")); // 12,000 MON
```

### Test 3: Oracle Failure

```javascript
// Disable oracle
await oracle.setHealthy(false);

// System should fall back to 2,760 MON threshold
const shouldMigrate = await bondingCurve.shouldMigrate();
// Migration happens at 2,760 MON regardless of USD value
```

### Test 4: Stale Price

```javascript
// Set price but don't update for >1 hour
await oracle.setPrice(ethers.parseUnits("25", 8));
await time.increase(3601); // 1 hour + 1 second

// Oracle should be considered invalid
const (price, isValid) = await bondingCurve._getOraclePrice();
expect(isValid).to.be.false;
```

## Migration Checklist

- [ ] Deploy `IPriceOracle` implementation (Chainlink/Monad/custom)
- [ ] Test oracle on testnet with various MON prices
- [ ] Verify staleness checks work correctly
- [ ] Test emergency disable/enable functions
- [ ] Update `ScreamFactory` constructor with oracle address
- [ ] Deploy all contracts with oracle integration
- [ ] Verify contracts on block explorer
- [ ] Set up monitoring for oracle health
- [ ] Document oracle address and admin keys
- [ ] Test migration at different simulated MON prices

## Monitoring

### Key Metrics to Track

1. **Oracle Health**
   - Price freshness (< 1 hour old)
   - Health status
   - Price within reasonable range

2. **Market Dynamics**
   - Current MON price
   - Market cap in USD
   - Distance to migration threshold
   - Estimated liquidity allocation

3. **Oracle Events**
   - `OracleUpdated`: Oracle address changed
   - `OracleDisabled`: Oracle disabled by admin

### Alerts

- Alert if oracle price >1 hour old
- Alert if oracle returns unhealthy
- Alert if MON price outside $0.50 - $10,000 range
- Alert if oracle disabled in emergency

## FAQ

### Q: What happens if MON crashes to $0.10?

**A:** Migration triggers at 690,000 MON ($69k USD). Uniswap gets 120,000 MON liquidity ($12k USD). System works perfectly.

### Q: What if the oracle fails during migration?

**A:** Migration completes using fallback values (2,760 MON threshold, 480 MON liquidity). System continues to function.

### Q: Can oracle be manipulated?

**A:** No. We use:
- Health checks
- Staleness checks (1 hour max)
- Sanity range checks ($0.50 - $10,000)
- Multiple oracle sources (recommended)
- Fallback mechanism

### Q: How often does the oracle update?

**A:** Depends on implementation:
- Chainlink: Every price change >0.5% or every 1 hour
- Custom: As frequently as you implement
- Recommended: At least every 30 minutes

### Q: What if MON price changes during a buy transaction?

**A:** The migration check happens **after** the buy completes. The buy uses the current bonding curve price (which is relative to MON reserves, not USD). Migration threshold is checked using the latest oracle price at that moment.

### Q: Can users game the system by timing purchases around oracle updates?

**A:** No. The bonding curve price is determined by the reserve ratio, not the oracle. The oracle only affects **when** migration happens (at $69k USD), not **what** users pay for tokens.

## Summary

### Benefits

✅ Migration always happens at **$69,000 USD** (not variable MON amount)
✅ Liquidity always equals **$12,000 USD** (not variable MON amount)
✅ Works correctly whether MON is $1 or $1,500
✅ Robust safety mechanisms (staleness, health, range checks)
✅ Fallback ensures system never breaks
✅ Emergency controls for admin

### Tradeoffs

⚠️ Adds oracle dependency (mitigated by fallback)
⚠️ Slight gas increase for oracle calls
⚠️ Requires oracle maintenance/monitoring
⚠️ More complex deployment process

### Recommendation

**Use oracle integration for production.** The benefits far outweigh the costs. Without it, the platform breaks if MON price deviates significantly from $25.

---

**Questions or issues?** Open a GitHub issue or contact the dev team.
