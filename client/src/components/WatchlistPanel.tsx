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
  const [helius, setHelius] = useState<boolean | null>(null);
  const [pubkey, setPubkey] = useState("");
  const [label, setLabel] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [holdingsNote, setHoldingsNote] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/health/data-sources")
      .then((res) => res.json())
      .then((data) => setHelius(Boolean(data.helius)))
      .catch(() => setHelius(null));
  }, []);

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

  async function loadWalletsQuiet() {
    try {
      const me = await fetch("/api/auth/me", { credentials: "include" });
      if (!me.ok) {
        setReady(false);
        return;
      }
      const res = await apiRequest("GET", "/api/wallets");
      const data = await res.json();
      setWallets(data.wallets || []);
      setReady(true);
    } catch {
      setReady(false);
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
      const [tokenRes, alertRes, holdRes] = await Promise.all([
        apiRequest("GET", `/api/wallets/${id}/tokens`),
        apiRequest("GET", `/api/wallets/${id}/alerts`),
        apiRequest("GET", `/api/wallets/${id}/holdings`),
      ]);
      const tokenData = await tokenRes.json();
      const alertData = await alertRes.json();
      const holdData = await holdRes.json();
      setTokens(tokenData.tokens || []);
      setAlerts(alertData.alerts || []);
      setHoldings(holdData.holdings || []);
      setHoldingsNote(holdData.ok ? "" : holdData.reason || "Could not load holdings");
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
        setHoldings([]);
        setHoldingsNote("");
      }
      const res = await apiRequest("GET", "/api/wallets");
      const data = await res.json();
      setWallets(data.wallets || []);
    });
  }

  async function scan(id?: string) {
    if (helius === false) {
      toast({
        title: "Scan needs Helius",
        description: "Add HELIUS_API_KEY in Replit Secrets, then restart. You can still add wallets.",
      });
      return;
    }
    await withSession(async () => {
      const path = id ? `/api/wallets/${id}/scan` : "/api/wallets/scan";
      const res = await apiRequest("POST", path);
      const summary = await res.json();
      const errors = summary.errors as string[] | undefined;
      const missingKey = errors?.some((e) => String(e).includes("HELIUS_API_KEY"));
      toast({
        title: missingKey ? "Scan needs Helius" : "Scan complete",
        description: missingKey
          ? "Add HELIUS_API_KEY in Replit Secrets, then restart."
          : `New tokens ${summary.newTokens ?? 0} · alerts ${summary.alerts ?? 0}`,
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
    void loadWalletsQuiet();
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
            Connect and sign in to load saved wallets. Token watches stay on this browser without a wallet.
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
              {wallets.length}/5 · {ready ? "signed in" : "saved — sign in to load"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {helius === false && (
            <div className="text-sm rounded-md border border-border bg-muted/40 p-3">
              You can add and list wallets now. Holdings and Scan need a Helius key.
            </div>
          )}
          {!ready && (
            <p className="text-sm text-muted-foreground">
              Wallets are stored on the server. Click Refresh and approve the message once to load them.
            </p>
          )}
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
              {ready ? "No watched wallets yet." : "No list loaded yet. Refresh after you sign."}
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
            <p className="text-sm text-muted-foreground">Select a watched wallet to see holdings and alerts.</p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2">In this wallet</h3>
                {holdingsNote ? (
                  <p className="text-sm text-muted-foreground">{holdingsNote}</p>
                ) : holdings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fungible tokens found.</p>
                ) : (
                  <div className="space-y-2">
                    {holdings.map((t) => (
                      <button
                        key={t.mint}
                        className="w-full text-left p-2 rounded-md border hover:bg-muted/50"
                        onClick={() => navigate(`/token/${t.mint}`)}
                      >
                        <div className="font-medium text-sm">{t.symbol || t.name || shorten(t.mint)}</div>
                        <div className="text-xs text-muted-foreground">
                          {Number(t.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} · {shorten(t.mint)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">New buys from Scan</h3>
                {tokens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stored buys yet. Run a scan to record new purchases.</p>
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
