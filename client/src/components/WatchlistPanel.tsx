import { useEffect, useMemo, useState } from "react";
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
import { isBaitName, shortTokenLabel, splitHoldings } from "@/lib/holding-rank";
import { ArrowDownRight, ArrowUpRight, Eye, Plus, Trash2 } from "lucide-react";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ago(ts?: number) {
  if (!ts) return "";
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

type WalletPurpose = "mine" | "research";
type Swap = { signature: string; timestamp: number; direction: "buy" | "sell" | "unknown"; tokenMint: string };
type Quote = { mint: string; priceUsd: number | null; marketCapUsd: number | null; holders: number | null };

export function WatchlistPanel() {
  const { connected, address, openConnectModal } = useWallet();
  const { signMessage } = useSolanaWallet();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState<WalletPurpose>("research");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [holdingsNote, setHoldingsNote] = useState("");
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [trafficNote, setTrafficNote] = useState("");
  const [showDust, setShowDust] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  const ranked = useMemo(() => splitHoldings(holdings), [holdings]);

  useEffect(() => {
    const mints = ranked.notable.slice(0, 8).map((h) => h.mint).join(",");
    if (!mints) { setQuotes({}); return; }
    let live = true;
    fetch(`/api/tokens/quotes?mints=${mints}`)
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        const next: Record<string, Quote> = {};
        for (const q of data.quotes || []) next[q.mint] = q;
        setQuotes(next);
      })
      .catch(() => { if (live) setQuotes({}); });
    return () => { live = false; };
  }, [ranked.notable.map((h) => h.mint).join(",")]);

  async function withSession<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (!connected || !address || !signMessage) { openConnectModal(); return; }
    setBusy(true);
    try {
      await ensureSiwsSession({ address, signMessage });
      setReady(true);
      return await fn();
    } catch (error) {
      toast({ title: "Watchlist error", description: error instanceof Error ? error.message : "Request failed", variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function refreshList() {
    await withSession(async () => {
      const res = await apiRequest("GET", "/api/wallets");
      setWallets((await res.json()).wallets || []);
    });
  }

  async function loadWallet(id: string) {
    setSelectedId(id);
    setShowDust(false);
    const watched = wallets.find((w) => w.id === id);
    await withSession(async () => {
      const holdData = await (await apiRequest("GET", `/api/wallets/${id}/holdings`)).json();
      setHoldings(holdData.holdings || []);
      setHoldingsNote(holdData.ok ? "" : holdData.reason || "Could not load holdings");
      if (!watched?.pubkey) { setSwaps([]); setTrafficNote(""); return; }
      const act = await (await fetch(`/api/wallet/${watched.pubkey}/activity?limit=40`)).json();
      if (!act.ok) { setSwaps([]); setTrafficNote(act.reason || "Could not load traffic"); }
      else { setSwaps(act.swaps || []); setTrafficNote(""); }
    });
  }

  async function addWallet() {
    if (!SOLANA_ADDRESS_RE.test(pubkey.trim())) { toast({ title: "Invalid address", variant: "destructive" }); return; }
    await withSession(async () => {
      await apiRequest("POST", "/api/wallets", { pubkey: pubkey.trim(), label: label.trim() || undefined, purpose });
      setPubkey(""); setLabel("");
      const res = await apiRequest("GET", "/api/wallets");
      setWallets((await res.json()).wallets || []);
    });
  }

  async function setWalletPurpose(id: string, next: WalletPurpose) {
    await withSession(async () => {
      await apiRequest("PATCH", `/api/wallets/${id}`, { purpose: next });
      setWallets((await (await apiRequest("GET", "/api/wallets")).json()).wallets || []);
    });
  }

  async function removeWallet(id: string) {
    await withSession(async () => {
      await apiRequest("DELETE", `/api/wallets/${id}`);
      if (selectedId === id) { setSelectedId(null); setHoldings([]); setSwaps([]); }
      setWallets((await (await apiRequest("GET", "/api/wallets")).json()).wallets || []);
    });
  }

  async function scan(id?: string) {
    await withSession(async () => {
      const summary = await (await apiRequest("POST", id ? `/api/wallets/${id}/scan` : "/api/wallets/scan")).json();
      toast({ title: "Scan complete", description: `New tokens ${summary.newTokens ?? 0}` });
      if (id) await loadWallet(id); else await refreshList();
    });
  }

  useEffect(() => {
    let active = true;
    setReady(false); setWallets([]); setSelectedId(null); setHoldings([]); setSwaps([]);
    if (connected && address) {
      void (async () => {
        try {
          const me = await fetch("/api/auth/me", { credentials: "include" });
          if (!me.ok || (await me.json()).address !== address) return;
          const res = await apiRequest("GET", "/api/wallets");
          if (active) { setWallets((await res.json()).wallets || []); setReady(true); }
        } catch { /* next */ }
      })();
    }
    return () => { active = false; };
  }, [connected, address]);

  function lastTouch(mint: string) {
    const hits = swaps.filter((s) => s.tokenMint === mint);
    if (!hits.length) return null;
    const last = hits.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    const first = hits.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
    return { last, first, same: first.signature === last.signature };
  }

  function renderHolding(t: any) {
    const bait = isBaitName(t.name, t.symbol);
    const q = quotes[t.mint];
    const usd = q?.priceUsd != null ? Number(t.amount) * q.priceUsd : null;
    const touch = lastTouch(t.mint);
    return (
      <button key={t.mint} className="w-full text-left p-2 rounded-md border" onClick={() => navigate(`/token/${t.mint}`)}>
        <div className="font-medium text-sm flex items-center gap-2">
          {shortTokenLabel(t.name, t.symbol, t.mint)}
          {bait ? <Badge variant="destructive">bait</Badge> : null}
          {usd != null ? <span className="ml-auto text-xs font-normal">{usd < 0.01 ? "~$0" : `~$${usd.toFixed(usd < 10 ? 2 : 0)}`}</span> : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {Number(t.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} · {shorten(t.mint)}
          {q?.holders ? ` · ${q.holders.toLocaleString()} holders` : ""}
          {touch ? ` · last ${touch.last.direction === "buy" ? "in" : "out"} ${ago(touch.last.timestamp)}` : " · no recent trade"}
        </div>
      </button>
    );
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader><CardTitle>Watchlist</CardTitle></CardHeader>
        <CardContent><Button onClick={openConnectModal}>Connect wallet</Button></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Watched wallets
            <span className="ml-auto text-xs font-normal text-muted-foreground">{wallets.length}/5</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={purpose === "mine" ? "default" : "outline"} onClick={() => setPurpose("mine")}>Mine</Button>
            <Button size="sm" variant={purpose === "research" ? "default" : "outline"} onClick={() => setPurpose("research")}>Research</Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Wallet address to watch" value={pubkey} onChange={(e) => setPubkey(e.target.value)} />
            <Input placeholder="Nickname" value={label} onChange={(e) => setLabel(e.target.value)} className="sm:max-w-[160px]" />
            <Button onClick={addWallet} disabled={busy}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshList} disabled={busy}>Refresh</Button>
            <Button variant="outline" onClick={() => scan()} disabled={busy}>Scan all</Button>
          </div>
          <div className="space-y-2">
            {wallets.map((w) => {
              const kind: WalletPurpose = w.purpose === "mine" ? "mine" : "research";
              return (
                <div key={w.id} className={`flex items-center gap-2 p-2 rounded-md border ${selectedId === w.id ? "border-primary" : "border-border"}`}>
                  <button className="flex-1 text-left font-mono text-sm" onClick={() => loadWallet(w.id)}>
                    {shorten(w.pubkey)}{w.displayLabel ? <span className="ml-2 text-xs text-muted-foreground">{w.displayLabel}</span> : null}
                  </button>
                  <Button size="sm" variant={kind === "mine" ? "default" : "outline"} onClick={() => setWalletPurpose(w.id, kind === "mine" ? "research" : "mine")} disabled={busy}>{kind === "mine" ? "Mine" : "Research"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => scan(w.id)} disabled={busy}>Scan</Button>
                  <Button size="icon" variant="ghost" onClick={() => removeWallet(w.id)} disabled={busy}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Holdings, traffic, alerts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!selectedId ? <p className="text-sm text-muted-foreground">Select a watched wallet.</p> : (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2">Recent traffic</h3>
                <p className="text-xs text-muted-foreground mb-2">{trafficNote || (swaps.length ? `In ${swaps.filter((s) => s.direction === "buy").length} · Out ${swaps.filter((s) => s.direction === "sell").length}` : "No recent swaps.")}</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {swaps.slice(0, 16).map((s) => (
                    <button key={s.signature} className="w-full text-left p-2 rounded-md border text-xs font-mono flex gap-2" onClick={() => navigate(`/token/${s.tokenMint}`)}>
                      {s.direction === "buy" ? <ArrowDownRight className="h-3 w-3 text-green-500" /> : <ArrowUpRight className="h-3 w-3 text-red-500" />}
                      <span>{s.direction === "buy" ? "IN" : "OUT"}</span>
                      <span className="truncate">{shorten(s.tokenMint)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Positions</h3>
                {holdingsNote || holdings.length === 0 ? <p className="text-sm text-muted-foreground">{holdingsNote || "No fungible tokens found."}</p> : (
                  <>
                    <div className="space-y-2">{ranked.notable.map(renderHolding)}</div>
                    {ranked.dust.length > 0 && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={() => setShowDust((v) => !v)}>
                          {showDust ? "Hide" : "Show"} {ranked.dust.length} dust{ranked.baitCount ? ` · ${ranked.baitCount} bait` : ""}
                        </Button>
                        {showDust ? <div className="space-y-2 mt-2">{ranked.dust.map(renderHolding)}</div> : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
