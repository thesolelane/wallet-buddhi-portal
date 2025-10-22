import { useMemo, ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  // Use devnet by default, configurable via environment variable
  const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
  const endpoint = useMemo(() => {
    // Use custom RPC if provided, otherwise use default cluster URL
    return import.meta.env.VITE_SOLANA_RPC_ENDPOINT || clusterApiUrl(network as any);
  }, [network]);

  // Initialize wallet adapters
  // Using explicit adapters ensures all wallets show in modal with installation status
  // even when browser extensions are not installed
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
