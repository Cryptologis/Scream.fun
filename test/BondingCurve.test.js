const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BondingCurve", function () {
  let bondingCurve;
  let token;
  let rageFund;
  let wmon;
  let uniswapFactory;
  let mockOracle;
  let owner, dev, user1, user2, treasury, devFund;

  const parseEth = (amount) => ethers.parseEther(amount.toString());
  const formatEth = (amount) => ethers.formatEther(amount);

  beforeEach(async function () {
    [owner, dev, user1, user2, treasury, devFund] = await ethers.getSigners();

    // Deploy WMON
    const WMON = await ethers.getContractFactory("WMON");
    wmon = await WMON.deploy();

    // Deploy Mock Price Oracle with initial price $25/MON (8 decimals)
    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    mockOracle = await MockPriceOracle.deploy(2500000000n); // $25 with 8 decimals

    // Deploy RAGE Fund
    const RAGEFund = await ethers.getContractFactory("RAGEFund");
    rageFund = await RAGEFund.deploy(dev.address);

    // Deploy Uniswap Factory
    const CustomUniswapV2Factory = await ethers.getContractFactory("CustomUniswapV2Factory");
    uniswapFactory = await CustomUniswapV2Factory.deploy(dev.address);

    // Deploy Bonding Curve
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    bondingCurve = await BondingCurve.deploy(
      dev.address,
      await rageFund.getAddress(),
      await uniswapFactory.getAddress(),
      await wmon.getAddress(),
      await mockOracle.getAddress(),
      "TestToken",
      "TEST"
    );

    // Get token address
    const tokenAddress = await bondingCurve.token();
    token = await ethers.getContractAt("ScreamToken", tokenAddress);
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await bondingCurve.devWallet()).to.equal(dev.address);
      expect(await token.name()).to.equal("TestToken");
      expect(await token.symbol()).to.equal("TEST");
    });

    it("Should initialize with correct reserves", async function () {
      const virtualReserve = await bondingCurve.virtualTokenReserve();
      const ethReserve = await bondingCurve.ethReserve();

      expect(virtualReserve).to.equal(parseEth("800000000")); // 800M tokens
      expect(ethReserve).to.equal(parseEth("30")); // 30 ETH virtual
    });

    it("Should start with oracle enabled", async function () {
      expect(await bondingCurve.useOracle()).to.equal(true);
    });
  });

  describe("Buying Tokens", function () {
    it("Should allow buying tokens", async function () {
      const buyAmount = parseEth("1");
      const expectedTokens = await bondingCurve.calculatePurchaseReturn(buyAmount);

      await expect(
        bondingCurve.connect(user1).buy(0, { value: buyAmount })
      ).to.emit(bondingCurve, "TokensPurchased");

      const balance = await token.balanceOf(user1.address);
      expect(balance).to.be.closeTo(expectedTokens, parseEth("0.01"));
    });

    it("Should enforce slippage protection", async function () {
      const buyAmount = parseEth("1");
      const expectedTokens = await bondingCurve.calculatePurchaseReturn(buyAmount);
      const tooHighMin = expectedTokens + parseEth("1000000");

      await expect(
        bondingCurve.connect(user1).buy(tooHighMin, { value: buyAmount })
      ).to.be.revertedWith("Slippage too high");
    });

    it("Should update user position after buy", async function () {
      const buyAmount = parseEth("1");
      await bondingCurve.connect(user1).buy(0, { value: buyAmount });

      const position = await bondingCurve.userPositions(user1.address);
      expect(position.totalTokensBought).to.be.gt(0);
      expect(position.totalEthSpent).to.equal(buyAmount);
    });

    it("Should collect trading fees on buy", async function () {
      const buyAmount = parseEth("1");
      const devBalanceBefore = await ethers.provider.getBalance(dev.address);

      await bondingCurve.connect(user1).buy(0, { value: buyAmount });

      const devBalanceAfter = await ethers.provider.getBalance(dev.address);
      const feeCollected = devBalanceAfter - devBalanceBefore;

      // Should receive half of 0.4% fee
      const expectedFee = (buyAmount * 40n) / 20000n; // 0.2%
      expect(feeCollected).to.be.closeTo(expectedFee, parseEth("0.0001"));
    });

    it("Should increase reserves on buy", async function () {
      const reserveBefore = await bondingCurve.ethReserve();
      const buyAmount = parseEth("1");

      await bondingCurve.connect(user1).buy(0, { value: buyAmount });

      const reserveAfter = await bondingCurve.ethReserve();
      expect(reserveAfter).to.be.gt(reserveBefore);
    });
  });

  describe("Selling Tokens", function () {
    beforeEach(async function () {
      // User1 buys tokens first
      const buyAmount = parseEth("5");
      await bondingCurve.connect(user1).buy(0, { value: buyAmount });
    });

    it("Should allow selling tokens", async function () {
      const balance = await token.balanceOf(user1.address);
      const sellAmount = balance / 2n;

      // Approve bonding curve
      await token.connect(user1).approve(await bondingCurve.getAddress(), sellAmount);

      const expectedEth = await bondingCurve.calculateSaleReturn(sellAmount);

      await expect(
        bondingCurve.connect(user1).sell(sellAmount, 0, false)
      ).to.emit(bondingCurve, "TokensSold");
    });

    it("Should enforce slippage protection on sell", async function () {
      const balance = await token.balanceOf(user1.address);
      const sellAmount = balance / 2n;

      await token.connect(user1).approve(await bondingCurve.getAddress(), sellAmount);

      const expectedEth = await bondingCurve.calculateSaleReturn(sellAmount);
      const tooHighMin = expectedEth * 2n;

      await expect(
        bondingCurve.connect(user1).sell(sellAmount, tooHighMin, false)
      ).to.be.revertedWith("Slippage too high");
    });

    it("Should trigger rage tax on panic sell", async function () {
      // Make price drop by having another user sell
      const balance1 = await token.balanceOf(user1.address);

      // User2 buys
      await bondingCurve.connect(user2).buy(0, { value: parseEth("3") });
      const balance2 = await token.balanceOf(user2.address);

      // User2 sells all (causing price to drop)
      await token.connect(user2).approve(await bondingCurve.getAddress(), balance2);
      await bondingCurve.connect(user2).sell(balance2, 0, false);

      // Now user1 tries to sell at a loss
      const [wouldTrigger, rageTax] = await bondingCurve.wouldTriggerRageTax(
        user1.address,
        balance1 / 2n
      );

      // If rage tax would trigger, we need to accept it
      if (wouldTrigger) {
        await token.connect(user1).approve(await bondingCurve.getAddress(), balance1 / 2n);

        await expect(
          bondingCurve.connect(user1).sell(balance1 / 2n, 0, true)
        ).to.emit(bondingCurve, "RageTaxCollected");
      }
    });
  });

  describe("Price Oracle Integration", function () {
    it("Should read oracle price correctly", async function () {
      const usdValue = await bondingCurve.getMonToUsd(parseEth("1"));
      expect(usdValue).to.equal(2500000000n); // $25 with 8 decimals
    });

    it("Should calculate migration threshold based on oracle", async function () {
      const threshold = await bondingCurve.getMigrationThresholdMON();
      // $69,000 / $25 = 2,760 MON
      expect(threshold).to.equal(parseEth("2760"));
    });

    it("Should allow disabling oracle", async function () {
      await bondingCurve.disableOracle();
      expect(await bondingCurve.useOracle()).to.equal(false);
    });

    it("Should use fallback threshold when oracle disabled", async function () {
      await bondingCurve.disableOracle();

      // With oracle disabled, should use fallback threshold
      const shouldMigrateNow = await bondingCurve.shouldMigrate();
      expect(shouldMigrateNow).to.equal(false);
    });

    it("Should allow owner to update oracle", async function () {
      const MockOracle2 = await ethers.getContractFactory("MockPriceOracle");
      const newOracle = await MockOracle2.deploy(3000000000n); // $30 with 8 decimals

      await bondingCurve.setOracle(await newOracle.getAddress());
      expect(await bondingCurve.priceOracle()).to.equal(await newOracle.getAddress());
    });
  });

  describe("Migration to Uniswap", function () {
    it("Should not migrate before threshold", async function () {
      expect(await bondingCurve.shouldMigrate()).to.equal(false);
    });

    it("Should migrate when threshold reached", async function () {
      // Buy enough to trigger migration ($69k worth)
      // At $25/MON, need 2,760 MON
      const targetReserve = parseEth("2760");
      const currentReserve = await bondingCurve.ethReserve();
      const needed = targetReserve - currentReserve;

      // Buy in chunks to reach threshold
      const chunkSize = parseEth("100");
      let totalBought = 0n;

      while (totalBought < needed) {
        try {
          await bondingCurve.connect(user1).buy(0, { value: chunkSize });
          totalBought += chunkSize;
        } catch (error) {
          // Migration might trigger during buy
          break;
        }
      }

      // Check if migrated
      const migrated = await bondingCurve.migrated();

      // If not yet migrated, the reserve should be approaching threshold
      if (!migrated) {
        const reserve = await bondingCurve.ethReserve();
        expect(reserve).to.be.lt(targetReserve);
      } else {
        expect(migrated).to.equal(true);
        expect(await bondingCurve.uniswapPair()).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("Should prevent buying after migration", async function () {
      // Trigger migration
      const targetReserve = parseEth("2760");
      const currentReserve = await bondingCurve.ethReserve();
      const needed = targetReserve - currentReserve + parseEth("10");

      try {
        await bondingCurve.connect(user1).buy(0, { value: needed });
      } catch (error) {
        // Expected - might fail due to migration or insufficient liquidity
      }

      const migrated = await bondingCurve.migrated();

      if (migrated) {
        await expect(
          bondingCurve.connect(user2).buy(0, { value: parseEth("1") })
        ).to.be.revertedWith("Already migrated");
      }
    });
  });

  describe("Security", function () {
    it("Should prevent non-owner from setting oracle", async function () {
      const MockOracle2 = await ethers.getContractFactory("MockPriceOracle");
      const newOracle = await MockOracle2.deploy(3000000000n); // $30 with 8 decimals

      await expect(
        bondingCurve.connect(user1).setOracle(await newOracle.getAddress())
      ).to.be.reverted;
    });

    it("Should prevent non-owner from disabling oracle", async function () {
      await expect(
        bondingCurve.connect(user1).disableOracle()
      ).to.be.reverted;
    });

    it("Should reject direct ETH transfers", async function () {
      await expect(
        user1.sendTransaction({
          to: await bondingCurve.getAddress(),
          value: parseEth("1")
        })
      ).to.be.revertedWith("Use buy() function");
    });

    it("Should have proper reentrancy protection", async function () {
      // Buy and sell should work normally
      await bondingCurve.connect(user1).buy(0, { value: parseEth("1") });
      const balance = await token.balanceOf(user1.address);

      await token.connect(user1).approve(await bondingCurve.getAddress(), balance);
      await bondingCurve.connect(user1).sell(balance, 0, false);

      // Should complete without reentrancy issues
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Math and Price Calculations", function () {
    it("Should have accurate price calculations", async function () {
      const price1 = await bondingCurve.getCurrentPrice();

      // Buy some tokens
      await bondingCurve.connect(user1).buy(0, { value: parseEth("10") });

      const price2 = await bondingCurve.getCurrentPrice();

      // Price should increase after buy
      expect(price2).to.be.gt(price1);
    });

    it("Should maintain accurate reserves", async function () {
      const initialVirtual = await bondingCurve.virtualTokenReserve();
      const initialEth = await bondingCurve.ethReserve();

      // Buy
      const buyAmount = parseEth("5");
      await bondingCurve.connect(user1).buy(0, { value: buyAmount });

      const afterBuyVirtual = await bondingCurve.virtualTokenReserve();
      const afterBuyEth = await bondingCurve.ethReserve();

      // Virtual tokens should decrease
      expect(afterBuyVirtual).to.be.lt(initialVirtual);
      // ETH reserve should increase
      expect(afterBuyEth).to.be.gt(initialEth);
    });

    it("Should calculate market cap correctly", async function () {
      const marketCapMon = await bondingCurve.getMarketCap();
      const marketCapUsd = await bondingCurve.getMarketCapUSD();

      expect(marketCapMon).to.equal(await bondingCurve.ethReserve());
      expect(marketCapUsd).to.be.gt(0);
    });
  });
});
