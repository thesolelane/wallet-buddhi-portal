import { createContext, useContext, useState, ReactNode } from "react";
import type { TierType } from "@/components/TierBadge";

interface WalletContextType {
  connected: boolean;
  address: string | null;
  tier: TierType;
  connect: (walletType: string, address: string) => void;
  disconnect: () => void;
  upgradeTier: (newTier: TierType) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [tier, setTier] = useState<TierType>("basic");

  const connect = (walletType: string, walletAddress: string) => {
    console.log(`Connecting to ${walletType} wallet...`);
    setConnected(true);
    setAddress(walletAddress);
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
    setTier("basic");
  };

  const upgradeTier = (newTier: TierType) => {
    setTier(newTier);
  };

  return (
    <WalletContext.Provider
      value={{ connected, address, tier, connect, disconnect, upgradeTier }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
};
