"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI } from "@/lib/contracts";

export default function CreateTokenForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();

    if (!name || !symbol) {
      alert("Please fill in all fields");
      return;
    }

    if (!CONTRACT_ADDRESSES.SCREAM_FACTORY) {
      alert("Factory contract not deployed. Please deploy contracts first.");
      return;
    }

    setCreating(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        signer
      );

      const tx = await factory.createToken(name, symbol);
      const receipt = await tx.wait();

      // Find TokenCreated event
      const event = receipt.logs.find((log) => {
        try {
          return factory.interface.parseLog(log).name === "TokenCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        alert(`Token created! Address: ${parsed.args.token}`);
        setName("");
        setSymbol("");
        if (onSuccess) onSuccess(parsed.args);
      }
    } catch (error) {
      console.error("Error creating token:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-4 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Create Your Meme Token</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scream Coin"
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          maxLength={50}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Symbol
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="SCREAM"
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          maxLength={10}
        />
      </div>

      <div className="bg-gray-700 p-4 rounded-lg text-sm text-gray-300">
        <p className="font-bold mb-2">🎯 No Rugs, Fair Launch:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>1B total supply (800M on bonding curve)</li>
          <li>0.4% trading fee (0.2% dev, 0.2% RAGE fund)</li>
          <li>2% rage tax on panic sells (&gt;10% loss)</li>
          <li>Auto-migrates to DEX at 85 ETH market cap</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={creating || !name || !symbol}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? "Creating..." : "Create Token (FREE)"}
      </button>
    </form>
  );
}
