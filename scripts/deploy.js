const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Scream.fun contracts to Monad...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get wallets from env or use deployer
  const devWallet = process.env.DEV_WALLET || deployer.address;
  const developmentFund = process.env.DEVELOPMENT_FUND || deployer.address;
  const communityTreasury = process.env.COMMUNITY_TREASURY || deployer.address;

  console.log("Dev wallet set to:", devWallet);
  console.log("Development fund set to:", developmentFund);
  console.log("Community treasury set to:", communityTreasury);

  // 1. Deploy RAGEFund
  console.log("\n📦 Deploying RAGEFund...");
  const RAGEFund = await ethers.getContractFactory("RAGEFund");
  const rageFund = await RAGEFund.deploy(devWallet);
  await rageFund.waitForDeployment();
  const rageFundAddress = await rageFund.getAddress();
  console.log("✅ RAGEFund deployed to:", rageFundAddress);

  // 2. Deploy WMON (Wrapped MON)
  console.log("\n📦 Deploying WMON...");
  const WMON = await ethers.getContractFactory("WMON");
  const wmon = await WMON.deploy();
  await wmon.waitForDeployment();
  const wmonAddress = await wmon.getAddress();
  console.log("✅ WMON deployed to:", wmonAddress);

  // 3. Deploy CustomUniswapV2Factory
  console.log("\n📦 Deploying CustomUniswapV2Factory...");
  const CustomFactory = await ethers.getContractFactory("CustomUniswapV2Factory");
  const uniswapFactory = await CustomFactory.deploy(devWallet);
  await uniswapFactory.waitForDeployment();
  const uniswapFactoryAddress = await uniswapFactory.getAddress();
  console.log("✅ CustomUniswapV2Factory deployed to:", uniswapFactoryAddress);

  // 4. Set fee recipients on factory
  console.log("\n⚙️  Configuring fee recipients...");
  await uniswapFactory.setFeeTo(devWallet);
  await uniswapFactory.setCommunityFeeTo(rageFundAddress);
  console.log("✅ Fee recipients configured");

  // 5. Deploy ScreamFactory
  console.log("\n📦 Deploying ScreamFactory...");
  const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
  const screamFactory = await ScreamFactory.deploy(
    devWallet,
    rageFundAddress,
    uniswapFactoryAddress,
    wmonAddress,
    developmentFund,
    communityTreasury
  );
  await screamFactory.waitForDeployment();
  const screamFactoryAddress = await screamFactory.getAddress();
  console.log("✅ ScreamFactory deployed to:", screamFactoryAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log(`WMON:                    ${wmonAddress}`);
  console.log(`RAGEFund:                ${rageFundAddress}`);
  console.log(`CustomUniswapV2Factory:  ${uniswapFactoryAddress}`);
  console.log(`ScreamFactory:           ${screamFactoryAddress}`);
  console.log(`\n💰 Wallet Addresses:\n`);
  console.log(`Dev Wallet (25%):        ${devWallet}`);
  console.log(`Development Fund (25%):  ${developmentFund}`);
  console.log(`Community Treasury (50%): ${communityTreasury}`);

  console.log("\n" + "=".repeat(60));
  console.log("📝 Next Steps:");
  console.log("=".repeat(60));
  console.log("\n1. Save these addresses to your frontend .env.local:");
  console.log(`   NEXT_PUBLIC_WMON=${wmonAddress}`);
  console.log(`   NEXT_PUBLIC_SCREAM_FACTORY=${screamFactoryAddress}`);
  console.log(`   NEXT_PUBLIC_RAGE_FUND=${rageFundAddress}`);
  console.log(`   NEXT_PUBLIC_UNISWAP_FACTORY=${uniswapFactoryAddress}`);

  console.log("\n2. Test creating a token:");
  console.log(`   npm run create-token:testnet`);

  console.log("\n" + "=".repeat(60) + "\n");

  // Write deployment info to file
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    wallets: {
      devWallet: devWallet,
      developmentFund: developmentFund,
      communityTreasury: communityTreasury,
    },
    contracts: {
      wmon: wmonAddress,
      rageFund: rageFundAddress,
      uniswapFactory: uniswapFactoryAddress,
      screamFactory: screamFactoryAddress,
    },
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to deployment.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
