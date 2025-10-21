import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { TierType } from "@/components/TierBadge";
import { useToast } from "@/hooks/use-toast";

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  tier: TierType;
  onChainTier: TierType | null;
  walletName: string | null;
  openConnectModal: () => void;
  disconnect: () => Promise<void>;
  upgradeTier: (newTier: TierType) => void;
  refreshTier: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, connecting, disconnect: walletDisconnect, wallet } = useSolanaWallet();
  const { setVisible: setModalVisible } = useWalletModal();
  const [tier, setTier] = useState<TierType>("basic");
  const [onChainTier, setOnChainTier] = useState<TierType | null>(null);
  const { toast } = useToast();

  // Convert publicKey to address string
  const address = publicKey?.toBase58() || null;
  
  // Get wallet name from adapter
  const walletName = wallet?.adapter?.name || null;

  const refreshTier = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/wallet/${address}`);
      if (response.ok) {
        const data = await response.json();
        setTier(data.tier || "basic");
        setOnChainTier(data.onChainTier || null);
      } else {
        console.error("Failed to fetch tier, using cached value");
      }
    } catch (error) {
      console.error("Error fetching tier:", error);
      toast({
        title: "Connection Issue",
        description: "Failed to refresh tier information. Using cached data.",
        variant: "destructive",
      });
    }
  }, [address, toast]);

  // Refresh tier when wallet connects
  useEffect(() => {
    if (connected && address) {
      refreshTier();
    } else {
      setTier("basic");
      setOnChainTier(null);
    }
  }, [connected, address, refreshTier]);

  // Show connection toast
  useEffect(() => {
    if (connected && address) {
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${walletName || "wallet"}`,
      });
    }
  }, [connected, address, walletName, toast]);

  const disconnect = async () => {
    try {
      await walletDisconnect();
      setTier("basic");
      setOnChainTier(null);
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  const openConnectModal = () => {
    setModalVisible(true);
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
        openConnectModal,
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
