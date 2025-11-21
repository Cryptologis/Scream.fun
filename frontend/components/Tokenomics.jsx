"use client";

export default function Tokenomics() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-5xl font-black text-white mb-4">
          💰 Tokenomics
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          The fairest revenue distribution in DeFi. Community gets MORE than the protocol owner.
        </p>
      </div>

      {/* Community-First Highlight */}
      <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500 rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-6xl">💚</span>
          <div>
            <h3 className="text-3xl font-black text-green-400">Community-First Philosophy</h3>
            <p className="text-lg text-gray-300">Unlike other platforms that keep everything</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-green-950/50 rounded-xl p-6 border border-green-600">
            <div className="text-5xl font-black text-green-400 mb-2">50%</div>
            <div className="text-white font-bold mb-1">Community Treasury</div>
            <div className="text-sm text-gray-400">DAO-controlled rewards for holders</div>
          </div>

          <div className="bg-blue-950/50 rounded-xl p-6 border border-blue-600">
            <div className="text-5xl font-black text-blue-400 mb-2">25%</div>
            <div className="text-white font-bold mb-1">Development Fund</div>
            <div className="text-sm text-gray-400">Audits, features, team expansion</div>
          </div>

          <div className="bg-purple-950/50 rounded-xl p-6 border border-purple-600">
            <div className="text-5xl font-black text-purple-400 mb-2">25%</div>
            <div className="text-white font-bold mb-1">Protocol Owner</div>
            <div className="text-sm text-gray-400">Maintenance & operations</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-950/30 rounded-lg border border-green-700">
          <p className="text-center text-green-300 font-bold">
            🎯 Voting Revenue Only • Trading fees distributed separately for maximum fairness
          </p>
        </div>
      </div>

      {/* Trading Fees */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Bonding Curve Phase */}
        <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-2 border-cyan-500 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">📈</span>
            <div>
              <h3 className="text-2xl font-black text-cyan-400">Phase 1: Bonding Curve</h3>
              <p className="text-sm text-gray-400">Pre-Migration (0 → 85 ETH)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-cyan-950/30 rounded-lg p-4 border border-cyan-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">Trading Fee</span>
                <span className="text-2xl font-black text-cyan-400">0.4%</span>
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>→ Dev Wallet</span>
                  <span className="text-cyan-300">0.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>→ RAGE Fund (holders)</span>
                  <span className="text-cyan-300">0.2%</span>
                </div>
              </div>
            </div>

            <div className="bg-red-950/30 rounded-lg p-4 border border-red-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">😱 RAGE Tax</span>
                <span className="text-2xl font-black text-red-400">2%</span>
              </div>
              <div className="text-sm text-gray-400 mb-2">
                On panic sells (&gt;10% loss)
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>→ RAGE Fund (holders)</span>
                  <span className="text-red-300">90%</span>
                </div>
                <div className="flex justify-between">
                  <span>→ Dev Wallet</span>
                  <span className="text-red-300">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DEX Phase */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-500 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">🚀</span>
            <div>
              <h3 className="text-2xl font-black text-purple-400">Phase 2: DEX Trading</h3>
              <p className="text-sm text-gray-400">Post-Migration (85 ETH+)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">Trading Fee</span>
                <span className="text-2xl font-black text-purple-400">0.3%</span>
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>→ Dev Wallet</span>
                  <span className="text-purple-300">0.15%</span>
                </div>
                <div className="flex justify-between">
                  <span>→ RAGE Fund (holders)</span>
                  <span className="text-purple-300">0.10%</span>
                </div>
                <div className="flex justify-between">
                  <span>→ Auto Buyback & Burn</span>
                  <span className="text-purple-300">0.05%</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 border border-yellow-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💎</span>
                <span className="text-white font-bold">Diamond Hands Reward</span>
              </div>
              <div className="text-sm text-gray-300 mb-2">
                90% of RAGE fund distributed at migration
              </div>
              <div className="text-xs text-yellow-400">
                ✨ Vested over 90 days • Must hold to claim
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="bg-gradient-to-br from-slate-900/50 to-gray-900/50 border-2 border-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-black text-white mb-6 text-center">
          📊 Revenue Projections (@ 1,000 daily screams)
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🏦</div>
            <div className="text-3xl font-black text-green-400 mb-2">$137k/year</div>
            <div className="text-white font-bold mb-1">Community Treasury</div>
            <div className="text-sm text-gray-400">50% of voting revenue</div>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-2">🛠️</div>
            <div className="text-3xl font-black text-blue-400 mb-2">$68k/year</div>
            <div className="text-white font-bold mb-1">Development Fund</div>
            <div className="text-sm text-gray-400">25% of voting revenue</div>
          </div>

          <div className="text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <div className="text-3xl font-black text-purple-400 mb-2">$68k/year</div>
            <div className="text-white font-bold mb-1">Protocol Owner</div>
            <div className="text-sm text-gray-400">25% of voting revenue</div>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          * Based on 1,000 daily screams @ 0.0005 ETH each • ETH price $1,500 • Plus trading fees
        </div>
      </div>

      {/* Key Features */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
          <div className="text-3xl mb-3">🚫</div>
          <div className="text-white font-bold mb-1">Zero Creator Fees</div>
          <div className="text-sm text-gray-400">No rug pulls, ever</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
          <div className="text-3xl mb-3">⚡</div>
          <div className="text-white font-bold mb-1">Auto Migration</div>
          <div className="text-sm text-gray-400">At 85 ETH market cap</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
          <div className="text-3xl mb-3">🏛️</div>
          <div className="text-white font-bold mb-1">Future DAO</div>
          <div className="text-sm text-gray-400">Progressive decentralization</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
          <div className="text-3xl mb-3">⚖️</div>
          <div className="text-white font-bold mb-1">Fair Launch</div>
          <div className="text-sm text-gray-400">Equal opportunity for all</div>
        </div>
      </div>
    </div>
  );
}
