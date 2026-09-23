import { useEffect, useState } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet-context-new";
import { useToast } from "@/hooks/use-toast";
import { ensureSiwsSession } from "@/lib/siws-session";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Trash2 } from "lucide-react";

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WatchedTokensPanel() {
  const { connected, address } = useWallet();
  const { signMessage } = useSolanaWallet();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tokens, setTokens] = useState<any[]>([]);
  const [cap, setCap] = useState(2);
  const [tier, setTier] = useState("basic");
  const signed = Boolean(connected && address && signMessage);

  function listPath() {
    return signed ? "/api/tokens/watched" : "/api/tokens/watched-guest";
  }

  async function refresh() {
    try {
      if (signed) await ensureSiwsSession({ address: address!, signMessage: signMessage! });
      const res = await apiRequest("GET", listPath());
      const data = await res.json();
      setTokens(data.tokens || []);
      setCap(data.cap ?? 2);
      setTier(signed ? data.tier ?? "basic" : "free");
    } catch (error) {
      toast({
        title: "Watched tokens",
        description: error instanceof Error ? error.message : "Failed to load",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    void refresh();
  }, [connected, address]);

  async function remove(mint: string) {
    try {
      const path = signed ? `/api/tokens/watched/${mint}` : `/api/tokens/watched-guest/${mint}`;
      await apiRequest("DELETE", path);
      setTokens((list) => list.filter((t) => t.mint !== mint));
    } catch (error) {
      toast({
        title: "Could not remove",
        description: error instanceof Error ? error.message : "Failed",
        variant: "destructive",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Watched tokens
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {tokens.length}/{cap} · {tier}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inspect a token and tap Watch token. No wallet needed for 2 free watches.
          </p>
        ) : (
          tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-md border">
              <button className="flex-1 text-left" onClick={() => navigate(`/token/${t.mint}`)}>
                <div className="text-sm font-medium">{t.symbol || t.name || shorten(t.mint)}</div>
                <div className="text-xs font-mono text-muted-foreground">{shorten(t.mint)}</div>
              </button>
              <Button size="icon" variant="ghost" onClick={() => remove(t.mint)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
