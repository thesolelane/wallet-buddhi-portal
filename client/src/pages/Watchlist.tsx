import { Header } from "@/components/Header";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { WatchedTokensPanel } from "@/components/WatchedTokensPanel";

export default function Watchlist() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Watchlist</h1>
            <p className="text-muted-foreground">
              Watch public wallets and save tokens. Sign a message to prove the login wallet. No keys are stored.
            </p>
          </div>
          <WatchedTokensPanel />
          <WatchlistPanel />
        </div>
      </main>
    </div>
  );
}
