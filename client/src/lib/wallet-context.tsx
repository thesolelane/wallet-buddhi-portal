import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { TierType } from "@/components/TierBadge";
import {
  connectWallet,
  disconnectWallet,
  onAccountChange,
  onDisconnect,
  type WalletName,
  WalletConnectionError,
} from "./wallet-adapter";
import { useToast } from "@/hooks/use-toast";

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  tier: TierType;
  onChainTier: TierType | null;
  walletName: WalletName | null;
  connect: (walletType: WalletName) => Promise<void>;
  disconnect: () => Promise<void>;
  upgradeTier: (newTier: TierType) => void;
  refreshTier: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [tier, setTier] = useState<TierType>("basic");
  const [onChainTier, setOnChainTier] = useState<TierType | null>(null);
  const [walletName, setWalletName] = useState<WalletName | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const { toast } = useToast();

  const refreshTier = useCallback(async () => {
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
  }, [address]);

  useEffect(() => {
    if (connected && address) {
      refreshTier();
    }
  }, [connected, address, refreshTier]);

  useEffect(() => {
    if (!provider) return;

    const unsubscribeAccountChange = onAccountChange(provider, (newPublicKey) => {
      if (newPublicKey) {
        setAddress(newPublicKey);
      } else {
        handleDisconnect();
      }
    });

    const unsubscribeDisconnect = onDisconnect(provider, () => {
      handleDisconnect();
    });

    return () => {
      unsubscribeAccountChange();
      unsubscribeDisconnect();
    };
  }, [provider]);

  const handleDisconnect = () => {
    setConnected(false);
    setAddress(null);
    setTier("basic");
    setOnChainTier(null);
    setWalletName(null);
    setProvider(null);
  };

  const connect = async (walletType: WalletName) => {
    setConnecting(true);
    try {
      const { publicKey, provider: walletProvider } = await connectWallet(walletType);
      
      setAddress(publicKey);
      setWalletName(walletType);
      setProvider(walletProvider);
      setConnected(true);

      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletType.charAt(0).toUpperCase() + walletType.slice(1)}`,
      });
    } catch (error) {
      console.error("Wallet connection error:", error);
      
      if (error instanceof WalletConnectionError) {
        toast({
          title: "Connection Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect to wallet. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      if (provider) {
        await disconnectWallet(provider);
      }
      handleDisconnect();
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      handleDisconnect();
    }
  };

  const upgradeTier = (newTier: TierType) => {
    setTier(newTier);
    refreshTier();
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        address,
        tier,
        onChainTier,
        walletName,
        connect,
        disconnect,
        upgradeTier,
        refreshTier,
      }}
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
