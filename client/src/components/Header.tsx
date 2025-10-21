import { LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./ThemeToggle";
import { TierBadge, type TierType } from "./TierBadge";
import { MobileNav } from "./MobileNav";
import logoImage from "@assets/ChatGPT Image Oct 20, 2025, 01_13_52 PM_1761077109275.png";

interface HeaderProps {
  onConnectWallet: () => void;
  walletConnected?: boolean;
  walletAddress?: string;
  currentTier?: TierType;
}

export function Header({
  onConnectWallet,
  walletConnected,
  walletAddress,
  currentTier = "basic",
}: HeaderProps) {
  const [location, navigate] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MobileNav connected={walletConnected || false} />
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2"
              data-testid="button-home"
            >
              <img 
                src={logoImage} 
                alt="Wallet Buddhi Logo" 
                className="h-8 w-8 md:h-10 md:w-10 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-lg">Wallet Buddhi</span>
                <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                  wbuddhi.cooperanth.sol
                </span>
              </div>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {walletConnected && location !== "/dashboard" && (
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                data-testid="link-dashboard"
                className="hover-elevate active-elevate-2"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {walletConnected && <TierBadge tier={currentTier} />}
            <WalletButton
              onConnect={onConnectWallet}
              connected={walletConnected}
              address={walletAddress}
            />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
