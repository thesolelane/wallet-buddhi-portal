import { Shield } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { ThemeToggle } from "./ThemeToggle";
import { TierBadge, type TierType } from "./TierBadge";

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
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="font-bold text-lg">Wallet Buddhi</span>
              <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                wbuddhi.cooperanth.sol
              </span>
            </div>
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
