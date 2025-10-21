import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  Eye, 
  Link as LinkIcon, 
  Key,
  FileCheck,
  Globe,
  CheckCircle2
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { useState } from "react";
import { WalletConnectModal } from "@/components/WalletConnectModal";

export default function Security() {
  const { connected, address, tier, connect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const handleConnectWallet = () => {
    setWalletModalOpen(true);
  };

  const handleWalletConnect = async (walletType: any) => {
    await connect(walletType);
  };

  const bestPractices = [
    {
      icon: Key,
      title: "Protect Your Private Keys",
      level: "Critical",
      tips: [
        "Never share your seed phrase or private keys with anyone, including Wallet Buddhi support",
        "Store your seed phrase offline in a secure location (not on your computer or cloud)",
        "Use a hardware wallet for storing large amounts of crypto",
        "Never enter your seed phrase on any website or app",
        "Be wary of anyone claiming they need your keys to 'help' you",
      ],
    },
    {
      icon: Lock,
      title: "Secure Your Wallet Connection",
      level: "High",
      tips: [
        "Only connect your wallet to trusted, verified applications",
        "Review all transaction details before approving",
        "Disconnect your wallet when not actively using a dApp",
        "Use separate wallets for different purposes (one for high-value holdings, one for daily use)",
        "Enable wallet security features like password protection and biometric authentication",
      ],
    },
    {
      icon: AlertTriangle,
      title: "Recognize Common Scams",
      level: "Critical",
      tips: [
        "Phishing websites: Always verify the URL before connecting your wallet",
        "Fake airdrops: Be suspicious of unsolicited tokens appearing in your wallet",
        "Impersonation: Scammers may pose as support staff or developers",
        "Rug pulls: Research projects thoroughly before investing",
        "Honeypot tokens: Tokens that can be bought but not sold",
      ],
    },
    {
      icon: Eye,
      title: "Monitor Your Wallet Activity",
      level: "High",
      tips: [
        "Regularly check your wallet for unauthorized transactions",
        "Set up alerts for all transactions (available in Pro tier)",
        "Review your connected apps and revoke access to unused dApps",
        "Keep track of your token approvals and spending limits",
        "Use Wallet Buddhi's real-time monitoring to catch suspicious activity early",
      ],
    },
    {
      icon: LinkIcon,
      title: "Verify Smart Contracts",
      level: "Medium",
      tips: [
        "Check if the contract is verified on Solana explorers",
        "Read reviews and audit reports before interacting with new protocols",
        "Be cautious with newly launched tokens and contracts",
        "Understand what permissions you're granting when approving transactions",
        "Use Pro tier's AI analysis to assess contract risk automatically",
      ],
    },
    {
      icon: Globe,
      title: "Practice Safe Browsing",
      level: "Medium",
      tips: [
        "Bookmark legitimate sites and use them instead of search results",
        "Double-check URLs for typos (example.com vs examp1e.com)",
        "Use a dedicated browser for crypto activities",
        "Keep your browser and wallet extensions updated",
        "Avoid clicking on suspicious links in Discord, Telegram, or email",
      ],
    },
  ];

  const tierFeatures = [
    {
      tier: "Basic",
      features: [
        "Real-time transaction monitoring",
        "Basic threat detection",
        "Local spam classifier",
        "Transaction alerts",
      ],
    },
    {
      tier: "Pro",
      features: [
        "All Basic features",
        "Deep3 Labs AI threat analysis",
        "Advanced risk scoring",
        "Custom alert preferences",
        "Priority support",
      ],
    },
    {
      tier: "Pro+",
      features: [
        "All Pro features",
        "MEV attack protection",
        "Automated bot security",
        "Custom security strategies",
        "Dedicated security expert",
      ],
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
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Security Best Practices
            </h1>
            <p className="text-lg text-muted-foreground">
              Essential guidelines to keep your Solana wallet safe and secure
            </p>
          </div>

          <Card className="mb-12 bg-destructive/5 border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-destructive">
                    Remember: You Are Your Own Bank
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    In cryptocurrency, there's no customer service to call if something goes wrong. 
                    You are solely responsible for the security of your funds. Wallet Buddhi helps 
                    protect you, but following these security practices is essential.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Golden Rule:</strong> If something seems too good to be true, it probably is. 
                    Always verify before you trust.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 mb-16">
            {bestPractices.map((practice, index) => (
              <Card key={index} data-testid={`card-practice-${index}`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <practice.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-2xl">{practice.title}</CardTitle>
                        <Badge
                          variant={practice.level === "Critical" ? "destructive" : "outline"}
                          className={
                            practice.level === "High"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : ""
                          }
                        >
                          {practice.level} Priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 ml-16">
                    {practice.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">How Wallet Buddhi Protects You</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tierFeatures.map((item, index) => (
                <Card
                  key={index}
                  className={item.tier === "Pro" ? "border-primary/40" : ""}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {item.tier}
                      {item.tier === "Pro" && (
                        <Badge variant="default" className="ml-auto">
                          Popular
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {item.tier === "Basic" && "Free protection for everyone"}
                      {item.tier === "Pro" && "Advanced AI security"}
                      {item.tier === "Pro+" && "Maximum protection"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {item.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <FileCheck className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Security Checklist</h3>
                  <p className="text-muted-foreground mb-4">
                    Make sure you've covered all the basics:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Seed phrase securely stored offline</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Wallet password enabled</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Connected to Wallet Buddhi for monitoring</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Regular review of wallet permissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Bookmarked legitimate crypto websites</span>
                    </li>
                  </ul>
                </div>
              </div>
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
