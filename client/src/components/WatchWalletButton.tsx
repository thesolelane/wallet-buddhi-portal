import { useEffect, useState } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet-context-new";
import { useToast } from "@/hooks/use-toast";
import { ensureSiwsSession } from "@/lib/siws-session";
import { apiRequest } from "@/lib/queryClient";
import {
  getWalletWatchlist,
  removeWalletFromWatchlist,
} from "@/lib/watchlist";
import { Eye, EyeOff } from "lucide-react";

type ServerWallet = { id: string; pubkey: string; label?: string | null };

function migratedKey(owner: string) {
  return `wb.wallet-watch.migrated:${owner}`;
}

export function WatchWalletButton({ address, label }: { address: string; label?: string }) {
  const { connected, address: owner, openConnectModal } = useWallet();
  const { signMessage } = useSolanaWallet();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState<ServerWallet | null>(null);
  const [count, setCount] = useState(0);

  async function withSession() {
    if (!connected || !owner || !signMessage) {
      openConnectModal();
      throw new Error("Connect a wallet to watch addresses");
    }
    await ensureSiwsSession({ address: owner, signMessage });
  }

  async function sessionMatches(): Promise<boolean> {
    if (!owner) return false;
    const me = await fetch("/api/auth/me", { credentials: "include" });
    if (!me.ok) return false;
    const data = await me.json();
    return data?.address === owner;
  }

  async function loadList(): Promise<ServerWallet[]> {
    const res = await apiRequest("GET", "/api/wallets");
    const data = await res.json();
    const wallets = (data.wallets || []) as ServerWallet[];
    setCount(wallets.length);
    setRow(wallets.find((w) => w.pubkey === address) || null);
    return wallets;
  }

  async function migrateLocal(existing: ServerWallet[]) {
    if (typeof window === "undefined" || !owner) return;
    if (window.localStorage.getItem(migratedKey(owner)) === "1") return;
    const local = getWalletWatchlist();
    const have = new Set(existing.map((w) => w.pubkey));
    let hitCap = existing.length >= 5;
    for (const item of local) {
      if (have.has(item.address)) {
        removeWalletFromWatchlist(item.address);
        continue;
      }
      if (hitCap || existing.length >= 5) {
        hitCap = true;
        continue;
      }
      const res = await fetch("/api/wallets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey: item.address, label: item.label }),
      });
      if (res.status === 201) {
        have.add(item.address);
        existing.push(await res.json());
        removeWalletFromWatchlist(item.address);
      } else if (res.status === 403) {
        hitCap = true;
      }
    }
    if (!hitCap) {
      window.localStorage.setItem(migratedKey(owner), "1");
    }
    setCount(existing.length);
    setRow(existing.find((w) => w.pubkey === address) || null);
  }

  useEffect(() => {
    if (!connected || !owner || !signMessage) {
      setRow(null);
      return;
    }
    void (async () => {
      try {
        if (!(await sessionMatches())) return;
        const list = await loadList();
        await migrateLocal(list);
      } catch {
        /* wait for click */
      }
    })();
  }, [connected, owner, address]);

  async function toggle() {
    setBusy(true);
    try {
      await withSession();
      if (!(await sessionMatches())) throw new Error("Sign-in does not match the connected wallet");
      const list = await loadList();
      await migrateLocal(list);
      const current = list.find((w) => w.pubkey === address) || null;
      if (current) {
        await apiRequest("DELETE", `/api/wallets/${current.id}`);
        setRow(null);
        setCount((n) => Math.max(0, n - 1));
      } else {
        const res = await fetch("/api/wallets", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pubkey: address, label }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Could not watch wallet");
        setRow(body);
        setCount((n) => n + 1);
      }
    } catch (error) {
      toast({
        title: "Watch wallet",
        description: error instanceof Error ? error.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={row ? "default" : "outline"} onClick={() => void toggle()} disabled={busy}>
      {row ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
      {row ? "Watching" : "Watch"}
      <span className="ml-2 text-xs opacity-80">{count}/5</span>
    </Button>
  );
}
