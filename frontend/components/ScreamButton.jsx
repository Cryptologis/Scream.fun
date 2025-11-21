"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI } from "@/lib/contracts";

export default function ScreamButton({ tokenAddress }) {
  const [voteData, setVoteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [tokenStats, setTokenStats] = useState(null);

  useEffect(() => {
    loadVoteData();
    const interval = setInterval(() => {
      loadVoteData();
      updateCooldown();
    }, 5000);
    return () => clearInterval(interval);
  }, [tokenAddress]);

  async function loadVoteData() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        provider
      );

      // Get user's vote data for this token
      const userData = await factory.getUserVoteData(userAddress, tokenAddress);
      setVoteData({
        lastVoteTime: Number(userData.lastVoteTime),
        consecutiveDays: Number(userData.consecutiveDays),
        cooldownRemaining: Number(userData.cooldownRemaining),
      });

      // Get token's vote stats
      const stats = await factory.getTokenVoteStats(tokenAddress);
      setTokenStats({
        dailyScreams: Number(stats.dailyScreams),
        totalScreams: Number(stats.totalScreams),
      });
    } catch (error) {
      console.error("Error loading vote data:", error);
    }
  }

  function updateCooldown() {
    if (voteData && voteData.cooldownRemaining > 0) {
      const elapsed = Math.floor(Date.now() / 1000) - Math.floor(voteData.lastVoteTime);
      const remaining = Math.max(0, 86400 - elapsed); // 24 hours in seconds
      setCooldownRemaining(remaining);
    } else {
      setCooldownRemaining(0);
    }
  }

  async function handleScream() {
    setLoading(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        signer
      );

      const voteFee = ethers.parseEther("0.0005");
      const tx = await factory.screamForToken(tokenAddress, { value: voteFee });
      await tx.wait();

      alert("🔥 SCREAMED! Your support has been recorded!");
      loadVoteData();
    } catch (error) {
      console.error("Error screaming:", error);
      if (error.message.includes("Cooldown active")) {
        alert("You can only scream once per 24 hours per token!");
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatTimeRemaining(seconds) {
    if (seconds <= 0) return "Ready!";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  const canVote = cooldownRemaining === 0;
  const streakMultiplier = voteData?.consecutiveDays || 1;
  const hasStreak = streakMultiplier > 1;

  return (
    <div className="bg-gradient-to-br from-purple-800/30 to-pink-800/30 p-4 rounded-lg border border-purple-600">
      {/* Stats Display */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">Total Screams</p>
          <p className="text-xl font-black text-purple-400">
            {tokenStats?.dailyScreams || 0} today
          </p>
          <p className="text-xs text-gray-500">
            {tokenStats?.totalScreams || 0} all-time
          </p>
        </div>
        {hasStreak && (
          <div className="text-right">
            <p className="text-xs text-gray-400">Your Streak</p>
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
              {streakMultiplier}🔥
            </p>
            <p className="text-xs text-orange-400">
              {streakMultiplier}x multiplier
            </p>
          </div>
        )}
      </div>

      {/* Scream Button */}
      <button
        onClick={handleScream}
        disabled={loading || !canVote}
        className={`w-full py-3 rounded-lg font-black text-lg transition ${
          canVote
            ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            : "bg-gray-700 text-gray-500 cursor-not-allowed"
        }`}
      >
        {loading ? (
          "SCREAMING..."
        ) : canVote ? (
          <>😱 SCREAM FOR THIS TOKEN</>
        ) : (
          <>🔒 {formatTimeRemaining(cooldownRemaining)}</>
        )}
      </button>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <p className="text-xs text-gray-400 text-center">
          Cost: 0.0005 ETH • Vote once per 24h
        </p>
        <p className="text-xs text-purple-300 text-center">
          Revenue: 50% Community • 25% Development • 25% Protocol
        </p>
        {canVote && (
          <div className="text-xs text-center space-y-1">
            <p className="text-purple-400">
              💎 Hold tokens = 2x vote power
            </p>
            <p className="text-yellow-400">
              🔥 Daily streak = up to 10x multiplier
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
