import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WalletButtonProps {
  onConnect: () => void;
  connected?: boolean;
  address?: string;
}

export function WalletButton({ onConnect, connected, address }: WalletButtonProps) {
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <Button
      onClick={onConnect}
      data-testid={connected ? "button-wallet-connected" : "button-wallet-connect"}
      className="hover-elevate active-elevate-2"
    >
      <Wallet className="h-4 w-4 mr-2" />
      {connected && address ? (
        <span className="font-mono text-sm">{truncateAddress(address)}</span>
      ) : (
        "Connect Wallet"
      )}
    </Button>
  );
}
