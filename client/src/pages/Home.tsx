import { useState } from "react";
import { useLocation } from "wouter";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/Header";
import { TierCard } from "@/components/TierCard";
import { FeatureCard } from "@/components/FeatureCard";
import { Footer } from "@/components/Footer";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useWallet } from "@/lib/wallet-context-new";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Shield, Brain, Bot, Zap, Lock, TrendingUp } from "lucide-react";
import type { TierType } from "@/components/TierBadge";

export default function Home() {
  const [, navigate] = useLocation();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"pro" | "pro_plus">("pro");
  const { connected, tier, upgradeTier } = useWallet();
  const { setVisible } = useWalletModal();

  const handleUpgrade = (tierName: string) => {
    if (!connected) {
      setVisible(true);
      return;
    }

    if (tierName === "Pro") {
      setSelectedTier("pro");
      setUpgradeModalOpen(true);
    } else if (tierName === "Pro+") {
      setSelectedTier("pro_plus");
      setUpgradeModalOpen(true);
    }
  };

  const handleUpgradeComplete = (newTier: TierType) => {
    upgradeTier(newTier);
    // Navigate to dashboard after upgrade
    navigate("/dashboard");
  };

  const tiers = [
    {
      name: "Basic",
      price: "Free",
      description: "Essential wallet protection",
      features: [
        "Local spam classifier",
        "Real-time monitoring",
        "Basic threat detection",
        "Transaction alerts",
        "24/7 monitoring",
      ],
      current: tier === "basic",
    },
    {
      name: "Pro",
      price: "$9.99",
      priceInCath: "50 $CATH",
      description: "Advanced AI protection",
      features: [
        "Everything in Basic",
        "Deep3 Labs AI analysis",
        "Advanced risk scoring",
        "Priority support",
        "Custom alerts",
      ],
      popular: true,
      current: tier === "pro",
      locked: !connected,
    },
    {
      name: "Pro+",
      price: "$29.99",
      priceInCath: "100 $CATH",
      description: "Full automation suite",
      features: [
        "Everything in Pro",
        "Up to 5 arbitrage bots",
        "MEV protection",
        "Custom strategies",
        "Dedicated support",
      ],
      current: tier === "pro_plus",
      locked: !connected,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <Hero onGetStarted={() => setVisible(true)} />

        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful Features
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to protect and optimize your Solana wallet
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={Shield}
                title="AI Protection"
                description="Advanced threat detection powered by Deep3 Labs AI engine"
                iconColor="text-chart-3"
              />
              <FeatureCard
                icon={Brain}
                title="Smart Analysis"
                description="Real-time risk scoring for every transaction you make"
                iconColor="text-chart-1"
              />
              <FeatureCard
                icon={Bot}
                title="Arbitrage Bots"
                description="Automated trading strategies across Solana DEXs"
                iconColor="text-chart-2"
              />
              <FeatureCard
                icon={Zap}
                title="Lightning Fast"
                description="Monitor your wallet with zero latency and instant alerts"
                iconColor="text-chart-4"
              />
              <FeatureCard
                icon={Lock}
                title="Secure by Design"
                description="On-chain payments with 0% platform fees"
                iconColor="text-chart-3"
              />
              <FeatureCard
                icon={TrendingUp}
                title="Performance Tracking"
                description="Detailed analytics for all your bot strategies"
                iconColor="text-chart-1"
              />
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24" id="pricing">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Choose Your Tier
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Flexible pricing with SOL or $CATH token payments
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.name}
                  {...tier}
                  onUpgrade={() => handleUpgrade(tier.name)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        tier={selectedTier}
        onUpgrade={handleUpgradeComplete}
      />
    </div>
  );
}
