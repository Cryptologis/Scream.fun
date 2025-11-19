"use client";

import { useState, useEffect } from "react";
import { connectWallet, switchToMonad, formatAddress } from "@/lib/web3";

export default function WalletConnect() {
  const [address, setAddress] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkConnection();

    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  async function checkConnection() {
    if (typeof window.ethereum === "undefined") return;

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      setAddress("");
    } else {
      setAddress(accounts[0]);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { address } = await connectWallet();
      await switchToMonad(false);
      setAddress(address);
    } catch (error) {
      alert(error.message);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div>
      {address ? (
        <div className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-mono border border-cyan-500">
          {formatAddress(address)}
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
