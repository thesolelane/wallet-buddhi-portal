import { SiSolana } from "react-icons/si";
import { Wallet, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAvailableWallets, type WalletName } from "@/lib/wallet-adapter";
import { useState, useEffect } from "react";

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (walletType: WalletName) => Promise<void>;
}

export function WalletConnectModal({
  open,
  onOpenChange,
  onConnect,
}: WalletConnectModalProps) {
  const [availableWallets, setAvailableWallets] = useState(getAvailableWallets());

  useEffect(() => {
    if (open) {
      setAvailableWallets(getAvailableWallets());
    }
  }, [open]);

  const walletIcons: Record<string, any> = {
    phantom: Wallet,
    solflare: SiSolana,
    backpack: Wallet,
  };

  const walletColors: Record<string, string> = {
    phantom: "text-purple-500",
    solflare: "text-orange-500",
    backpack: "text-blue-500",
  };

  const walletUrls: Record<string, string> = {
    phantom: "https://phantom.app/download",
    solflare: "https://solflare.com/download",
    backpack: "https://www.backpack.app/downloads",
  };

  const handleConnect = async (walletName: WalletName, installed: boolean) => {
    if (!installed) {
      window.open(walletUrls[walletName], "_blank");
      return;
    }

    await onConnect(walletName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-wallet-connect">
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
          <DialogDescription>
            Choose your preferred Solana wallet to continue
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {availableWallets.map((wallet) => {
            const Icon = walletIcons[wallet.name];
            const color = walletColors[wallet.name];

            return (
              <Button
                key={wallet.name}
                variant="outline"
                className="h-16 justify-start gap-4 hover-elevate active-elevate-2"
                onClick={() => handleConnect(wallet.name, wallet.installed)}
                data-testid={`button-connect-${wallet.name}`}
              >
                <Icon className={`h-8 w-8 ${color}`} />
                <div className="flex flex-col items-start flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{wallet.displayName}</span>
                    {wallet.installed && (
                      <Badge variant="default" className="bg-chart-3 border-chart-3 h-5 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Detected
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {wallet.installed ? (
                      `Connect with ${wallet.displayName}`
                    ) : (
                      <>
                        Not installed - Click to download
                        <ExternalLink className="inline h-3 w-3 ml-1" />
                      </>
                    )}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground text-center pb-2">
          <p>By connecting, you agree to Wallet Buddhi&apos;s Terms of Service</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
