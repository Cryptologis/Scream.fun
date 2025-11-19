"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenCard from "@/components/TokenCard";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI } from "@/lib/contracts";

export default function Home() {
  const [tokens, setTokens] = useState([]);
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
        tokenList.push({
          id: i,
          token: info.token,
          bondingCurve: info.bondingCurve,
          creator: info.creator,
          name: info.name,
          symbol: info.symbol,
          createdAt: Number(info.createdAt),
        });
      }

      setTokens(tokenList.reverse()); // Show newest first
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleTokenCreated() {
    loadTokens();
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-6xl font-black text-white mb-4">
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            SCREAM.FUN
          </span>
        </h1>
        <p className="text-xl text-gray-300 mb-6">
          The fairest meme coin launchpad on Monad. No rugs. No BS. Just vibes.
        </p>
        <div className="flex gap-6 justify-center text-center">
          <div className="bg-gray-800 px-6 py-4 rounded-lg">
            <p className="text-3xl font-bold text-purple-400">0.4%</p>
            <p className="text-sm text-gray-400">Trading Fee</p>
          </div>
          <div className="bg-gray-800 px-6 py-4 rounded-lg">
            <p className="text-3xl font-bold text-red-400">2%</p>
            <p className="text-sm text-gray-400">Rage Tax</p>
          </div>
          <div className="bg-gray-800 px-6 py-4 rounded-lg">
            <p className="text-3xl font-bold text-green-400">85 ETH</p>
            <p className="text-sm text-gray-400">DEX Migration</p>
          </div>
        </div>
      </div>

      {/* Create Token */}
      <div className="max-w-2xl mx-auto">
        <CreateTokenForm onSuccess={handleTokenCreated} />
      </div>

      {/* Selected Token Detail */}
      {selectedToken && (
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedToken(null)}
            className="mb-4 text-purple-400 hover:text-purple-300"
          >
            ← Back to all tokens
          </button>
          <TokenCard
            tokenAddress={selectedToken.token}
            bondingCurveAddress={selectedToken.bondingCurve}
          />
        </div>
      )}

      {/* Token List */}
      {!selectedToken && (
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">
            {tokens.length > 0 ? "All Tokens" : "No Tokens Yet"}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading tokens...</p>
            </div>
          ) : !CONTRACT_ADDRESSES.SCREAM_FACTORY ? (
            <div className="text-center py-12 bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
              <p className="text-yellow-400 font-bold mb-2">⚠️ Contracts Not Deployed</p>
              <p className="text-gray-300">
                Please deploy the contracts first using: <code className="bg-gray-800 px-2 py-1 rounded">npm run deploy:testnet</code>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Then update the contract addresses in your .env file
              </p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <p className="text-2xl mb-4">🚀</p>
              <p className="text-gray-400">Be the first to create a meme token!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  onClick={() => setSelectedToken(token)}
                  className="bg-gray-800 p-6 rounded-lg cursor-pointer hover:bg-gray-700 transition border-2 border-transparent hover:border-purple-500"
                >
                  <h3 className="text-xl font-bold text-white mb-1">{token.name}</h3>
                  <p className="text-purple-400 font-mono mb-2">${token.symbol}</p>
                  <p className="text-xs text-gray-400">
                    Created: {new Date(token.createdAt * 1000).toLocaleDateString()}
                  </p>
                  <button className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    Trade →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
