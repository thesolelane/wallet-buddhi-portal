import { SiSolana } from "react-icons/si";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WalletConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (walletType: string) => void;
}

export function WalletConnectModal({
  open,
  onOpenChange,
  onConnect,
}: WalletConnectModalProps) {
  const wallets = [
    {
      name: "Phantom",
      icon: Wallet,
      color: "text-purple-500",
      id: "phantom",
    },
    {
      name: "Solflare",
      icon: SiSolana,
      color: "text-orange-500",
      id: "solflare",
    },
    {
      name: "Backpack",
      icon: Wallet,
      color: "text-blue-500",
      id: "backpack",
    },
  ];

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
          {wallets.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className="h-16 justify-start gap-4 hover-elevate active-elevate-2"
              onClick={() => {
                onConnect(wallet.id);
                onOpenChange(false);
              }}
              data-testid={`button-connect-${wallet.id}`}
            >
              <wallet.icon className={`h-8 w-8 ${wallet.color}`} />
              <div className="flex flex-col items-start">
                <span className="font-semibold">{wallet.name}</span>
                <span className="text-xs text-muted-foreground">
                  Connect with {wallet.name}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
