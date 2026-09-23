import { useEffect, useState } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet-context-new";
import { useToast } from "@/hooks/use-toast";
import { ensureSiwsSession } from "@/lib/siws-session";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";

export function WatchTokenButton({
  mint,
  symbol,
  name,
}: {
  mint: string;
  symbol?: string | null;
  name?: string | null;
}) {
  const { connected, address, openConnectModal } = useWallet();
  const { signMessage } = useSolanaWallet();
  const { toast } = useToast();
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cap, setCap] = useState(2);
  const [count, setCount] = useState(0);

  async function refresh() {
    if (!connected || !address || !signMessage) return;
    try {
      await ensureSiwsSession({ address, signMessage });
      const res = await apiRequest("GET", "/api/tokens/watched");
      const data = await res.json();
      setCap(data.cap ?? 2);
      setCount(data.count ?? 0);
      setWatched((data.tokens || []).some((t: { mint: string }) => t.mint === mint));
    } catch {
      /* stay local */
    }
  }

  useEffect(() => {
    void refresh();
  }, [connected, address, mint]);

  async function toggle() {
    if (!connected || !address || !signMessage) {
      openConnectModal();
      toast({ title: "Connect wallet to save this token" });
      return;
    }
    setBusy(true);
    try {
      await ensureSiwsSession({ address, signMessage });
      if (watched) {
        await apiRequest("DELETE", `/api/tokens/watched/${mint}`);
        setWatched(false);
        setCount((n) => Math.max(0, n - 1));
      } else {
        const res = await apiRequest("POST", "/api/tokens/watched", {
          mint,
          symbol: symbol || undefined,
          name: name || undefined,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not watch token");
        }
        setWatched(true);
        setCount((n) => n + 1);
      }
    } catch (error) {
      toast({
        title: "Watch token",
        description: error instanceof Error ? error.message : "Failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={watched ? "secondary" : "default"} size="sm" onClick={toggle} disabled={busy}>
      {watched ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
      {watched ? "Watching" : "Watch token"}
      <span className="ml-2 text-xs opacity-80">
        {count}/{cap}
      </span>
    </Button>
  );
}
