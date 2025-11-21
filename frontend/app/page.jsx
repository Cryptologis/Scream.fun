"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenCard from "@/components/TokenCard";
import MostScreamed from "@/components/MostScreamed";
import Tokenomics from "@/components/Tokenomics";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI, BONDING_CURVE_ABI } from "@/lib/contracts";

export default function Home() {
  const [tokens, setTokens] = useState([]);
  const [enrichedTokens, setEnrichedTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    if (!CONTRACT_ADDRESSES.SCREAM_FACTORY) {
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        provider
      );

      const totalTokens = await factory.getTotalTokens();
      const tokenList = [];

      for (let i = 0; i < totalTokens; i++) {
        const info = await factory.getTokenInfo(i);
        
        // Get bonding curve stats
        const curve = new ethers.Contract(info.bondingCurve, BONDING_CURVE_ABI, provider);
        const marketCap = await curve.getMarketCap();
        const totalVolume = await curve.totalVolume();
        const migrated = await curve.migrated();

        tokenList.push({
          id: i,
          token: info.token,
          bondingCurve: info.bondingCurve,
          creator: info.creator,
          name: info.name,
          symbol: info.symbol,
          imageUrl: info.imageUrl,
          createdAt: Number(info.createdAt),
          marketCap: ethers.formatEther(marketCap),
          totalVolume: ethers.formatEther(totalVolume),
          migrated: migrated,
        });
      }

      setTokens(tokenList);
      setEnrichedTokens(tokenList);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleTokenCreated() {
    loadTokens();
  }

  // Filter functions
  const recentlyCreated = enrichedTokens
    .filter(t => !t.migrated)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const aboutToMigrate = enrichedTokens
    .filter(t => !t.migrated && parseFloat(t.marketCap) >= 70) // 70+ MON (close to 85)
    .sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap))
    .slice(0, 6);

  const migrated = enrichedTokens
    .filter(t => t.migrated)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  // King of Scream - highest score (volume * marketCap)
  const kingOfScream = enrichedTokens
    .map(t => ({
      ...t,
      score: parseFloat(t.totalVolume) * parseFloat(t.marketCap)
    }))
    .sort((a, b) => b.score - a.score)[0];

  function TokenGrid({ tokens, emptyMessage }) {
    if (tokens.length === 0) {
      return (
        <div className="text-center py-8 bg-slate-800 rounded-lg border border-blue-700">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <div
            key={token.id}
            onClick={() => setSelectedToken(token)}
            className="bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-slate-700 transition border-2 border-transparent hover:border-cyan-500"
          >
            <div className="flex items-start gap-3 mb-3">
              {token.imageUrl && (
                <img
                  src={token.imageUrl}
                  alt={token.name}
                  className="w-16 h-16 rounded-lg object-cover border border-cyan-500"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{token.name}</h3>
                <p className="text-cyan-400 font-mono text-sm">${token.symbol}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap:</span>
                <span className="text-white font-bold">{parseFloat(token.marketCap).toFixed(2)} MON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume:</span>
                <span className="text-white font-bold">{parseFloat(token.totalVolume).toFixed(2)} MON</span>
              </div>
              {!token.migrated && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">To DEX:</span>
                    <span className="text-cyan-400">{parseFloat(token.marketCap).toFixed(1)} / 85K</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((parseFloat(token.marketCap) / 85) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {token.migrated && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                    ✓ Migrated
                  </span>
                </div>
              )}
            </div>

            <button className="mt-3 w-full py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition text-sm font-bold">
              Trade →
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-6xl font-black text-white mb-4">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            SCREAM.FUN
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-6">
          The fairest meme coin launchpad on Monad. No rugs. No BS. Just vibes.
        </p>
        <div className="flex gap-6 justify-center text-center flex-wrap">
          <div className="bg-slate-800 px-6 py-4 rounded-lg border border-blue-700">
            <p className="text-3xl font-bold text-cyan-400">0.4%</p>
            <p className="text-sm text-gray-400">Trading Fee</p>
          </div>
          <div className="bg-slate-800 px-6 py-4 rounded-lg border border-blue-700">
            <p className="text-3xl font-bold text-red-400">2%</p>
            <p className="text-sm text-gray-400">Rage Tax</p>
          </div>
          <div className="bg-slate-800 px-6 py-4 rounded-lg border border-blue-700">
            <p className="text-3xl font-bold text-green-400">85K</p>
            <p className="text-sm text-gray-400">DEX Migration</p>
          </div>
        </div>
      </div>

      {/* King of Scream */}
      {kingOfScream && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">👑</span>
            <div>
              <h2 className="text-3xl font-black text-yellow-400">KING OF SCREAM</h2>
              <p className="text-sm text-gray-300">Highest Volume × Market Cap</p>
            </div>
          </div>

          <div
            onClick={() => setSelectedToken(kingOfScream)}
            className="bg-slate-800 p-6 rounded-lg cursor-pointer hover:bg-slate-700 transition border border-yellow-500"
          >
            <div className="flex items-start gap-4">
              {kingOfScream.imageUrl && (
                <img
                  src={kingOfScream.imageUrl}
                  alt={kingOfScream.name}
                  className="w-24 h-24 rounded-lg object-cover border-2 border-yellow-500"
                />
              )}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-1">{kingOfScream.name}</h3>
                <p className="text-yellow-400 font-mono text-lg mb-3">${kingOfScream.symbol}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Market Cap</p>
                    <p className="text-white font-bold text-lg">{parseFloat(kingOfScream.marketCap).toFixed(2)} MON</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Volume</p>
                    <p className="text-white font-bold text-lg">{parseFloat(kingOfScream.totalVolume).toFixed(2)} MON</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Score</p>
                    <p className="text-yellow-400 font-bold text-lg">{kingOfScream.score.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Most Screamed - Community Voting */}
      <MostScreamed />

      {/* Tokenomics Section */}
      <Tokenomics />

      {/* Create Token */}
      <div className="max-w-2xl mx-auto">
        <CreateTokenForm onSuccess={handleTokenCreated} />
      </div>

      {/* Selected Token Detail */}
      {selectedToken && (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedToken(null)}
            className="mb-4 text-cyan-400 hover:text-cyan-300"
          >
            ← Back to all tokens
          </button>
          <TokenCard
            tokenAddress={selectedToken.token}
            bondingCurveAddress={selectedToken.bondingCurve}
          />
        </div>
      )}

      {/* Showcase Sections */}
      {!selectedToken && (
        <>
          {/* Recently Created */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <span>🆕</span> Recently Created
            </h2>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading tokens...</p>
              </div>
            ) : (
              <TokenGrid tokens={recentlyCreated} emptyMessage="No tokens created yet. Be the first!" />
            )}
          </div>

          {/* About to Migrate */}
          {aboutToMigrate.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <span>🚀</span> About to Migrate
                <span className="text-sm text-gray-400 font-normal">(70+ MON)</span>
              </h2>
              <TokenGrid tokens={aboutToMigrate} emptyMessage="No tokens close to migration yet" />
            </div>
          )}

          {/* Migrated */}
          {migrated.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <span>✅</span> Migrated to DEX
              </h2>
              <TokenGrid tokens={migrated} emptyMessage="No tokens have migrated yet" />
            </div>
          )}

          {/* All Tokens */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              All Tokens ({enrichedTokens.length})
            </h2>
            {!loading && !CONTRACT_ADDRESSES.SCREAM_FACTORY ? (
              <div className="text-center py-12 bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
                <p className="text-yellow-400 font-bold mb-2">⚠️ Contracts Not Deployed</p>
                <p className="text-gray-300">
                  Please deploy the contracts first using: <code className="bg-gray-800 px-2 py-1 rounded">npm run deploy:testnet</code>
                </p>
              </div>
            ) : (
              <TokenGrid tokens={enrichedTokens} emptyMessage="No tokens yet" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
