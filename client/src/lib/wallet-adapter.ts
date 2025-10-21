/**
 * Solana Wallet Adapter - Direct browser wallet integration
 * Supports Phantom, Solflare, and Backpack wallets
 */

import { PublicKey } from "@solana/web3.js";

export type WalletName = "phantom" | "solflare" | "backpack";

export interface WalletAdapter {
  publicKey: PublicKey | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
}

// Window type extensions for wallet objects
declare global {
  interface Window {
    solana?: any;
    phantom?: { solana?: any };
    solflare?: any;
    backpack?: any;
  }
}

export class WalletConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletConnectionError";
  }
}

/**
 * Check if a wallet is installed in the browser
 */
export function isWalletInstalled(walletName: WalletName): boolean {
  if (typeof window === "undefined") return false;

  switch (walletName) {
    case "phantom":
      return !!(window.solana?.isPhantom || window.phantom?.solana);
    case "solflare":
      return !!window.solflare;
    case "backpack":
      return !!window.backpack?.isBackpack;
    default:
      return false;
  }
}

/**
 * Get the wallet provider object from the browser
 */
function getWalletProvider(walletName: WalletName): any {
  if (typeof window === "undefined") return null;

  switch (walletName) {
    case "phantom":
      return window.solana?.isPhantom
        ? window.solana
        : window.phantom?.solana;
    case "solflare":
      return window.solflare;
    case "backpack":
      return window.backpack;
    default:
      return null;
  }
}

/**
 * Connect to a Solana wallet
 */
export async function connectWallet(walletName: WalletName): Promise<{
  publicKey: string;
  provider: any;
}> {
  if (!isWalletInstalled(walletName)) {
    throw new WalletConnectionError(
      `${walletName.charAt(0).toUpperCase() + walletName.slice(1)} wallet is not installed. Please install the browser extension.`
    );
  }

  const provider = getWalletProvider(walletName);
  if (!provider) {
    throw new WalletConnectionError(`Failed to get ${walletName} wallet provider`);
  }

  try {
    // Request connection
    const response = await provider.connect();
    const publicKey = response?.publicKey || provider.publicKey;

    if (!publicKey) {
      throw new WalletConnectionError("Failed to get public key from wallet");
    }

    return {
      publicKey: publicKey.toString(),
      provider,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new WalletConnectionError("Wallet connection rejected by user");
    }
    throw new WalletConnectionError(
      error.message || "Failed to connect to wallet"
    );
  }
}

/**
 * Disconnect from a wallet
 */
export async function disconnectWallet(provider: any): Promise<void> {
  if (!provider) return;

  try {
    if (provider.disconnect) {
      await provider.disconnect();
    }
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
  }
}

/**
 * Get all available wallets
 */
export function getAvailableWallets(): Array<{
  name: WalletName;
  displayName: string;
  installed: boolean;
}> {
  return [
    {
      name: "phantom",
      displayName: "Phantom",
      installed: isWalletInstalled("phantom"),
    },
    {
      name: "solflare",
      displayName: "Solflare",
      installed: isWalletInstalled("solflare"),
    },
    {
      name: "backpack",
      displayName: "Backpack",
      installed: isWalletInstalled("backpack"),
    },
  ];
}

/**
 * Listen for account changes
 */
export function onAccountChange(
  provider: any,
  callback: (publicKey: string | null) => void
): () => void {
  if (!provider) return () => {};

  const handleAccountChange = (publicKey: any) => {
    callback(publicKey ? publicKey.toString() : null);
  };

  if (provider.on) {
    provider.on("accountChanged", handleAccountChange);

    return () => {
      if (provider.off || provider.removeListener) {
        (provider.off || provider.removeListener)("accountChanged", handleAccountChange);
      }
    };
  }

  return () => {};
}

/**
 * Listen for disconnect events
 */
export function onDisconnect(provider: any, callback: () => void): () => void {
  if (!provider) return () => {};

  if (provider.on) {
    provider.on("disconnect", callback);

    return () => {
      if (provider.off || provider.removeListener) {
        (provider.off || provider.removeListener)("disconnect", callback);
      }
    };
  }

  return () => {};
}
