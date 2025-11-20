"use client";

import { useState, useEffect } from "react";
import { toggleScreamMute, isScreamMuted } from "@/lib/web3";

export default function SoundToggle() {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Check initial mute state from localStorage
    setIsMuted(isScreamMuted());
  }, []);

  const handleToggle = () => {
    const newMuteState = toggleScreamMute();
    setIsMuted(newMuteState);
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700 text-sm"
      title={isMuted ? "Unmute scream sound" : "Mute scream sound"}
    >
      {isMuted ? (
        <>
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <span className="text-red-400">Muted</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          <span className="text-cyan-400">🔊</span>
        </>
      )}
    </button>
  );
}
