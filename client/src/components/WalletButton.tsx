import { Wallet, Check, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/lib/wallet-context";

interface WalletButtonProps {
  onConnect: () => void;
  connected?: boolean;
  address?: string;
}

export function WalletButton({ onConnect, connected, address }: WalletButtonProps) {
  const { disconnect, connecting, walletName } = useWallet();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (connecting) {
    return (
      <Button disabled className="hover-elevate active-elevate-2">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (connected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="button-wallet-connected"
            className="hover-elevate active-elevate-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
              <span className="font-mono text-sm">{truncateAddress(address)}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Connected Wallet</span>
              <span className="font-mono text-sm">{truncateAddress(address)}</span>
              {walletName && (
                <span className="text-xs text-muted-foreground capitalize">
                  {walletName}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => copyToClipboard(address)}
            data-testid="button-copy-address"
          >
            <Check className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => disconnect()}
            className="text-destructive focus:text-destructive"
            data-testid="button-disconnect"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={onConnect}
      data-testid="button-wallet-connect"
      className="hover-elevate active-elevate-2"
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
