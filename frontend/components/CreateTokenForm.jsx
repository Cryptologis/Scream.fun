"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, SCREAM_FACTORY_ABI } from "@/lib/contracts";

export default function CreateTokenForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [creating, setCreating] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be less than 2MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert("Please upload an image file (JPEG, PNG, GIF)");
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();

    if (!name || !symbol) {
      alert("Please fill in all fields");
      return;
    }

    if (!imageFile) {
      alert("Please upload a token image");
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

      // Convert image to base64 data URI
      const reader = new FileReader();
      const imageDataUri = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageFile);
      });

      const factory = new ethers.Contract(
        CONTRACT_ADDRESSES.SCREAM_FACTORY,
        SCREAM_FACTORY_ABI,
        signer
      );

      const tx = await factory.createToken(name, symbol, imageDataUri);
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
        setImageFile(null);
        setImagePreview("");
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
    <form onSubmit={handleCreate} className="space-y-4 p-6 bg-slate-800 rounded-lg border border-blue-700">
      <h2 className="text-2xl font-bold text-white mb-4">Create Your Meme Token</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Image *
        </label>
        <div className="flex gap-4 items-start">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Token preview"
                className="w-32 h-32 rounded-lg object-cover border-2 border-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview("");
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="w-32 h-32 border-2 border-dashed border-cyan-500 rounded-lg flex items-center justify-center cursor-pointer hover:border-cyan-400 transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <div className="text-center">
                <p className="text-4xl mb-1">📸</p>
                <p className="text-xs text-gray-400">Upload Image</p>
              </div>
            </label>
          )}
          <div className="flex-1 text-xs text-gray-400">
            <p>• JPEG, PNG, or GIF</p>
            <p>• Max 2MB</p>
            <p>• Square images work best</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Scream Coin"
          className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-blue-600 focus:border-cyan-500 focus:outline-none"
          maxLength={50}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Symbol *
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="SCREAM"
          className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-blue-600 focus:border-cyan-500 focus:outline-none"
          maxLength={10}
        />
      </div>

      <div className="bg-slate-700 p-4 rounded-lg text-sm text-gray-300 border border-blue-800">
        <p className="font-bold mb-2">🎯 No Rugs, Fair Launch:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>1B total supply (800M on bonding curve)</li>
          <li>0.4% trading fee (0.2% dev, 0.2% RAGE fund)</li>
          <li>2% rage tax on panic sells (&gt;10% loss)</li>
          <li>Auto-migrates to DEX at 85K</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={creating || !name || !symbol || !imageFile}
        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? "Creating..." : "Create Token (FREE)"}
      </button>
    </form>
  );
}
