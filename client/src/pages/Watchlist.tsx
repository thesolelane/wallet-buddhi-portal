import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { WatchedTokensPanel } from "@/components/WatchedTokensPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default function Watchlist() {
  const [, navigate] = useLocation();
  const [ca, setCa] = useState("");

  function inspect() {
    const mint = ca.trim();
    if (!SOLANA_ADDRESS_RE.test(mint)) return;
    navigate(`/token/${mint}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Watchlist</h1>
            <p className="text-muted-foreground">
              Inspect another token here, then watch it. Free plan saves 2 without a wallet.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Token contract address"
                value={ca}
                onChange={(e) => setCa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inspect()}
              />
              <Button onClick={inspect} disabled={!SOLANA_ADDRESS_RE.test(ca.trim())}>
                Inspect token
              </Button>
            </CardContent>
          </Card>
          <WatchedTokensPanel />
          <WatchlistPanel />
        </div>
      </main>
    </div>
  );
}
