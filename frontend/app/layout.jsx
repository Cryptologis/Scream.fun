import "./globals.css";
import WalletConnect from "@/components/WalletConnect";

export const metadata = {
  title: "Scream.fun - Fair Meme Coin Launchpad on Monad",
  description: "The fairest (and most profitable) Pump.fun-style launchpad on Monad. Zero creator fees forever.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 min-h-screen">
        <nav className="border-b border-blue-800 bg-black/30 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <a href="/" className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  SCREAM.FUN
                </a>
                <p className="text-xs text-gray-400 mt-1">
                  Fair Launch • Zero Rugs • On Monad 🚀
                </p>
              </div>
              <WalletConnect />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="mt-20 border-t border-blue-800 bg-black/30 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400 text-sm">
            <p className="mb-2">
              🔥 Zero creator fees forever. Dev still eats handsomely. You pump, we both win.
            </p>
            <p className="text-xs">
              Phase 1: 0.4% fee (0.2% dev + 0.2% RAGE) + 2% rage tax on panic sells
            </p>
            <p className="text-xs">
              Phase 2: 0.3% fee (0.15% dev + 0.10% RAGE + 0.05% buyback/burn)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
