import { ArrowRight, Shield, Brain, Bot } from "lucide-react";
import { SiSolana } from "react-icons/si";
import { Button } from "@/components/ui/button";
import mascotImage from "@assets/ChatGPT Image Oct 20, 2025, 01_13_52 PM (1)_1761084038488.png";

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background opacity-50" />
      
      <div className="container relative mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <SiSolana className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Solana Ecosystem</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Protect Your Solana Wallet with{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI-Powered
              </span>{" "}
              Security
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Real-time threat detection, advanced risk scoring, and automated arbitrage bots. 
              Built for crypto-native users on Solana.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="text-base hover-elevate active-elevate-2"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base hover-elevate active-elevate-2"
                data-testid="button-learn-more"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-chart-3 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">AI Threat Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-chart-1 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Deep3 Labs</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-chart-2 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Arbitrage Bots</span>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl rounded-full" />
              <img
                src={mascotImage}
                alt="Wallet Buddhi Mascot"
                className="relative w-64 h-64 md:w-96 md:h-96 object-contain drop-shadow-2xl bg-transparent"
                data-testid="img-hero-mascot"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
