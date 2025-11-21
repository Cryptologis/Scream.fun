# 🔥 SCREAM.FUN - Fair Meme Coin Launchpad on Monad

The fairest (and most profitable) Pump.fun-style meme coin launchpad on Monad (EVM L1, 10k TPS).

**ZERO creator fees forever. Dev still eats handsomely.**

⚡ **Powered by Monad** - 10,000 TPS, near-instant finality, low gas fees

## 🎯 Unique Features

- 🖼️ **Image Uploads** - Every token gets a visual identity
- 👑 **King of Scream Leaderboard** - Highest Volume × Market Cap
- 🆕 **Token Showcases** - Recently Created, About to Migrate, Migrated sections
- 😱 **"Scream for Your Token" Voting** - Community-powered token exposure with daily contests
- 🎁 **Referral System** - Earn 0.05% commission on referred token trades
- 🔒 **Anti-Snipe Protection** - Time-based locking with gradual unlock (5 min lock + 30 min unlock)
- 🎨 **Creator Allocation** - Optional 0-10% allocation (50% immediate, 50% at migration)
- 💎 **Diamond Hands Rewards** - Massive holder rewards with vesting + holding requirements

## 💚 Community-First Philosophy

**Unlike other platforms that keep everything, Scream.fun gives MORE to the community than to the protocol owner.**

From voting revenue:
- **50% goes directly to community treasury** (controlled by future DAO)
- 25% funds protocol development (audits, features, team)
- 25% to protocol owner (maintenance & operations)

**What this means:**
- The community literally owns MORE of the platform than the creator
- Voting revenue creates a war chest for holder rewards
- Progressive decentralization from day one
- Aligned incentives: platform success = community wealth

**DAO Governance Roadmap:**
1. **Phase 1 (Launch):** Treasury accumulates, community builds trust
2. **Phase 2 (6 months):** Launch governance token, delegate control gradually
3. **Phase 3 (12 months):** Full DAO control of treasury decisions

This isn't just another cash grab - we're building a platform the community actually OWNS.

## 💰 Revenue Model

### Phase 1 - Bonding Curve (Pre-Migration)
- **0.4% total trading fee**
  - 0.2% → dev wallet
  - 0.2% → RAGE fund
- **2% rage tax** if someone sells at >10% loss from their average buy price
  - 90% → RAGE fund (distributed to holders!)
  - 10% → dev wallet

### Phase 2 - After Migration to AMM
- Liquidity migrates to custom Uniswap V2-style pair at 85 MON market cap
- **0.3% total trading fee forever**
  - 0.15% → dev wallet
  - 0.10% → RAGE fund (distributed to holders)
  - 0.05% → auto-buyback & burn

### 💎 Diamond Hands Reward (Post-Migration)
At migration, **90% of accumulated RAGE fund** is distributed to all token holders!

**Vesting Schedule:**
- 25% claimable every 30 days over 90 days
- **Holding Requirement:** Must maintain token balance to claim
- Sell tokens = lose proportional unclaimed rewards
- True diamond hands get maximum rewards! 💪

## 😱 "Scream for Your Token" - Community Voting

A gamified voting system that lets the community decide which tokens deserve the spotlight!

### How It Works

**Voting Mechanics:**
- **Cost:** 0.0005 MON per scream (low barrier to entry)
- **Cooldown:** Vote once per 24 hours per token
- **Revenue Split (Community-First!):**
  - **50% → Community Treasury** (DAO-controlled rewards for holders)
  - **25% → Development Fund** (audits, features, team expansion)
  - **25% → Protocol Owner** (maintenance & operations)

**Vote Power Multipliers:**
- **Base Vote:** 1x scream power
- **Holder Bonus:** 2x if you hold the token you're screaming for
- **Streak Bonus:** Daily consecutive screams multiply your power:
  - Day 1: 1x
  - Day 2: 2x
  - Day 3: 3x
  - ...up to 10x max

**Example:** If you hold tokens and have a 5-day streak, your scream = 1 × 2 (holder) × 5 (streak) = **10x power!**

### Leaderboards

**Daily Contest:**
- Resets every 24 hours
- Top 5 tokens get prime homepage exposure
- Fresh competition daily keeps engagement high

**All-Time Leaderboard:**
- Cumulative screams across all time
- Shows which tokens have the strongest community support
- Helps identify legitimate projects vs pump-and-dumps

### Why This Matters

1. **Fair Exposure** - Community decides what deserves attention, not paid promoters
2. **Engagement Loop** - Daily voting creates habit formation and recurring traffic
3. **Holder Alignment** - 2x bonus rewards actual believers, not mercenaries
4. **Streak Gamification** - Incentivizes long-term community building
5. **Revenue Generator** - Every scream adds to platform revenue
6. **Anti-Bot** - 24h cooldown + cost prevents spam

### Revenue Potential

At 1,000 daily screams (0.5 MON/day = 182.5 MON/year):

**Annual Distribution @ $1.5k MON:**
- **Community Treasury (50%):** 91.25 MON (~$137k) - DAO-controlled
- **Development Fund (25%):** 45.6 MON (~$68k) - Audits, features, team
- **Protocol Owner (25%):** 45.6 MON (~$68k) - Operations

**Why This Matters:**
- **Community gets MORE than the protocol owner** - builds massive trust
- Development fund ensures long-term sustainability
- Creates alignment between platform success and community wealth
- Future DAO can decide on airdrops, staking rewards, buybacks, etc.

This is **in addition** to trading fees!

## 🏗️ Architecture

### Smart Contracts
1. **ScreamFactory.sol** - Main factory for creating meme tokens
2. **BondingCurve.sol** - Bonding curve with rage tax logic
3. **ScreamToken.sol** - ERC20 token template
4. **RAGEFund.sol** - Accumulates and distributes rage taxes
5. **CustomUniswapV2Factory.sol** - Custom AMM factory with fee switches
6. **CustomUniswapV2Pair.sol** - Custom pair with 0.3% configurable fees

### Frontend
- Next.js 16 + React 19
- Ethers.js v6
- Tailwind CSS 3.4
- Wallet connection with MetaMask
- Real-time token stats
- **Image upload** for token branding
- **Rage Sell button** with warning
- **Scream sound** on every buy 🔊
- **Token showcases** (Recently Created, About to Migrate, Migrated)
- **King of Scream leaderboard**
- Monad cyan/blue gradient theme
- Integrated Monad official logo

## 📦 Installation

### Prerequisites
- Node.js 22 LTS (already installed via nvm)
- MetaMask browser extension
- MON tokens for gas (Monad testnet/mainnet)

### Install Dependencies

```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

## 🚀 Deployment

### Step 1: Configure Environment

Create `.env` file in root directory:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=your_private_key_here
DEV_WALLET=0xYourDevWalletAddress
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz
```

### Step 2: Compile Contracts

```bash
npm run compile
```

### Step 3: Deploy to Monad Testnet

```bash
npm run deploy:testnet
```

This will:
1. Deploy RAGEFund
2. Deploy CustomUniswapV2Factory
3. Deploy ScreamFactory
4. Configure fee recipients
5. Save deployment info to `deployment.json`

### Step 4: Update Frontend Config

Create `frontend/.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local` with addresses from `deployment.json`:
```env
NEXT_PUBLIC_SCREAM_FACTORY=0x...
NEXT_PUBLIC_RAGE_FUND=0x...
NEXT_PUBLIC_UNISWAP_FACTORY=0x...
NEXT_PUBLIC_NETWORK=testnet
```

### Step 5: Run Frontend

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000

## 🎮 Usage

### Creating a Token

1. Connect your wallet
2. Switch to Monad Testnet (chain ID 10143)
3. Fill in token details:
   - Token Name
   - Token Symbol
   - **Token Image** (upload local file)
   - **X Profile** (optional Twitter/X handle)
   - **Creator Allocation** (0-10%, optional)
   - **Referral Code** (optional, earn 0.05% commission)
4. Review tokenomics breakdown
5. Click "Create Token (FREE)"
6. Confirm transaction

### Buying Tokens

1. Select a token from the list
2. Enter MON amount to spend
3. Click "Buy"
4. Hear the scream! 🔊

### Selling Tokens

1. Enter token amount to sell
2. If selling at >10% loss, you'll see a rage tax warning
3. Click "Sell" for normal sell
4. Or click **"😱 RAGE SELL"** to accept the 2% tax

### Claiming RAGE Rewards

- RAGE fund accumulates from trading fees and rage taxes
- Periodic distributions to all token holders
- Use the claim function when available

## 📝 Smart Contract Commands

```bash
# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet

# Create test token (after deployment)
npm run create-token:testnet

# Run tests
npm test

# Run local Hardhat node
npm run node
```

## 🔧 Frontend Commands

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## 🌐 Network Configuration

### Monad Testnet
- Chain ID: `10143` (0x279F)
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadexplorer.com`
- Currency: MON

### Monad Mainnet
- Chain ID: `143` (0x8F)
- RPC: `https://rpc.monad.xyz`
- Explorer: `https://monadexplorer.com`
- Currency: MON

## 📊 Deployed Contract Addresses

### Monad Testnet (Current Deployment)
```
ScreamFactory:           0x7cff4191E85d06f490289737b13A7Ab4FCa5320a
RAGEFund:                0xd22f524661d75E7e5ed0C066352aF82D2FD0Dc5A
CustomUniswapV2Factory:  0x57E508bBF0CB7CD6f5340cd8bD15d8cCd4fFe0e1
Dev Wallet:              0xe891d92ed8cbb30c1df98e30e35bf3b0787b983c
```

**Testnet Explorer:**
- [View on Monad Testnet Explorer](https://testnet.monadexplorer.com)

After your deployment, addresses will also be saved in `deployment.json`:

```json
{
  "contracts": {
    "rageFund": "0x...",
    "uniswapFactory": "0x...",
    "screamFactory": "0x..."
  }
}
```

## 🎨 Customization

### Add Scream Sound

1. Download a scream sound effect (MP3 format)
2. Place it in `frontend/public/scream.mp3`
3. The sound plays automatically on every buy!

### Modify Fees

Edit `contracts/BondingCurve.sol`:
```solidity
uint256 public constant TRADING_FEE_BPS = 40; // 0.4%
uint256 public constant RAGE_TAX_BPS = 200; // 2%
```

### Change Migration Threshold

```solidity
uint256 public constant MIGRATION_THRESHOLD = 85 ether; // 85 MON on Monad
```

## 🔒 Security Features

- ✅ No creator fees (creators can't rug)
- ✅ Trading disabled until bonding curve allows
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Slippage protection on buys/sells
- ✅ OpenZeppelin audited contracts
- ✅ Rage tax discourages panic selling
- ✅ Auto-migration to decentralized AMM

## 🐛 Troubleshooting

### "Insufficient funds" error
- Make sure you have MON tokens for gas
- Get testnet MON from Monad faucet

### "Wrong network" warning
- Click "Connect Wallet" to auto-switch to Monad
- Or manually add Monad network to MetaMask

### Frontend not showing tokens
- Check contract addresses in `frontend/.env.local`
- Make sure contracts are deployed
- Check browser console for errors

### Transaction failing
- Increase slippage tolerance
- Check you have enough token balance
- Verify contract hasn't migrated to AMM

## 📊 Detailed Tokenomics

### Supply Distribution
- **1 Billion** total supply per token
- **800M tokens (80%)** available on bonding curve
- **200M tokens (20%)** auto-locked in DEX liquidity at migration

### Trading Fees (0.4% total)
- **0.2%** → Dev wallet (platform revenue)
- **0.2%** → RAGE fund (accumulates for holder rewards)

### RAGE Tax (2% on panic sells)
Applied when selling at >10% loss from average buy price:
- **90%** → RAGE fund (distributed to holders at migration!)
- **10%** → Dev wallet

### Creator Allocation (Optional 0-10%)
- **50%** unlocked immediately (for marketing, liquidity, etc.)
- **50%** vested until migration (aligned incentives)

### Anti-Snipe Protection
- **5 minutes** complete lock after launch
- **30 minutes** gradual unlock period
- No max buy limits (fair for all)

### Referral System
- **0.05%** commission from dev fee portion
- Paid on all trades from referred tokens
- Passive income for promoters

## 📱 Features

- ✅ Create unlimited meme tokens (FREE for users)
- ✅ Fair launch bonding curve (no presales)
- ✅ Rage tax on panic sellers (diamond hands rewarded)
- ✅ Auto-migration to DEX at 85 MON
- ✅ RAGE fund distribution to holders with vesting
- ✅ Image uploads for token branding
- ✅ **"Scream for Your Token" community voting with streak bonuses**
- ✅ King of Scream leaderboard
- ✅ Token showcase sections
- ✅ Real-time stats and progress bars
- ✅ Wallet integration (MetaMask)
- ✅ Mobile responsive design
- ✅ Scream sound effects 🔊 (with mute toggle)
- ✅ Referral system
- ✅ Anti-snipe protection
- ✅ Creator allocation options

## 💎 Why Scream.fun?

1. **Community-First** - 50% of voting revenue to community treasury (MORE than protocol owner!)
2. **Zero Creator Fees** - No rug pulls, no honeypots
3. **Fair Launch** - Everyone buys from bonding curve
4. **Rage Tax** - Punishes panic sellers, rewards diamond hands
5. **Auto Migration** - Becomes a real DEX pair at threshold
6. **Profit Sharing** - Dev fees + RAGE distributions
7. **Future DAO** - Progressive decentralization roadmap
8. **Monad Speed** - 10k TPS, near-instant finality
9. **Low Fees** - Cheap gas on Monad

## 🚀 Roadmap

### Completed ✅
- [x] Core contracts (6 production-ready contracts)
- [x] Bonding curve with rage tax
- [x] Custom AMM with fee switches
- [x] Frontend MVP with Next.js 16
- [x] Wallet integration (MetaMask)
- [x] **Deploy to Monad testnet**
- [x] **Image upload for tokens**
- [x] **Token showcases** (Recently Created, About to Migrate, Migrated)
- [x] **King of Scream leaderboard**
- [x] **"Scream for Your Token" community voting system**
- [x] **Daily & all-time voting leaderboards**
- [x] **Streak bonuses & holder multipliers**
- [x] **Sound mute toggle**
- [x] **Referral system**
- [x] **Anti-snipe protection**
- [x] **Creator allocation with vesting**
- [x] **Diamond Hands Rewards with vesting**
- [x] **Monad branding integration**

### In Progress 🚧
- [ ] Testing all features on testnet
- [ ] RAGE fund vesting contract implementation
- [ ] Comprehensive documentation

### Planned 📋
- [ ] Security audit
- [ ] Deploy to Monad mainnet
- [ ] Advanced token charts
- [ ] Mobile-optimized interface
- [ ] Multi-token RAGE distribution
- [ ] Governance features
- [ ] Analytics dashboard

## 📄 License

MIT License - Go build, go make money.

## 🤝 Contributing

This is your money printer. Fork it, improve it, deploy it.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Not financial advice. DYOR.

---

**Built with ❤️ (and rage) for the Monad ecosystem.**

Let's make you rich. 🚀
