import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { TierType } from "@/components/TierBadge";

interface WalletContextType {
  connected: boolean;
  address: string | null;
  tier: TierType;
  onChainTier: TierType | null;
  connect: (walletType: string, address: string) => void;
  disconnect: () => void;
  upgradeTier: (newTier: TierType) => void;
  refreshTier: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [tier, setTier] = useState<TierType>("basic");
  const [onChainTier, setOnChainTier] = useState<TierType | null>(null);

  const refreshTier = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/wallet/${address}`);
      if (response.ok) {
        const data = await response.json();
        setTier(data.tier || "basic");
        setOnChainTier(data.onChainTier || null);
      }
    } catch (error) {
      console.error("Error fetching tier:", error);
    }
  };

  useEffect(() => {
    if (connected && address) {
      refreshTier();
    }
  }, [connected, address]);

  const connect = async (walletType: string, walletAddress: string) => {
    console.log(`Connecting to ${walletType} wallet...`);
    setConnected(true);
    setAddress(walletAddress);
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
    setTier("basic");
    setOnChainTier(null);
  };

  const upgradeTier = (newTier: TierType) => {
    setTier(newTier);
    refreshTier();
  };

  return (
    <WalletContext.Provider
      value={{ connected, address, tier, onChainTier, connect, disconnect, upgradeTier, refreshTier }}
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
