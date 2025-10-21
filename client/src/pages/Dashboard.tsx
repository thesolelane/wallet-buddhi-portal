import { useState } from "react";
import { Header } from "@/components/Header";
import { BotCard } from "@/components/BotCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Shield, Wallet as WalletIcon } from "lucide-react";
import type { TierType } from "@/components/TierBadge";

export default function Dashboard() {
  const [walletConnected] = useState(true);
  const [walletAddress] = useState("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
  const [currentTier] = useState<TierType>("pro_plus");

  const bots = [
    {
      id: "bot-1",
      name: "Cross-DEX Arbitrage",
      strategy: "Jupiter ↔ Raydium",
      status: "active" as const,
      performance: "+12.5%",
    },
    {
      id: "bot-2",
      name: "Token Pair Monitor",
      strategy: "SOL/USDC",
      status: "active" as const,
      performance: "+8.3%",
    },
    {
      id: "bot-3",
      name: "MEV Protection Bot",
      strategy: "Anti-sandwich",
      status: "inactive" as const,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onConnectWallet={() => {}}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        currentTier={currentTier}
      />

      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 py-8">
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your wallet protection and arbitrage bots
              </p>
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
                  <div className="text-2xl font-bold">2 / 5</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    3 slots available
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bot
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots.map((bot) => (
                  <BotCard
                    key={bot.id}
                    {...bot}
                    onToggle={(active) =>
                      console.log(`Bot ${bot.id} toggled:`, active)
                    }
                    onConfigure={() => console.log(`Configure bot ${bot.id}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
