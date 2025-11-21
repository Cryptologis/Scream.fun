const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * Deployment script for Scream.fun with Price Oracle integration
 *
 * This script deploys all contracts including a MockPriceOracle for testing.
 * In production, replace MockPriceOracle with a real Chainlink or Monad oracle.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Configuration
  const DEV_WALLET = deployer.address; // Replace with actual dev wallet
  const DEVELOPMENT_FUND = deployer.address; // Replace with actual development fund
  const COMMUNITY_TREASURY = deployer.address; // Replace with actual community treasury

  // Initial MON price for testing (8 decimals)
  // $25.00 = 25_00000000
  const INITIAL_MON_PRICE_USD = ethers.parseUnits("25", 8);

  console.log("\n📊 Deployment Configuration:");
  console.log("- Dev Wallet:", DEV_WALLET);
  console.log("- Development Fund:", DEVELOPMENT_FUND);
  console.log("- Community Treasury:", COMMUNITY_TREASURY);
  console.log("- Initial MON Price:", "$" + ethers.formatUnits(INITIAL_MON_PRICE_USD, 8));

  // 1. Deploy WMON (Wrapped MON)
  console.log("\n1️⃣ Deploying WMON...");
  const WMON = await ethers.getContractFactory("WMON");
  const wmon = await WMON.deploy();
  await wmon.waitForDeployment();
  const wmonAddress = await wmon.getAddress();
  console.log("✅ WMON deployed to:", wmonAddress);

  // 2. Deploy Price Oracle (MockPriceOracle for testing)
  console.log("\n2️⃣ Deploying Price Oracle...");
  const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
  const priceOracle = await MockPriceOracle.deploy(INITIAL_MON_PRICE_USD);
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ Price Oracle deployed to:", priceOracleAddress);
  console.log("   Initial price set to: $" + ethers.formatUnits(INITIAL_MON_PRICE_USD, 8));

  // 3. Deploy Custom Uniswap V2 Factory
  console.log("\n3️⃣ Deploying Custom Uniswap V2 Factory...");
  const CustomUniswapV2Factory = await ethers.getContractFactory("CustomUniswapV2Factory");
  const uniswapFactory = await CustomUniswapV2Factory.deploy(DEV_WALLET);
  await uniswapFactory.waitForDeployment();
  const uniswapFactoryAddress = await uniswapFactory.getAddress();
  console.log("✅ Uniswap Factory deployed to:", uniswapFactoryAddress);

  // 4. Deploy RAGE Fund
  console.log("\n4️⃣ Deploying RAGE Fund...");
  const RAGEFund = await ethers.getContractFactory("RAGEFund");
  const rageFund = await RAGEFund.deploy(DEV_WALLET);
  await rageFund.waitForDeployment();
  const rageFundAddress = await rageFund.getAddress();
  console.log("✅ RAGE Fund deployed to:", rageFundAddress);

  // 5. Deploy Scream Factory
  console.log("\n5️⃣ Deploying Scream Factory...");
  const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
  const screamFactory = await ScreamFactory.deploy(
    DEV_WALLET,
    rageFundAddress,
    uniswapFactoryAddress,
    wmonAddress,
    priceOracleAddress,
    DEVELOPMENT_FUND,
    COMMUNITY_TREASURY
  );
  await screamFactory.waitForDeployment();
  const screamFactoryAddress = await screamFactory.getAddress();
  console.log("✅ Scream Factory deployed to:", screamFactoryAddress);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📝 Contract Addresses:");
  console.log("   WMON:", wmonAddress);
  console.log("   Price Oracle:", priceOracleAddress);
  console.log("   Uniswap Factory:", uniswapFactoryAddress);
  console.log("   RAGE Fund:", rageFundAddress);
  console.log("   Scream Factory:", screamFactoryAddress);

  console.log("\n💡 Key Features:");
  console.log("   ✅ USD-stable migration threshold ($69,000)");
  console.log("   ✅ USD-stable liquidity allocation ($12,000)");
  console.log("   ✅ Oracle safety mechanisms (staleness check, health check)");
  console.log("   ✅ Fallback to hardcoded thresholds if oracle fails");
  console.log("   ✅ Admin functions to update/disable oracle");

  console.log("\n🔧 Oracle Management:");
  console.log("   • Update price: priceOracle.setPrice(newPrice)");
  console.log("   • Disable oracle: bondingCurve.disableOracle()");
  console.log("   • Enable oracle: bondingCurve.enableOracle()");
  console.log("   • Set new oracle: bondingCurve.setOracle(newAddress)");

  console.log("\n📊 Testing Different MON Prices:");
  console.log("   At $1/MON:  Migration at 69,000 MON, liquidity = 12,000 MON");
  console.log("   At $25/MON: Migration at 2,760 MON, liquidity = 480 MON");
  console.log("   At $100/MON: Migration at 690 MON, liquidity = 120 MON");

  console.log("\n⚠️  IMPORTANT FOR PRODUCTION:");
  console.log("   Replace MockPriceOracle with a real oracle (Chainlink, etc.)");
  console.log("   Update DEV_WALLET, DEVELOPMENT_FUND, and COMMUNITY_TREASURY");
  console.log("   Verify all contracts on block explorer");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      wmon: wmonAddress,
      priceOracle: priceOracleAddress,
      uniswapFactory: uniswapFactoryAddress,
      rageFund: rageFundAddress,
      screamFactory: screamFactoryAddress
    },
    config: {
      devWallet: DEV_WALLET,
      developmentFund: DEVELOPMENT_FUND,
      communityTreasury: COMMUNITY_TREASURY,
      initialMonPrice: ethers.formatUnits(INITIAL_MON_PRICE_USD, 8)
    }
  };

  const fs = require('fs');
  const deploymentPath = `./deployments/${hre.network.name}-oracle-deployment.json`;
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
