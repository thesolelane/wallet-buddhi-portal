import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Shield, TrendingUp, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useState } from "react";
import { WalletConnectModal } from "@/components/WalletConnectModal";

export default function GettingStarted() {
  const { connected, address, tier, connect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const handleConnectWallet = () => {
    setWalletModalOpen(true);
  };

  const handleWalletConnect = (walletType: string) => {
    const demoAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    connect(walletType, demoAddress);
  };

  const steps = [
    {
      number: 1,
      title: "Connect Your Wallet",
      icon: Wallet,
      description: "Start by connecting your Solana wallet (Phantom, Solflare, or Backpack). This allows Wallet Buddhi to monitor your transactions and protect your funds.",
      details: [
        "Click 'Connect Wallet' in the top right corner",
        "Select your preferred wallet provider",
        "Approve the connection request in your wallet",
        "Your wallet address will appear in the header",
      ],
      status: connected ? "completed" : "pending",
    },
    {
      number: 2,
      title: "Monitor Your Protection",
      icon: Shield,
      description: "Once connected, you'll automatically have Basic tier protection active. View your dashboard to see real-time monitoring of your wallet.",
      details: [
        "Navigate to the Dashboard from the header menu",
        "View your current tier and active features",
        "Check on-chain account status for verification",
        "Monitor wallet activity and threat alerts",
      ],
      status: connected ? "completed" : "pending",
    },
    {
      number: 3,
      title: "Upgrade Your Tier (Optional)",
      icon: TrendingUp,
      description: "Unlock advanced features like AI-powered threat detection and arbitrage bots by upgrading to Pro or Pro+ tier.",
      details: [
        "Review tier options on the home page",
        "Click 'Upgrade' on your desired tier",
        "Choose payment method: SOL or $CATH tokens",
        "Complete payment via Solana Pay",
      ],
      status: tier === "pro" || tier === "pro_plus" ? "completed" : "pending",
    },
    {
      number: 4,
      title: "Make Payments",
      icon: CreditCard,
      description: "Upgrade payments are processed on-chain using Solana Pay. Pay with SOL or $CATH tokens directly from your wallet.",
      details: [
        "Scan the QR code with your mobile wallet",
        "Or copy the payment link for desktop wallets",
        "Approve the transaction in your wallet",
        "Your tier will be upgraded automatically after confirmation",
      ],
      status: tier === "pro" || tier === "pro_plus" ? "completed" : "pending",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onConnectWallet={handleConnectWallet}
        walletConnected={connected}
        walletAddress={address || undefined}
        currentTier={tier}
      />

      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Getting Started</h1>
            <p className="text-lg text-muted-foreground">
              Learn how to set up and use Wallet Buddhi to protect your Solana wallet
            </p>
          </div>

          <div className="space-y-8 mb-16">
            {steps.map((step) => (
              <Card key={step.number} data-testid={`card-step-${step.number}`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-sm">
                          Step {step.number}
                        </Badge>
                        {step.status === "completed" && (
                          <Badge variant="default" className="bg-chart-3 border-chart-3 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl mb-2">{step.title}</CardTitle>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 ml-16">
                    {step.details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-1" />
                <div>
                  <CardTitle className="text-xl">Quick Tips</CardTitle>
                  <CardDescription>
                    Important things to know when using Wallet Buddhi
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">No Refunds:</strong> All tier upgrades are final. Make sure to review features before upgrading.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Direct Payments:</strong> We charge 0% platform fees. Payments go directly to the merchant wallet.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">On-Chain Verification:</strong> Your tier status is stored on the Solana blockchain for transparency and security.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Wallet Support:</strong> Currently supports Phantom, Solflare, and Backpack wallets on Solana devnet.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <WalletConnectModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        onConnect={handleWalletConnect}
      />
    </div>
  );
}
