import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BotCard } from "@/components/BotCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Shield, Wallet as WalletIcon, ArrowLeft, Bot } from "lucide-react";
import { useWallet } from "@/lib/wallet-context-new";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { WatchedTokens } from "@/components/WatchedTokens";
import { ProtectedTokens } from "@/components/ProtectedTokens";

type BotStatus = "active" | "inactive";

interface BotData {
  id: string;
  name: string;
  strategy: string;
  status: BotStatus;
  performance?: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { connected, address, tier, onChainTier } = useWallet();
  const [bots, setBots] = useState<BotData[]>([
    {
      id: "bot-1",
      name: "Cross-DEX Arbitrage",
      strategy: "Jupiter ↔ Raydium",
      status: "active",
      performance: "+12.5%",
    },
    {
      id: "bot-2",
      name: "Token Pair Monitor",
      strategy: "SOL/USDC",
      status: "active",
      performance: "+8.3%",
    },
    {
      id: "bot-3",
      name: "MEV Protection Bot",
      strategy: "Anti-sandwich",
      status: "inactive",
    },
  ]);

  useEffect(() => {
    if (!connected) {
      navigate("/");
    }
  }, [connected, navigate]);

  if (!connected) {
    return null;
  }

  const handleBotToggle = (botId: string, active: boolean) => {
    setBots((prev) =>
      prev.map((bot) =>
        bot.id === botId
          ? { ...bot, status: (active ? "active" : "inactive") as BotStatus }
          : bot
      )
    );
  };

  const availableBots = tier === "pro_plus" ? bots : [];
  const activeBots = availableBots.filter((bot) => bot.status === "active").length;
  const maxBots = tier === "pro_plus" ? 5 : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 py-8">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back-home"
                className="hover-elevate active-elevate-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                <p className="text-muted-foreground">
                  Manage your wallet protection and arbitrage bots
                </p>
              </div>
            </div>

            <WatchlistPanel />
            <WatchedTokens />
            <ProtectedTokens />

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  On-Chain Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Cached Tier</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold capitalize">{tier}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">On-Chain Tier</p>
                    <span className="text-lg font-bold capitalize">{onChainTier || "Not initialized"}</span>
                  </div>
                </div>
                {address ? (
                  <p className="text-xs text-muted-foreground font-mono">{address}</p>
                ) : null}
              </CardContent>
            </Card>

            {tier === "pro_plus" ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Arbitrage Bots</h2>
                  </div>
                  <Button disabled={activeBots >= maxBots}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bot
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableBots.map((bot) => (
                    <BotCard
                      key={bot.id}
                      {...bot}
                      onToggle={(active) => handleBotToggle(bot.id, active)}
                      onConfigure={() => console.log(`Configure bot ${bot.id}`)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold mt-4 mb-2">Upgrade to Pro+ for Arbitrage Bots</h3>
                <Button size="lg" onClick={() => navigate("/")}>
                  View Pricing
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
