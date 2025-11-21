"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { BONDING_CURVE_ABI, ERC20_ABI, RAGE_FUND_ABI, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { formatEther, parseEther, playScream } from "@/lib/web3";
import ScreamButton from "./ScreamButton";

export default function TokenCard({ tokenAddress, bondingCurveAddress }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [curveInfo, setCurveInfo] = useState(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [userBalance, setUserBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [rageTaxInfo, setRageTaxInfo] = useState(null);
  const [devEarnings, setDevEarnings] = useState("0");
  const [rageFundBalance, setRageFundBalance] = useState("0");

  useEffect(() => {
    loadTokenInfo();
    const interval = setInterval(loadTokenInfo, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [tokenAddress]);

  async function loadTokenInfo() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Load token info
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const name = await token.name();
      const symbol = await token.symbol();
      const balance = await token.balanceOf(userAddress);

      setTokenInfo({ name, symbol });
      setUserBalance(ethers.formatEther(balance));

      // Load bonding curve info
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
      const price = await curve.getCurrentPrice();
      const marketCap = await curve.getMarketCap();
      const migrated = await curve.migrated();
      const tokensSold = await curve.realTokensSold();

      setCurveInfo({
        price: ethers.formatEther(price),
        marketCap: ethers.formatEther(marketCap),
        migrated,
        tokensSold: ethers.formatEther(tokensSold),
      });

      // Load RAGE fund balance
      if (CONTRACT_ADDRESSES.RAGE_FUND) {
        const rageFund = new ethers.Contract(CONTRACT_ADDRESSES.RAGE_FUND, RAGE_FUND_ABI, provider);
        const balance = await rageFund.tokenBalance(tokenAddress);
        setRageFundBalance(ethers.formatEther(balance));
      }

      // Check if sell would trigger rage tax
      if (parseFloat(balance) > 0) {
        const [wouldTrigger, taxAmount] = await curve.wouldTriggerRageTax(
          userAddress,
          balance
        );
        setRageTaxInfo({
          wouldTrigger,
          taxAmount: ethers.formatEther(taxAmount),
        });
      }
    } catch (error) {
      console.error("Error loading token info:", error);
    }
  }

  async function handleBuy() {
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      alert("Please enter an amount");
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);

      const ethAmount = parseEther(buyAmount);
      const tokensOut = await curve.calculatePurchaseReturn(ethAmount);

      // Allow 1% slippage
      const minTokens = (tokensOut * 99n) / 100n;

      const tx = await curve.buy(minTokens, { value: ethAmount });
      await tx.wait();

      // Play scream sound!
      playScream();

      alert(`Success! Bought ${formatEther(tokensOut, 2)} tokens`);
      setBuyAmount("");
      loadTokenInfo();
    } catch (error) {
      console.error("Error buying:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSell(isRageSell = false) {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      alert("Please enter an amount");
      return;
    }

    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const tokenAmount = parseEther(sellAmount);

      // Check allowance
      const allowance = await token.allowance(await signer.getAddress(), bondingCurveAddress);
      if (allowance < tokenAmount) {
        const approveTx = await token.approve(bondingCurveAddress, ethers.MaxUint256);
        await approveTx.wait();
      }

      const ethOut = await curve.calculateSaleReturn(tokenAmount);
      const minEth = (ethOut * 99n) / 100n; // 1% slippage

      const tx = await curve.sell(tokenAmount, minEth, isRageSell);
      await tx.wait();

      alert(`Success! Sold for ${formatEther(ethOut, 4)} MON`);
      setSellAmount("");
      loadTokenInfo();
    } catch (error) {
      console.error("Error selling:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!tokenInfo || !curveInfo) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-4">
        <h2 className="text-3xl font-bold text-white">{tokenInfo.name}</h2>
        <p className="text-xl text-purple-400 font-mono">${tokenInfo.symbol}</p>
        {curveInfo.migrated && (
          <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full">
            Migrated to DEX
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Price</p>
          <p className="text-lg font-bold text-white">{parseFloat(curveInfo.price).toFixed(8)} MON</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Market Cap</p>
          <p className="text-lg font-bold text-white">{parseFloat(curveInfo.marketCap).toFixed(2)} MON</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">RAGE Fund</p>
          <p className="text-lg font-bold text-purple-400">{parseFloat(rageFundBalance).toFixed(4)} MON</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Your Balance</p>
          <p className="text-lg font-bold text-green-400">{parseFloat(userBalance).toFixed(2)}</p>
        </div>
      </div>

      {/* Buy Section */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-3">Buy {tokenInfo.symbol}</h3>
        <div className="flex gap-2">
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="0.0 MON"
            step="0.01"
            min="0"
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={handleBuy}
            disabled={loading || curveInfo.migrated}
            className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            Buy
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Fee: 0.4% (0.2% dev + 0.2% RAGE)</p>
      </div>

      {/* Sell Section */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-3">Sell {tokenInfo.symbol}</h3>
        {rageTaxInfo?.wouldTrigger && (
          <div className="mb-3 p-3 bg-red-900/30 border border-red-500 rounded-lg">
            <p className="text-red-400 font-bold">⚠️ RAGE TAX WARNING</p>
            <p className="text-sm text-red-300">
              Selling at a loss &gt;10%. Rage tax: {parseFloat(rageTaxInfo.taxAmount).toFixed(4)} MON (2%)
            </p>
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0.0 Tokens"
            step="0.01"
            min="0"
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={() => handleSell(false)}
            disabled={loading || curveInfo.migrated || parseFloat(userBalance) === 0}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            Sell
          </button>
        </div>

        {/* RAGE SELL BUTTON */}
        {rageTaxInfo?.wouldTrigger && (
          <button
            onClick={() => handleSell(true)}
            disabled={loading || curveInfo.migrated}
            className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black rounded-lg hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 animate-pulse"
          >
            😱 RAGE SELL (Accept 2% Tax)
          </button>
        )}
        <p className="text-xs text-gray-400 mt-2">Max balance: {parseFloat(userBalance).toFixed(2)}</p>
      </div>

      {/* Progress to Migration */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">Progress to DEX Migration</span>
          <span className="text-sm font-bold text-white">
            {curveInfo.marketCap} / 85 MON
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all"
            style={{ width: `${Math.min((parseFloat(curveInfo.marketCap) / 85) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Scream for Token (Voting) */}
      <ScreamButton tokenAddress={tokenAddress} />
    </div>
  );
}
