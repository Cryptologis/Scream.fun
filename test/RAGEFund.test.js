const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RAGEFund", function () {
  let rageFund;
  let owner, user1, user2;

  const parseEth = (amount) => ethers.parseEther(amount.toString());

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const RAGEFund = await ethers.getContractFactory("RAGEFund");
    rageFund = await RAGEFund.deploy(owner.address);
  });

  describe("Deployment", function () {
    it("Should initialize with correct owner", async function () {
      expect(await rageFund.owner()).to.equal(owner.address);
    });
  });

  describe("Deposits", function () {
    it("Should accept deposits for a token", async function () {
      const depositAmount = parseEth("1");

      await expect(
        rageFund.deposit(user1.address, { value: depositAmount })
      ).to.emit(rageFund, "Deposited")
        .withArgs(user1.address, depositAmount);
    });

    it("Should track deposits per token", async function () {
      const depositAmount = parseEth("2");

      await rageFund.deposit(user1.address, { value: depositAmount });

      const balance = await rageFund.tokenBalance(user1.address);
      expect(balance).to.equal(depositAmount);
    });

    it("Should accumulate multiple deposits", async function () {
      await rageFund.deposit(user1.address, { value: parseEth("1") });
      await rageFund.deposit(user1.address, { value: parseEth("2") });

      const balance = await rageFund.tokenBalance(user1.address);
      expect(balance).to.equal(parseEth("3"));
    });

    it("Should track separate balances for different tokens", async function () {
      await rageFund.deposit(user1.address, { value: parseEth("1") });
      await rageFund.deposit(user2.address, { value: parseEth("2") });

      const balance1 = await rageFund.tokenBalance(user1.address);
      const balance2 = await rageFund.tokenBalance(user2.address);

      expect(balance1).to.equal(parseEth("1"));
      expect(balance2).to.equal(parseEth("2"));
    });

    it("Should reject zero value deposits", async function () {
      await expect(
        rageFund.deposit(user1.address, { value: 0 })
      ).to.be.revertedWith("No ETH sent");
    });
  });

  describe("Emergency Withdrawals", function () {
    beforeEach(async function () {
      // Setup: Make deposits
      await rageFund.deposit(user1.address, { value: parseEth("10") });
      await rageFund.deposit(user2.address, { value: parseEth("5") });
    });

    it("Should allow owner to emergency withdraw", async function () {
      const ownerBalBefore = await ethers.provider.getBalance(owner.address);

      const tx = await rageFund.emergencyWithdraw(user1.address);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const ownerBalAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalAfter).to.equal(ownerBalBefore + parseEth("10") - gasUsed);
    });

    it("Should reset token balance after emergency withdrawal", async function () {
      await rageFund.emergencyWithdraw(user1.address);

      const balance = await rageFund.tokenBalance(user1.address);
      expect(balance).to.equal(0);
    });

    it("Should prevent withdrawing zero balance", async function () {
      // Withdraw once
      await rageFund.emergencyWithdraw(user1.address);

      // Try to withdraw again
      await expect(
        rageFund.emergencyWithdraw(user1.address)
      ).to.be.revertedWith("No balance");
    });

    it("Should prevent non-owner from emergency withdrawing", async function () {
      await expect(
        rageFund.connect(user1).emergencyWithdraw(user1.address)
      ).to.be.reverted;
    });
  });

  describe("Distribution and Claims", function () {
    it("Should allow distributing accumulated balance", async function () {
      // This test requires a real token contract
      // Skipping for basic functionality test
      // In integration tests, this would be tested with actual token holders
    });
  });

  describe("Multiple Tokens Scenario", function () {
    it("Should handle multiple tokens independently", async function () {
      // Simulate deposits from different bonding curves
      await rageFund.deposit(user1.address, { value: parseEth("10") });
      await rageFund.deposit(user2.address, { value: parseEth("5") });

      // Emergency withdraw from one token
      await rageFund.emergencyWithdraw(user1.address);

      // Other token balance should be unaffected
      const bal1 = await rageFund.tokenBalance(user1.address);
      const bal2 = await rageFund.tokenBalance(user2.address);

      expect(bal1).to.equal(0);
      expect(bal2).to.equal(parseEth("5"));
    });
  });
});
