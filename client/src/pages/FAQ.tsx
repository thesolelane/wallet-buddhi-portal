import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { useWallet } from "@/lib/wallet-context";
import { useState } from "react";
import { WalletConnectModal } from "@/components/WalletConnectModal";

export default function FAQ() {
  const { connected, address, tier, connect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const handleConnectWallet = () => {
    setWalletModalOpen(true);
  };

  const handleWalletConnect = (walletType: string) => {
    const demoAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    connect(walletType, demoAddress);
  };

  const faqSections = [
    {
      category: "General",
      questions: [
        {
          q: "What is Wallet Buddhi?",
          a: "Wallet Buddhi is a tiered Solana wallet protection system that provides real-time transaction monitoring, AI-powered threat detection, and automated arbitrage bots. We help protect your crypto assets from scams, phishing attempts, and malicious transactions while offering advanced DeFi automation tools.",
        },
        {
          q: "How does Wallet Buddhi protect my wallet?",
          a: "We monitor your wallet in real-time for suspicious activity, use AI-powered risk scoring to detect potential threats, and provide instant alerts when dangerous transactions are detected. Our system analyzes transaction patterns, contract interactions, and token movements to identify scams, phishing attempts, and rug pulls before they affect your funds.",
        },
        {
          q: "Which wallets are supported?",
          a: "Wallet Buddhi currently supports Phantom, Solflare, and Backpack wallets on the Solana blockchain. We're working on adding support for more wallet providers in the future.",
        },
        {
          q: "Do I need to share my private keys?",
          a: "Absolutely not! Wallet Buddhi never asks for or requires your private keys. We only need read-only access to your public wallet address to monitor transactions. All connections are made through your wallet's standard connection interface.",
        },
      ],
    },
    {
      category: "Tiers & Pricing",
      questions: [
        {
          q: "What's the difference between Basic, Pro, and Pro+ tiers?",
          a: "Basic (Free): Includes local spam classification, real-time monitoring, and basic threat detection. Pro ($9.99): Adds Deep3 Labs AI analysis, advanced risk scoring, and priority support. Pro+ ($29.99): Includes everything in Pro plus up to 5 arbitrage bots, MEV protection, and custom trading strategies.",
        },
        {
          q: "Can I switch between tiers?",
          a: "Yes! You can upgrade from Basic to Pro or Pro+ at any time. Simply go to the home page, select your desired tier, and complete the payment. Note that downgrades are not currently supported.",
        },
        {
          q: "Are there any refunds?",
          a: "All tier upgrades are final and non-refundable. Please review the features carefully before upgrading to ensure the tier meets your needs.",
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept SOL and $CATH tokens via Solana Pay. All payments are processed on-chain with 0% platform fees, meaning payments go directly to our merchant wallet.",
        },
        {
          q: "How long does my tier subscription last?",
          a: "Currently, tier upgrades are one-time purchases that remain active for your wallet address. We may introduce subscription-based pricing in the future.",
        },
      ],
    },
    {
      category: "Features",
      questions: [
        {
          q: "What is Deep3 Labs AI analysis?",
          a: "Deep3 Labs provides advanced AI-powered threat detection that analyzes transaction patterns, smart contract interactions, and token movements to identify sophisticated scams and attacks that basic filters might miss. This feature is available in Pro and Pro+ tiers.",
        },
        {
          q: "How do arbitrage bots work?",
          a: "Arbitrage bots (Pro+ only) automatically scan multiple Solana DEXs (like Jupiter and Raydium) for price differences, then execute trades to profit from these opportunities. You can configure up to 5 bots with custom trading pairs, profit thresholds, and risk levels.",
        },
        {
          q: "What is MEV protection?",
          a: "Maximum Extractable Value (MEV) protection helps prevent front-running and sandwich attacks on your transactions. This Pro+ feature analyzes the mempool and uses advanced routing to minimize the chance of your trades being exploited by MEV bots.",
        },
        {
          q: "Can I customize alert settings?",
          a: "Yes! Pro and Pro+ users can customize alert severity levels, notification preferences, and create whitelists/blacklists for known addresses. Basic tier users receive standard alerts for high-severity threats.",
        },
      ],
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What is on-chain tier verification?",
          a: "Your tier status is stored on the Solana blockchain via our smart contract. This provides transparent, tamper-proof verification of your subscription level. You can view both your cached (local) and on-chain tier status in the dashboard.",
        },
        {
          q: "Why do I see 'cached' and 'on-chain' tier status?",
          a: "Cached tier is stored locally for fast access, while on-chain tier is the authoritative status stored on the Solana blockchain. They should always match, but if you see a mismatch, the on-chain tier is the source of truth.",
        },
        {
          q: "What happens if my wallet gets disconnected?",
          a: "You can reconnect your wallet at any time without losing your tier status. Your tier information is stored on-chain, so it will be restored automatically when you reconnect with the same wallet address.",
        },
        {
          q: "Is my data private and secure?",
          a: "Yes! We only monitor your public transaction data that's already visible on the Solana blockchain. We never access your private keys, seed phrases, or any information that could compromise your wallet security. Your transaction monitoring data is processed in real-time and not permanently stored.",
        },
      ],
    },
    {
      category: "Troubleshooting",
      questions: [
        {
          q: "My wallet won't connect. What should I do?",
          a: "First, ensure your wallet extension is installed and unlocked. Try refreshing the page, then click 'Connect Wallet' again. If issues persist, try a different browser or disable any conflicting browser extensions. Make sure you're on Solana devnet if using a testnet wallet.",
        },
        {
          q: "My payment didn't go through. What happened?",
          a: "Check your wallet for the transaction status. If the transaction failed, you won't be charged. Common issues include insufficient SOL balance for transaction fees, or network congestion. Wait a few moments and try again. If successful, your tier should update within seconds.",
        },
        {
          q: "I upgraded but my tier didn't change. Why?",
          a: "After payment confirmation, your tier should update automatically. If it doesn't, try refreshing the page or disconnecting and reconnecting your wallet. Check the 'On-Chain Account Status' card on your dashboard to verify your blockchain tier status.",
        },
        {
          q: "How do I contact support?",
          a: "For support inquiries, please visit the Cooperanth Consulting website or email our support team. Pro tier users receive priority support with faster response times.",
        },
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
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about Wallet Buddhi
            </p>
          </div>

          <div className="space-y-8">
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h2 className="text-2xl font-bold mb-4">{section.category}</h2>
                <Card>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {section.questions.map((item, index) => (
                        <AccordionItem
                          key={index}
                          value={`${sectionIndex}-${index}`}
                          className="border-b last:border-b-0 px-6"
                          data-testid={`accordion-item-${sectionIndex}-${index}`}
                        >
                          <AccordionTrigger className="text-left hover:no-underline py-4">
                            <span className="font-semibold">{item.q}</span>
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground">
                If you couldn't find the answer you're looking for, please reach out to our
                support team. Pro and Pro+ tier users receive priority support with faster
                response times.
              </p>
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
