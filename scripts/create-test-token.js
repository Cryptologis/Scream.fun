const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");

async function main() {
  console.log("🎨 Creating test meme token on Scream.fun...\n");

  const [creator] = await ethers.getSigners();
  console.log("Creating token with account:", creator.address);

  // Load deployment info
  let screamFactoryAddress;

  try {
    const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
    screamFactoryAddress = deployment.contracts.screamFactory;
  } catch (e) {
    console.error("❌ deployment.json not found. Run deployment first!");
    process.exit(1);
  }

  console.log("ScreamFactory address:", screamFactoryAddress);

  // Connect to ScreamFactory
  const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
  const factory = ScreamFactory.attach(screamFactoryAddress);

  // Create token
  console.log("\n🚀 Creating token: SCREAM / Scream Coin...");
  const tx = await factory.createToken("Scream Coin", "SCREAM");
  const receipt = await tx.wait();

  // Find TokenCreated event
  const event = receipt.logs.find(
    (log) => {
      try {
        return factory.interface.parseLog(log).name === "TokenCreated";
      } catch {
        return false;
      }
    }
  );

  if (event) {
    const parsed = factory.interface.parseLog(event);
    const tokenAddress = parsed.args.token;
    const bondingCurveAddress = parsed.args.bondingCurve;

    console.log("\n✅ Token created successfully!");
    console.log("Token address:", tokenAddress);
    console.log("BondingCurve address:", bondingCurveAddress);

    // Test buying tokens
    console.log("\n💰 Testing token purchase (0.1 ETH)...");
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    const curve = BondingCurve.attach(bondingCurveAddress);

    const buyTx = await curve.buy(0, { value: ethers.parseEther("0.1") });
    await buyTx.wait();

    console.log("✅ Purchase successful!");

    // Get token info
    const ScreamToken = await ethers.getContractFactory("ScreamToken");
    const token = ScreamToken.attach(tokenAddress);
    const balance = await token.balanceOf(creator.address);
    const price = await curve.getCurrentPrice();
    const marketCap = await curve.getMarketCap();

    console.log("\n📊 Token Stats:");
    console.log("Your balance:", ethers.formatEther(balance), "SCREAM");
    console.log("Current price:", ethers.formatEther(price), "ETH per token");
    console.log("Market cap:", ethers.formatEther(marketCap), "ETH");

    // Save test token info
    const testTokenInfo = {
      name: "Scream Coin",
      symbol: "SCREAM",
      token: tokenAddress,
      bondingCurve: bondingCurveAddress,
      creator: creator.address,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      "test-token.json",
      JSON.stringify(testTokenInfo, null, 2)
    );
    console.log("\n💾 Test token info saved to test-token.json");
  } else {
    console.log("❌ Could not find TokenCreated event");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
