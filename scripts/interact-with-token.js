const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");
const readline = require("readline");

// Interactive CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("\n💎 Scream.fun Token Interaction Tool\n");

  const [user] = await ethers.getSigners();
  console.log("Connected account:", user.address);

  const balance = await ethers.provider.getBalance(user.address);
  console.log("MON balance:", ethers.formatEther(balance), "MON\n");

  // Load tokens
  let allTokens = [];
  try {
    const data = fs.readFileSync("local-tokens.json", "utf8");
    allTokens = JSON.parse(data);
  } catch (e) {
    console.log("❌ No tokens found. Create one first with 'npm run custom-token:local'");
    process.exit(0);
  }

  if (allTokens.length === 0) {
    console.log("❌ No tokens found. Create one first with 'npm run custom-token:local'");
    process.exit(0);
  }

  // Show token list
  console.log("📋 Available Tokens:\n");
  allTokens.forEach((t, i) => {
    console.log(`[${i + 1}] ${t.name} (${t.symbol})`);
    console.log(`    Token: ${t.token}`);
    console.log(`    Curve: ${t.bondingCurve}\n`);
  });

  // Select token
  const selection = await question(
    `Select a token (1-${allTokens.length}): `
  );
  const tokenIndex = parseInt(selection) - 1;

  if (tokenIndex < 0 || tokenIndex >= allTokens.length) {
    console.log("❌ Invalid selection");
    rl.close();
    return;
  }

  const selectedToken = allTokens[tokenIndex];
  console.log(`\n✅ Selected: ${selectedToken.name} (${selectedToken.symbol})\n`);

  // Connect to contracts
  const ScreamToken = await ethers.getContractFactory("ScreamToken");
  const token = ScreamToken.attach(selectedToken.token);

  const BondingCurve = await ethers.getContractFactory("BondingCurve");
  const curve = BondingCurve.attach(selectedToken.bondingCurve);

  // Show current stats
  await showStats(token, curve, user.address, selectedToken.symbol);

  // Action menu
  while (true) {
    console.log("\n━".repeat(60));
    console.log("What would you like to do?\n");
    console.log("[1] Buy tokens");
    console.log("[2] Sell tokens");
    console.log("[3] Check stats");
    console.log("[4] Exit");
    console.log("━".repeat(60));

    const action = await question("\nSelect action (1-4): ");

    if (action === "1") {
      // Buy tokens
      const amount = await question("Enter MON amount to spend (e.g., 0.5): ");
      const monAmount = parseFloat(amount);

      if (monAmount <= 0 || isNaN(monAmount)) {
        console.log("❌ Invalid amount");
        continue;
      }

      console.log(`\n💰 Buying ${monAmount} MON worth of ${selectedToken.symbol}...`);
      try {
        const buyTx = await curve.buy(0, {
          value: ethers.parseEther(amount),
        });
        await buyTx.wait();
        console.log("✅ Purchase successful!");
        await showStats(token, curve, user.address, selectedToken.symbol);
      } catch (error) {
        console.log("❌ Purchase failed:", error.message);
      }
    } else if (action === "2") {
      // Sell tokens
      const tokenBalance = await token.balanceOf(user.address);
      const balanceFormatted = ethers.formatEther(tokenBalance);

      if (tokenBalance === 0n) {
        console.log("❌ You don't have any tokens to sell");
        continue;
      }

      console.log(`\nYou have: ${balanceFormatted} ${selectedToken.symbol}`);
      const amount = await question(
        `Enter ${selectedToken.symbol} amount to sell: `
      );
      const tokenAmount = parseFloat(amount);

      if (tokenAmount <= 0 || isNaN(tokenAmount) || tokenAmount > parseFloat(balanceFormatted)) {
        console.log("❌ Invalid amount");
        continue;
      }

      console.log(`\n💸 Selling ${tokenAmount} ${selectedToken.symbol}...`);
      try {
        const sellTx = await curve.sell(ethers.parseEther(amount.toString()), 0);
        await sellTx.wait();
        console.log("✅ Sale successful!");
        await showStats(token, curve, user.address, selectedToken.symbol);
      } catch (error) {
        console.log("❌ Sale failed:", error.message);
      }
    } else if (action === "3") {
      // Check stats
      await showStats(token, curve, user.address, selectedToken.symbol);
    } else if (action === "4") {
      // Exit
      console.log("\n👋 Goodbye!\n");
      break;
    } else {
      console.log("❌ Invalid action");
    }
  }

  rl.close();
}

async function showStats(token, curve, userAddress, symbol) {
  console.log("\n📊 Current Stats:");
  console.log("━".repeat(60));

  const tokenBalance = await token.balanceOf(userAddress);
  const currentPrice = await curve.getCurrentPrice();
  const marketCap = await curve.getMarketCap();
  const totalSupply = await token.totalSupply();
  const monBalance = await ethers.provider.getBalance(userAddress);

  console.log(`Your ${symbol} Balance:  ${ethers.formatEther(tokenBalance)}`);
  console.log(`Your MON Balance:       ${ethers.formatEther(monBalance)}`);
  console.log(`Current Price:          ${ethers.formatEther(currentPrice)} MON per token`);
  console.log(`Market Cap:             ${ethers.formatEther(marketCap)} MON`);
  console.log(`Total Supply:           ${ethers.formatEther(totalSupply)} ${symbol}`);
  console.log("━".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    rl.close();
    process.exit(1);
  });
