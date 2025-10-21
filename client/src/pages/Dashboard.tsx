import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BotCard } from "@/components/BotCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Shield, Wallet as WalletIcon, ArrowLeft, Bot } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";

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

  // Redirect to home if not connected
  useEffect(() => {
    if (!connected) {
      navigate("/");
    }
  }, [connected, navigate]);

  // Don't render dashboard if not connected
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

  // Filter bots based on tier - only Pro+ users can see/use bots
  const availableBots = tier === "pro_plus" ? bots : [];
  const activeBots = availableBots.filter((bot) => bot.status === "active").length;
  const maxBots = tier === "pro_plus" ? 5 : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onConnectWallet={() => {}}
        walletConnected={connected}
        walletAddress={address || undefined}
        currentTier={tier}
      />

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Wallet Balance
                  </CardTitle>
                  <WalletIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45.23 SOL</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +2.5% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Bots
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activeBots} / {maxBots}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {maxBots - activeBots} slots available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Threat Level
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-chart-3">Safe</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    No threats detected
                  </p>
                </CardContent>
              </Card>
            </div>

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
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Cached Tier
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold capitalize">{tier}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                        Local
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      On-Chain Tier
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold capitalize">
                        {onChainTier || "Not initialized"}
                      </span>
                      {onChainTier ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {onChainTier && tier !== onChainTier && (
                  <div className="p-3 rounded-md bg-warning/10 border border-warning/20">
                    <p className="text-sm text-warning-foreground">
                      Tier mismatch detected. On-chain tier differs from cached tier.
                    </p>
                  </div>
                )}
                
                {!onChainTier && (
                  <div className="p-3 rounded-md bg-muted">
                    <p className="text-sm text-muted-foreground">
                      Your account is not yet recorded on the Solana blockchain. 
                      Tier upgrades will automatically initialize your on-chain account.
                    </p>
                  </div>
                )}

                {onChainTier && tier === onChainTier && (
                  <div className="p-3 rounded-md bg-chart-3/10 border border-chart-3/20">
                    <p className="text-sm text-chart-3">
                      Account verified and synced with blockchain
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {tier === "pro_plus" ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Arbitrage Bots</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage your automated trading strategies
                    </p>
                  </div>
                  <Button
                    className="hover-elevate active-elevate-2"
                    data-testid="button-add-bot"
                    disabled={activeBots >= maxBots}
                  >
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
                <div className="max-w-md mx-auto space-y-4">
                  <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Upgrade to Pro+ for Arbitrage Bots
                    </h3>
                    <p className="text-muted-foreground">
                      Access up to 5 automated trading bots with custom strategies
                      and MEV protection
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => navigate("/")}
                    className="hover-elevate active-elevate-2"
                    data-testid="button-upgrade-prompt"
                  >
                    View Pricing
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
