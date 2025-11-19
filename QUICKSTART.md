# 🚀 SCREAM.FUN - Quick Start Guide

Get your launchpad live in 10 minutes!

## ⚡ One-Command Setup

### 1. Install Dependencies (1 min)

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment (2 min)

```bash
# Root directory
cp .env.example .env
nano .env  # Add your PRIVATE_KEY and DEV_WALLET

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Compile Contracts (30 sec)

```bash
npm run compile
```

### 4. Deploy to Monad Testnet (1 min)

```bash
npm run deploy:testnet
```

Copy the contract addresses from output to `frontend/.env.local`:
```env
NEXT_PUBLIC_SCREAM_FACTORY=0x...
NEXT_PUBLIC_RAGE_FUND=0x...
NEXT_PUBLIC_UNISWAP_FACTORY=0x...
```

### 5. Create Test Token (30 sec)

```bash
npm run create-token:testnet
```

### 6. Start Frontend (30 sec)

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 🎉

## 🎮 Test Full Flow

1. **Connect Wallet** → MetaMask auto-switches to Monad Testnet
2. **Create Token** → Name: "Test Coin", Symbol: "TEST"
3. **Buy Tokens** → Buy 0.1 ETH worth → Hear scream! 🔊
4. **Check Stats** → See price, market cap, RAGE fund
5. **Try Rage Sell** → Sell at loss to trigger 2% tax warning
6. **Normal Sell** → Sell without rage tax

## 📋 Pre-Flight Checklist

Before mainnet deployment:

- [ ] Private key secured (hardware wallet recommended)
- [ ] Dev wallet address correct
- [ ] Sufficient MON for gas (~0.5 MON should cover everything)
- [ ] Contracts compiled without errors
- [ ] Tested full flow on testnet
- [ ] Frontend displays correct data
- [ ] Scream sound works
- [ ] Contract addresses saved
- [ ] Backup of private keys
- [ ] Domain name ready (optional)

## 🔥 Mainnet Deployment

When ready to go live:

```bash
# 1. Switch to mainnet config
nano .env  # Set MONAD_MAINNET_RPC

# 2. Deploy
npm run deploy:mainnet

# 3. Update frontend
nano frontend/.env.local  # Add mainnet addresses
```

## 💰 Earnings Dashboard

After deployment, track your earnings:

- **Dev Wallet** - Receives 50% of trading fees + 30% of rage taxes
- **RAGE Fund** - Accumulates for holder distributions
- **Transaction Volume** - Monitor via block explorer

## 🎯 Revenue Calculations

Example: 100 ETH daily volume

**Phase 1 (Bonding Curve):**
- Trading fees: 100 ETH × 0.4% = 0.4 ETH
  - Your cut: 0.2 ETH/day
- Rage taxes (assume 10% of sells trigger): 10 ETH × 2% = 0.2 ETH
  - Your cut: 0.06 ETH/day
- **Total: ~0.26 ETH/day = 94.9 ETH/year**

**Phase 2 (DEX):**
- Trading fees: 100 ETH × 0.3% = 0.3 ETH
  - Your cut: 0.15 ETH/day
- **Total: ~0.15 ETH/day = 54.75 ETH/year**

*At 1000 ETH daily volume, multiply by 10x!*

## 🚨 Common Issues

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules cache artifacts
npm install
npm run compile
```

### Wrong Network
```bash
# MetaMask → Add Network manually
Chain ID: 10143 (testnet) or 143 (mainnet)
RPC: https://testnet-rpc.monad.xyz
```

### Out of Gas
- Increase gas limit in MetaMask
- Get more MON from faucet (testnet)

### Frontend Not Loading Tokens
- Check contract addresses in .env.local
- Check browser console for errors
- Verify wallet connected to correct network

## 📞 Support

- Check README.md for full documentation
- Review contract code in `/contracts`
- Test scripts in `/scripts`

## 🎉 You're Ready!

Start printing money. Let's go! 🚀

---

**Pro Tip:** Set up analytics, create a landing page, market on Twitter/Telegram, and watch the volume roll in.
