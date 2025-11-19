const { ethers } = require("hardhat");
require("dotenv").config();
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Scream.fun contracts to Monad...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get dev wallet from env or use deployer
  const devWallet = process.env.DEV_WALLET || deployer.address;
  console.log("Dev wallet set to:", devWallet);

  // 1. Deploy RAGEFund
  console.log("\n📦 Deploying RAGEFund...");
  const RAGEFund = await ethers.getContractFactory("RAGEFund");
  const rageFund = await RAGEFund.deploy(devWallet);
  await rageFund.waitForDeployment();
  const rageFundAddress = await rageFund.getAddress();
  console.log("✅ RAGEFund deployed to:", rageFundAddress);

  // 2. Deploy CustomUniswapV2Factory
  console.log("\n📦 Deploying CustomUniswapV2Factory...");
  const CustomFactory = await ethers.getContractFactory("CustomUniswapV2Factory");
  const uniswapFactory = await CustomFactory.deploy(devWallet);
  await uniswapFactory.waitForDeployment();
  const uniswapFactoryAddress = await uniswapFactory.getAddress();
  console.log("✅ CustomUniswapV2Factory deployed to:", uniswapFactoryAddress);

  // 3. Set fee recipients on factory
  console.log("\n⚙️  Configuring fee recipients...");
  await uniswapFactory.setFeeTo(devWallet);
  await uniswapFactory.setCommunityFeeTo(rageFundAddress);
  console.log("✅ Fee recipients configured");

  // 4. Deploy ScreamFactory
  console.log("\n📦 Deploying ScreamFactory...");
  const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
  const screamFactory = await ScreamFactory.deploy(
    devWallet,
    rageFundAddress,
    uniswapFactoryAddress
  );
  await screamFactory.waitForDeployment();
  const screamFactoryAddress = await screamFactory.getAddress();
  console.log("✅ ScreamFactory deployed to:", screamFactoryAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log(`RAGEFund:                ${rageFundAddress}`);
  console.log(`CustomUniswapV2Factory:  ${uniswapFactoryAddress}`);
  console.log(`ScreamFactory:           ${screamFactoryAddress}`);
  console.log(`\nDev Wallet:              ${devWallet}`);

  console.log("\n" + "=".repeat(60));
  console.log("📝 Next Steps:");
  console.log("=".repeat(60));
  console.log("\n1. Save these addresses to your frontend .env.local:");
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
    devWallet: devWallet,
    contracts: {
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
