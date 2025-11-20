import { ethers } from "ethers";
import { MONAD_TESTNET, MONAD_MAINNET } from "./contracts";

export async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    throw new Error("Please install MetaMask!");
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // Get provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    return { provider, signer, address, network };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
}

export async function switchToMonad(isMainnet = false) {
  const network = isMainnet ? MONAD_MAINNET : MONAD_TESTNET;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainId }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [network],
        });
      } catch (addError) {
        throw addError;
      }
    } else {
      throw switchError;
    }
  }
}

export function formatAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(value, decimals = 4) {
  try {
    const formatted = ethers.formatEther(value);
    return parseFloat(formatted).toFixed(decimals);
  } catch {
    return "0";
  }
}

export function parseEther(value) {
  try {
    return ethers.parseEther(value.toString());
  } catch {
    return ethers.parseEther("0");
  }
}

// Play scream sound on buy
export function playScream() {
  try {
    // Check if sound is muted in localStorage
    const isMuted = localStorage.getItem('screamMuted') === 'true';
    if (isMuted) {
      console.log("Sound is muted");
      return;
    }

    const audio = new Audio("/scream.mp3");
    audio.volume = 0.3;
    audio.play().catch((e) => console.log("Audio play failed:", e));
  } catch (error) {
    console.log("Could not play sound:", error);
  }
}

// Toggle mute preference
export function toggleScreamMute() {
  const currentMute = localStorage.getItem('screamMuted') === 'true';
  localStorage.setItem('screamMuted', (!currentMute).toString());
  return !currentMute;
}

// Check if sound is muted
export function isScreamMuted() {
  return localStorage.getItem('screamMuted') === 'true';
}
