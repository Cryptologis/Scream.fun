"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI, ERC20_ABI } from "@/lib/contracts";

export default function MostScreamed() {
  const [dailyTop, setDailyTop] = useState([]);
  const [allTimeTop, setAllTimeTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDaily, setShowDaily] = useState(true);

  useEffect(() => {
    loadTopScreamers();
    const interval = setInterval(loadTopScreamers, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadTopScreamers() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        provider
      );

      // Get top 5 daily and all-time screamers
      const dailyAddresses = await factory.getTopDailyScreamers(5);
      const allTimeAddresses = await factory.getTopAllTimeScreamers(5);

      // Load detailed info for each token
      const dailyData = await Promise.all(
        dailyAddresses.map(async (addr) => {
          if (addr === ethers.ZeroAddress) return null;
          const stats = await factory.getTokenVoteStats(addr);
          const token = new ethers.Contract(addr, ERC20_ABI, provider);
          const name = await token.name();
          const symbol = await token.symbol();
          return {
            address: addr,
            name,
            symbol,
            dailyScreams: Number(stats.dailyScreams),
            totalScreams: Number(stats.totalScreams),
          };
        })
      );

      const allTimeData = await Promise.all(
        allTimeAddresses.map(async (addr) => {
          if (addr === ethers.ZeroAddress) return null;
          const stats = await factory.getTokenVoteStats(addr);
          const token = new ethers.Contract(addr, ERC20_ABI, provider);
          const name = await token.name();
          const symbol = await token.symbol();
          return {
            address: addr,
            name,
            symbol,
            dailyScreams: Number(stats.dailyScreams),
            totalScreams: Number(stats.totalScreams),
          };
        })
      );

      setDailyTop(dailyData.filter(Boolean));
      setAllTimeTop(allTimeData.filter(Boolean));
      setLoading(false);
    } catch (error) {
      console.error("Error loading top screamers:", error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg p-6 border border-purple-500">
        <h2 className="text-2xl font-black text-white mb-4">🔥 MOST SCREAMED</h2>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const displayData = showDaily ? dailyTop : allTimeTop;
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-lg p-6 border border-purple-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white">🔥 MOST SCREAMED</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDaily(true)}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              showDaily
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setShowDaily(false)}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              !showDaily
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      {displayData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No tokens screamed yet!</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to scream for a token</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayData.map((token, index) => (
            <div
              key={token.address}
              className="bg-gray-800/60 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{medals[index]}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{token.name}</h3>
                    <p className="text-sm text-purple-400 font-mono">${token.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {showDaily ? token.dailyScreams : token.totalScreams}
                  </p>
                  <p className="text-xs text-gray-400">screams</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 pt-4 border-t border-purple-800">
        <p className="text-xs text-gray-400 text-center">
          🎯 Scream for tokens you believe in! Top screamed tokens get prime exposure.
        </p>
        <p className="text-xs text-purple-400 text-center mt-1">
          Daily contest resets every 24h • Build streaks for bonus multipliers
        </p>
        <p className="text-xs text-green-400 text-center mt-2 font-bold">
          💚 50% of voting revenue goes to community treasury (future DAO)
        </p>
      </div>
    </div>
  );
}
