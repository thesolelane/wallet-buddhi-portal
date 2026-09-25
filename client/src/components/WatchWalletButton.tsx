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

const MIGRATED_KEY = "wb.wallet-watch.migrated";

type ServerWallet = { id: string; pubkey: string; label?: string | null };

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

  async function loadList(): Promise<ServerWallet[]> {
    const res = await apiRequest("GET", "/api/wallets");
    const data = await res.json();
    const wallets = (data.wallets || []) as ServerWallet[];
    setCount(wallets.length);
    setRow(wallets.find((w) => w.pubkey === address) || null);
    return wallets;
  }

  async function migrateLocal(existing: ServerWallet[]) {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(MIGRATED_KEY) === "1") return;
    const local = getWalletWatchlist();
    const have = new Set(existing.map((w) => w.pubkey));
    for (const item of local) {
      if (have.has(item.address) || existing.length >= 5) continue;
      const res = await fetch("/api/wallets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkey: item.address, label: item.label }),
      });
      if (res.status === 201) {
        have.add(item.address);
        existing.push(await res.json());
      }
      if (res.status === 403) break;
    }
    for (const item of local) removeWalletFromWatchlist(item.address);
    window.localStorage.setItem(MIGRATED_KEY, "1");
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
        const me = await fetch("/api/auth/me", { credentials: "include" });
        if (!me.ok) return;
        const list = await loadList();
        await migrateLocal(list);
      } catch {
        /* stay local-looking until they click */
      }
    })();
  }, [connected, owner, address]);

  async function toggle() {
    setBusy(true);
    try {
      await withSession();
      const list = await loadList();
      await migrateLocal(list);
      if (row) {
        await apiRequest("DELETE", `/api/wallets/${row.id}`);
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
