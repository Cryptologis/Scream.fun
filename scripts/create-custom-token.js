const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");

async function main() {
  // ========================================
  // CUSTOMIZE YOUR TOKEN HERE
  // ========================================
  const TOKEN_NAME = "My Awesome Token";
  const TOKEN_SYMBOL = "AWESOME";
  const INITIAL_BUY_AMOUNT = "0.5"; // MON to spend on initial purchase
  // ========================================

  console.log(`🎨 Creating custom token: ${TOKEN_NAME} (${TOKEN_SYMBOL})\n`);

  const [creator] = await ethers.getSigners();
  console.log("Creator account:", creator.address);

  const balance = await ethers.provider.getBalance(creator.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON\n");

  // Load deployment info
  let deployment;
  try {
    deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  } catch (e) {
    console.error("❌ deployment.json not found. Run 'npm run deploy:local' first!");
    process.exit(1);
  }

  const screamFactoryAddress = deployment.contracts.screamFactory;
  console.log("ScreamFactory:", screamFactoryAddress);

  // Connect to ScreamFactory
  const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
  const factory = ScreamFactory.attach(screamFactoryAddress);

  // Create token
  console.log(`\n🚀 Creating token: ${TOKEN_SYMBOL} / ${TOKEN_NAME}...`);
  const tx = await factory.createToken(TOKEN_NAME, TOKEN_SYMBOL);
  const receipt = await tx.wait();

  console.log("✅ Transaction confirmed!");

  // Find TokenCreated event
  const event = receipt.logs.find((log) => {
    try {
      return factory.interface.parseLog(log).name === "TokenCreated";
    } catch {
      return false;
    }
  });

  if (!event) {
    console.log("❌ Could not find TokenCreated event");
    process.exit(1);
  }

  const parsed = factory.interface.parseLog(event);
  const tokenAddress = parsed.args.token;
  const bondingCurveAddress = parsed.args.bondingCurve;

  console.log("\n✅ Token created successfully!");
  console.log("━".repeat(60));
  console.log(`Token Contract:        ${tokenAddress}`);
  console.log(`BondingCurve Contract: ${bondingCurveAddress}`);
  console.log("━".repeat(60));

  // Buy tokens if specified
  if (parseFloat(INITIAL_BUY_AMOUNT) > 0) {
    console.log(`\n💰 Buying ${INITIAL_BUY_AMOUNT} MON worth of ${TOKEN_SYMBOL}...`);
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    const curve = BondingCurve.attach(bondingCurveAddress);

    const buyTx = await curve.buy(0, {
      value: ethers.parseEther(INITIAL_BUY_AMOUNT),
    });
    await buyTx.wait();

    console.log("✅ Purchase successful!");

    // Get updated stats
    const ScreamToken = await ethers.getContractFactory("ScreamToken");
    const token = ScreamToken.attach(tokenAddress);
    const tokenBalance = await token.balanceOf(creator.address);
    const currentPrice = await curve.getCurrentPrice();
    const marketCap = await curve.getMarketCap();
    const totalSupply = await token.totalSupply();

    console.log("\n📊 Token Stats:");
    console.log("━".repeat(60));
    console.log(`Your Balance:     ${ethers.formatEther(tokenBalance)} ${TOKEN_SYMBOL}`);
    console.log(`Current Price:    ${ethers.formatEther(currentPrice)} MON per token`);
    console.log(`Market Cap:       ${ethers.formatEther(marketCap)} MON`);
    console.log(`Total Supply:     ${ethers.formatEther(totalSupply)} ${TOKEN_SYMBOL}`);
    console.log("━".repeat(60));
  }

  // Save token info
  const tokenInfo = {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    token: tokenAddress,
    bondingCurve: bondingCurveAddress,
    creator: creator.address,
    createdAt: new Date().toISOString(),
    initialBuy: INITIAL_BUY_AMOUNT,
  };

  // Append to tokens list
  let allTokens = [];
  try {
    const existing = fs.readFileSync("local-tokens.json", "utf8");
    allTokens = JSON.parse(existing);
  } catch (e) {
    // File doesn't exist yet, start fresh
  }

  allTokens.push(tokenInfo);
  fs.writeFileSync("local-tokens.json", JSON.stringify(allTokens, null, 2));

  console.log("\n💾 Token info saved to local-tokens.json");
  console.log(`\n✨ ${TOKEN_NAME} is ready to trade!\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
