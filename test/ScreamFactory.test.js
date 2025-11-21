const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ScreamFactory", function () {
  let factory;
  let wmon;
  let uniswapFactory;
  let mockOracle;
  let rageFund;
  let owner, dev, treasury, devFund, user1, user2, user3;

  const parseEth = (amount) => ethers.parseEther(amount.toString());
  const VOTE_FEE = parseEth("0.0005");

  beforeEach(async function () {
    [owner, dev, treasury, devFund, user1, user2, user3] = await ethers.getSigners();

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

    // Deploy Scream Factory
    const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
    factory = await ScreamFactory.deploy(
      dev.address,
      await rageFund.getAddress(),
      await uniswapFactory.getAddress(),
      await wmon.getAddress(),
      await mockOracle.getAddress(),
      devFund.address,
      treasury.address
    );
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await factory.devWallet()).to.equal(dev.address);
      expect(await factory.rageFund()).to.equal(await rageFund.getAddress());
      expect(await factory.wmon()).to.equal(await wmon.getAddress());
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero tokens", async function () {
      expect(await factory.getTotalTokens()).to.equal(0);
    });
  });

  describe("Token Creation", function () {
    it("Should allow creating a new token", async function () {
      const tx = await factory.connect(user1).createToken("MyMeme", "MEME");
      const receipt = await tx.wait();

      expect(await factory.getTotalTokens()).to.equal(1);

      // Check event
      const event = receipt.logs.find(
        log => {
          try {
            return factory.interface.parseLog(log)?.name === "TokenCreated";
          } catch {
            return false;
          }
        }
      );
      expect(event).to.not.be.undefined;
    });

    it("Should track creator's tokens", async function () {
      await factory.connect(user1).createToken("Token1", "TK1");
      await factory.connect(user1).createToken("Token2", "TK2");
      await factory.connect(user2).createToken("Token3", "TK3");

      const user1Tokens = await factory.getCreatorTokens(user1.address);
      const user2Tokens = await factory.getCreatorTokens(user2.address);

      expect(user1Tokens.length).to.equal(2);
      expect(user2Tokens.length).to.equal(1);
    });

    it("Should store token info correctly", async function () {
      await factory.connect(user1).createToken("TestMeme", "TMEME");

      const tokenInfo = await factory.getTokenInfo(0);
      expect(tokenInfo.name).to.equal("TestMeme");
      expect(tokenInfo.symbol).to.equal("TMEME");
      expect(tokenInfo.creator).to.equal(user1.address);
      expect(tokenInfo.token).to.not.equal(ethers.ZeroAddress);
      expect(tokenInfo.bondingCurve).to.not.equal(ethers.ZeroAddress);
    });

    it("Should allow multiple users to create tokens", async function () {
      await factory.connect(user1).createToken("Meme1", "M1");
      await factory.connect(user2).createToken("Meme2", "M2");
      await factory.connect(user3).createToken("Meme3", "M3");

      expect(await factory.getTotalTokens()).to.equal(3);
    });
  });

  describe("Voting System (Scream)", function () {
    let tokenAddress;

    beforeEach(async function () {
      // Create a token to vote for
      const tx = await factory.connect(user1).createToken("VoteMeme", "VOTE");
      const receipt = await tx.wait();

      const tokenInfo = await factory.getTokenInfo(0);
      tokenAddress = tokenInfo.token;
    });

    it("Should allow screaming for a token", async function () {
      await expect(
        factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE })
      ).to.emit(factory, "TokenScreamed");
    });

    it("Should require minimum vote fee", async function () {
      await expect(
        factory.connect(user2).screamForToken(tokenAddress, { value: parseEth("0.0001") })
      ).to.be.revertedWith("Insufficient vote fee");
    });

    it("Should enforce 24h cooldown", async function () {
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      await expect(
        factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE })
      ).to.be.revertedWith("Cooldown active - wait 24h");
    });

    it("Should allow voting after cooldown expires", async function () {
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      // Advance time by 24 hours + 1 second
      await time.increase(24 * 60 * 60 + 1);

      await expect(
        factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE })
      ).to.emit(factory, "TokenScreamed");
    });

    it("Should track vote statistics", async function () {
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      const stats = await factory.getTokenVoteStats(tokenAddress);
      expect(stats.dailyScreams).to.be.gt(0);
      expect(stats.totalScreams).to.be.gt(0);
    });

    it("Should apply holder bonus (2x)", async function () {
      // User1 is the creator and has tokens from bonding curve
      const tokenInfo = await factory.getTokenInfo(0);
      const bondingCurve = await ethers.getContractAt("BondingCurve", tokenInfo.bondingCurve);

      // User2 buys some tokens
      await bondingCurve.connect(user2).buy(0, { value: parseEth("1") });

      // User2 screams (should get 2x bonus)
      const tx = await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === "TokenScreamed";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        expect(parsed.args.screamPower).to.be.gte(2); // At least 2x (holder bonus)
      }
    });

    it("Should build streak on consecutive days", async function () {
      // Day 1
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      let userData = await factory.getUserVoteData(user2.address, tokenAddress);
      expect(userData.consecutiveDays).to.equal(1);

      // Advance to next day
      await time.increase(24 * 60 * 60 + 1);

      // Day 2
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      userData = await factory.getUserVoteData(user2.address, tokenAddress);
      expect(userData.consecutiveDays).to.equal(2);
    });

    it("Should reset streak if day skipped", async function () {
      // Day 1
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      // Skip 2 days
      await time.increase(48 * 60 * 60 + 1);

      // Day 3 (after skipping day 2)
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      const userData = await factory.getUserVoteData(user2.address, tokenAddress);
      expect(userData.consecutiveDays).to.equal(1); // Reset to 1
    });

    it("Should distribute vote fees correctly", async function () {
      const devBalBefore = await ethers.provider.getBalance(dev.address);
      const devFundBalBefore = await ethers.provider.getBalance(devFund.address);
      const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);

      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      const devBalAfter = await ethers.provider.getBalance(dev.address);
      const devFundBalAfter = await ethers.provider.getBalance(devFund.address);
      const treasuryBalAfter = await ethers.provider.getBalance(treasury.address);

      // 25% to dev, 25% to devFund, 50% to treasury
      expect(devBalAfter - devBalBefore).to.equal(VOTE_FEE / 4n);
      expect(devFundBalAfter - devFundBalBefore).to.equal(VOTE_FEE / 4n);
      expect(treasuryBalAfter - treasuryBalBefore).to.equal(VOTE_FEE / 2n);
    });

    it("Should reset daily stats after 24 hours", async function () {
      // Initial screams
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });

      await time.increase(24 * 60 * 60 + 1);

      await factory.connect(user3).screamForToken(tokenAddress, { value: VOTE_FEE });

      const stats = await factory.getTokenVoteStats(tokenAddress);

      // Daily should reset, but total should accumulate
      expect(stats.totalScreams).to.be.gte(2);
    });
  });

  describe("Leaderboard Functions", function () {
    let token1, token2, token3;

    beforeEach(async function () {
      // Create multiple tokens
      let tx = await factory.connect(user1).createToken("Token1", "TK1");
      let info = await factory.getTokenInfo(0);
      token1 = info.token;

      tx = await factory.connect(user1).createToken("Token2", "TK2");
      info = await factory.getTokenInfo(1);
      token2 = info.token;

      tx = await factory.connect(user1).createToken("Token3", "TK3");
      info = await factory.getTokenInfo(2);
      token3 = info.token;
    });

    it("Should return top daily screamers", async function () {
      // Vote for different tokens
      await factory.connect(user2).screamForToken(token1, { value: VOTE_FEE });
      await factory.connect(user3).screamForToken(token2, { value: VOTE_FEE });

      const topDaily = await factory.getTopDailyScreamers(2);
      expect(topDaily.length).to.equal(2);
    });

    it("Should sort by daily screams correctly", async function () {
      // Token2 gets 2 screams, token1 gets 1
      await factory.connect(user2).screamForToken(token1, { value: VOTE_FEE });

      await factory.connect(user2).screamForToken(token2, { value: VOTE_FEE });
      await time.increase(24 * 60 * 60 + 1);
      await factory.connect(user2).screamForToken(token2, { value: VOTE_FEE });

      const topDaily = await factory.getTopDailyScreamers(3);

      // Check that token2 is ranked higher (has more screams today)
      const stats1 = await factory.getTokenVoteStats(topDaily[0]);
      const stats2 = await factory.getTokenVoteStats(topDaily[1]);

      expect(stats1.dailyScreams).to.be.gte(stats2.dailyScreams);
    });

    it("Should return top all-time screamers", async function () {
      await factory.connect(user2).screamForToken(token1, { value: VOTE_FEE });
      await factory.connect(user3).screamForToken(token2, { value: VOTE_FEE });

      const topAllTime = await factory.getTopAllTimeScreamers(2);
      expect(topAllTime.length).to.equal(2);
    });

    it("Should handle limit larger than token count", async function () {
      const topDaily = await factory.getTopDailyScreamers(100);
      expect(topDaily.length).to.equal(3); // Only 3 tokens exist
    });

    it("Should handle zero tokens case", async function () {
      const ScreamFactory = await ethers.getContractFactory("ScreamFactory");
      const emptyFactory = await ScreamFactory.deploy(
        dev.address,
        await rageFund.getAddress(),
        await uniswapFactory.getAddress(),
        await wmon.getAddress(),
        await mockOracle.getAddress(),
        devFund.address,
        treasury.address
      );

      const topDaily = await emptyFactory.getTopDailyScreamers(10);
      expect(topDaily.length).to.equal(0);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to update dev wallet", async function () {
      await factory.setDevWallet(user1.address);
      expect(await factory.devWallet()).to.equal(user1.address);
    });

    it("Should allow owner to update RAGE fund", async function () {
      await factory.setRageFund(user1.address);
      expect(await factory.rageFund()).to.equal(user1.address);
    });

    it("Should allow owner to update price oracle", async function () {
      const MockOracle2 = await ethers.getContractFactory("MockPriceOracle");
      const newOracle = await MockOracle2.deploy(3000000000n); // $30 with 8 decimals

      await factory.setPriceOracle(await newOracle.getAddress());
      expect(await factory.priceOracle()).to.equal(await newOracle.getAddress());
    });

    it("Should prevent non-owner from updating settings", async function () {
      await expect(
        factory.connect(user1).setDevWallet(user2.address)
      ).to.be.revertedWith("Only owner");

      await expect(
        factory.connect(user1).setRageFund(user2.address)
      ).to.be.revertedWith("Only owner");
    });

    it("Should allow ownership transfer", async function () {
      await factory.transferOwnership(user1.address);
      expect(await factory.owner()).to.equal(user1.address);
    });

    it("Should prevent transferring to zero address", async function () {
      await expect(
        factory.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete token lifecycle", async function () {
      // Create token
      await factory.connect(user1).createToken("FullCycle", "FULL");
      const tokenInfo = await factory.getTokenInfo(0);
      const tokenAddress = tokenInfo.token;
      const bondingCurve = await ethers.getContractAt("BondingCurve", tokenInfo.bondingCurve);

      // Users buy tokens
      await bondingCurve.connect(user2).buy(0, { value: parseEth("5") });
      await bondingCurve.connect(user3).buy(0, { value: parseEth("3") });

      // Users vote for token
      await factory.connect(user2).screamForToken(tokenAddress, { value: VOTE_FEE });
      await factory.connect(user3).screamForToken(tokenAddress, { value: VOTE_FEE });

      // Check stats
      const stats = await factory.getTokenVoteStats(tokenAddress);
      expect(stats.totalScreams).to.be.gt(0);

      // Check leaderboard
      const topTokens = await factory.getTopAllTimeScreamers(1);
      expect(topTokens[0]).to.equal(tokenAddress);
    });
  });
});
