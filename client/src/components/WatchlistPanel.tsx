import { useEffect, useState } from "react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet-context-new";
import { useToast } from "@/hooks/use-toast";
import { ensureSiwsSession } from "@/lib/siws-session";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Plus, RefreshCw, Trash2 } from "lucide-react";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WatchlistPanel() {
  const { connected, address, openConnectModal } = useWallet();
  const { signMessage } = useSolanaWallet();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [label, setLabel] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  async function withSession<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (!connected || !address || !signMessage) {
      openConnectModal();
      return;
    }
    setBusy(true);
    try {
      await ensureSiwsSession({ address, signMessage });
      setReady(true);
      return await fn();
    } catch (error) {
      toast({
        title: "Watchlist error",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function refreshList() {
    await withSession(async () => {
      const res = await apiRequest("GET", "/api/wallets");
      const data = await res.json();
      setWallets(data.wallets || []);
    });
  }

  async function loadWallet(id: string) {
    setSelectedId(id);
    await withSession(async () => {
      const [tokenRes, alertRes] = await Promise.all([
        apiRequest("GET", `/api/wallets/${id}/tokens`),
        apiRequest("GET", `/api/wallets/${id}/alerts`),
      ]);
      const tokenData = await tokenRes.json();
      const alertData = await alertRes.json();
      setTokens(tokenData.tokens || []);
      setAlerts(alertData.alerts || []);
    });
  }

  async function addWallet() {
    if (!SOLANA_ADDRESS_RE.test(pubkey.trim())) {
      toast({ title: "Invalid address", variant: "destructive" });
      return;
    }
    await withSession(async () => {
      await apiRequest("POST", "/api/wallets", {
        pubkey: pubkey.trim(),
        label: label.trim() || undefined,
      });
      setPubkey("");
      setLabel("");
      const res = await apiRequest("GET", "/api/wallets");
      const data = await res.json();
      setWallets(data.wallets || []);
    });
  }

  async function removeWallet(id: string) {
    await withSession(async () => {
      await apiRequest("DELETE", `/api/wallets/${id}`);
      if (selectedId === id) {
        setSelectedId(null);
        setTokens([]);
        setAlerts([]);
      }
      const res = await apiRequest("GET", "/api/wallets");
      const data = await res.json();
      setWallets(data.wallets || []);
    });
  }

  async function scan(id?: string) {
    await withSession(async () => {
      const path = id ? `/api/wallets/${id}/scan` : "/api/wallets/scan";
      const res = await apiRequest("POST", path);
      const summary = await res.json();
      toast({
        title: "Scan complete",
        description: `New tokens ${summary.newTokens ?? 0} · alerts ${summary.alerts ?? 0}`,
      });
      if (id) await loadWallet(id);
      else await refreshList();
    });
  }

  async function dismiss(id: string) {
    await withSession(async () => {
      await apiRequest("POST", `/api/alerts/${id}/dismiss`);
      if (selectedId) await loadWallet(selectedId);
    });
  }

  useEffect(() => {
    if (connected && address) {
      void refreshList();
    }
  }, [connected, address]);

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connect a wallet to sign in. We never request private keys.
          </p>
          <Button onClick={openConnectModal}>Connect wallet</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Watched wallets
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {wallets.length}/5 · {ready ? "signed in" : "sign-in on first action"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Wallet address to watch"
              value={pubkey}
              onChange={(e) => setPubkey(e.target.value)}
            />
            <Input
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="sm:max-w-[160px]"
            />
            <Button onClick={addWallet} disabled={busy}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshList} disabled={busy}>
              Refresh
            </Button>
            <Button variant="outline" onClick={() => scan()} disabled={busy}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Scan all
            </Button>
          </div>
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No server-side watches yet. Add any public Solana address.
            </p>
          ) : (
            <div className="space-y-2">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className={`flex items-center gap-2 p-2 rounded-md border ${
                    selectedId === w.id ? "border-primary" : "border-border"
                  }`}
                >
                  <button className="flex-1 text-left font-mono text-sm" onClick={() => loadWallet(w.id)}>
                    {shorten(w.pubkey)}
                    {w.label ? <span className="ml-2 text-xs text-muted-foreground">{w.label}</span> : null}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => scan(w.id)} disabled={busy}>
                    Scan
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeWallet(w.id)} disabled={busy}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tokens and alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select a watched wallet to see buys and alerts.</p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2">Recent tokens</h3>
                {tokens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stored buys yet. Run a scan.</p>
                ) : (
                  <div className="space-y-2">
                    {tokens.slice(0, 12).map((t) => (
                      <button
                        key={t.id}
                        className="w-full text-left p-2 rounded-md border hover:bg-muted/50"
                        onClick={() => navigate(`/token/${t.mint}`)}
                      >
                        <div className="font-medium text-sm">{t.symbol || t.name || shorten(t.mint)}</div>
                        <div className="text-xs text-muted-foreground font-mono">{shorten(t.mint)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Alerts</h3>
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No copycat alerts for this wallet.</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((a) => (
                      <div key={a.id} className="p-2 rounded-md border space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={a.verdict === "DANGER" ? "destructive" : "secondary"}>{a.verdict}</Badge>
                          <span className="text-sm">{a.newSymbol || a.newName || shorten(a.newMint)}</span>
                        </div>
                        {a.matchedSymbol || a.matchedName ? (
                          <p className="text-xs text-muted-foreground">
                            Looks like {a.matchedSymbol || a.matchedName}
                          </p>
                        ) : null}
                        {!a.dismissedAt ? (
                          <Button size="sm" variant="outline" onClick={() => dismiss(a.id)}>
                            Dismiss
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Dismissed</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
