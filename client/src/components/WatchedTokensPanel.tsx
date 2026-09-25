import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Trash2 } from "lucide-react";

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WatchedTokensPanel() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tokens, setTokens] = useState<any[]>([]);
  const [cap, setCap] = useState(2);
  const [tier, setTier] = useState("free");
  const [mergeTrimmed, setMergeTrimmed] = useState(false);

  async function refresh() {
    try {
      const res = await apiRequest("GET", "/api/tokens/watched-guest");
      const data = await res.json();
      setTokens(data.tokens || []);
      setCap(data.cap ?? 2);
      setTier("free");
      setMergeTrimmed(Boolean(data.mergeTrimmed));
    } catch (error) {
      toast({
        title: "Watched tokens",
        description: error instanceof Error ? error.message : "Failed to load",
        variant: "destructive",
      });
    }
  }

  async function dismissMergeNotice() {
    try {
      await apiRequest("POST", "/api/tokens/watched-guest/ack-merge");
      setMergeTrimmed(false);
    } catch (error) {
      toast({
        title: "Could not dismiss notice",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function remove(mint: string) {
    try {
      await apiRequest("DELETE", `/api/tokens/watched-guest/${mint}`);
      setTokens((list) => list.filter((t) => t.mint !== mint));
    } catch (error) {
      toast({
        title: "Could not remove",
        description: error instanceof Error ? error.message : "Failed",
        variant: "destructive",
      });
    }
  }

  async function clearAll() {
    try {
      await apiRequest("DELETE", "/api/tokens/watched-guest");
      setTokens([]);
    } catch (error) {
      toast({
        title: "Could not clear",
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
        {mergeTrimmed && (
          <div role="status" data-testid="guest-merge-notice" className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p>
              Some tokens saved under an older browser ID were not kept when your watchlists were combined.
              Free guest watchlists can hold up to {cap} tokens; your current saved tokens are shown below.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void dismissMergeNotice()}>
              Dismiss
            </Button>
          </div>
        )}
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inspect a token and tap Watch token. No wallet needed for 2 free watches.
          </p>
        ) : (
          <>
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-md border">
                <button className="flex-1 text-left" onClick={() => navigate(`/token/${t.mint}`)}>
                  <div className="text-sm font-medium">{t.symbol || t.name || shorten(t.mint)}</div>
                  <div className="text-xs font-mono text-muted-foreground">{shorten(t.mint)}</div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.mint)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => void clearAll()}>
              Clear all
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
