# 🔥 SCREAM.FUN - Fair Meme Coin Launchpad on Monad

The fairest (and most profitable) Pump.fun-style meme coin launchpad on Monad (EVM L1, 10k TPS).

**ZERO creator fees forever. Dev still eats handsomely.**

## 💰 Revenue Model

### Phase 1 - Bonding Curve (Pre-Migration)
- **0.4% total trading fee**
  - 0.2% → dev wallet
  - 0.2% → RAGE fund
- **2% rage tax** if someone sells at >10% loss from their average buy price
  - 70% → RAGE fund
  - 30% → dev wallet

### Phase 2 - After Migration to AMM
- Liquidity migrates to custom Uniswap V2-style pair at 85 ETH market cap
- **0.3% total trading fee forever**
  - 0.15% → dev wallet
  - 0.10% → RAGE fund (distributed to holders)
  - 0.05% → auto-buyback & burn (optional)
- RAGE fund auto-distributes pro-rata to all current holders monthly or on milestone

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
- Tailwind CSS
- Wallet connection with MetaMask
- Real-time token stats
- **Rage Sell button** with warning
- **Scream sound** on every buy 🔊

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
3. Fill in token name and symbol
4. Click "Create Token (FREE)"
5. Confirm transaction

### Buying Tokens

1. Select a token from the list
2. Enter ETH amount to spend
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

## 📊 Contract Addresses

After deployment, your addresses will be in `deployment.json`:

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
uint256 public constant MIGRATION_THRESHOLD = 85 ether;
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

## 📱 Features

- ✅ Create unlimited meme tokens (FREE)
- ✅ Fair launch bonding curve
- ✅ Rage tax on panic sellers
- ✅ Auto-migration to DEX at 85 ETH
- ✅ RAGE fund distribution to holders
- ✅ Real-time price charts
- ✅ Wallet integration
- ✅ Mobile responsive
- ✅ Scream sound effects
- ✅ Live dev earnings dashboard
- ✅ Progress bar to migration

## 💎 Why Scream.fun?

1. **Zero Creator Fees** - No rug pulls, no honeypots
2. **Fair Launch** - Everyone buys from bonding curve
3. **Rage Tax** - Punishes panic sellers, rewards diamond hands
4. **Auto Migration** - Becomes a real DEX pair at threshold
5. **Profit Sharing** - Dev fees + RAGE distributions
6. **Monad Speed** - 10k TPS, near-instant finality
7. **Low Fees** - Cheap gas on Monad

## 🚀 Roadmap

- [x] Core contracts
- [x] Bonding curve with rage tax
- [x] Custom AMM with fee switches
- [x] Frontend MVP
- [x] Wallet integration
- [ ] Deploy to Monad testnet
- [ ] Test all features
- [ ] Audit contracts
- [ ] Deploy to Monad mainnet
- [ ] Add token charts
- [ ] Add leaderboard
- [ ] Mobile app
- [ ] Multi-token RAGE distribution
- [ ] Governance token

## 📄 License

MIT License - Go build, go make money.

## 🤝 Contributing

This is your money printer. Fork it, improve it, deploy it.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Not financial advice. DYOR.

---

**Built with ❤️ (and rage) for the Monad ecosystem.**

Let's make you rich. 🚀
