import { useParams } from "wouter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Activity, Copy, ExternalLink, Wallet as WalletIcon, TrendingUp, Target, AlertTriangle, GitBranch, Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { addWalletToWatchlist, isWalletWatched, removeWalletFromWatchlist } from "@/lib/watchlist";

type SwapDirection = "buy" | "sell" | "unknown";

interface WalletSwap {
  signature: string;
  timestamp: number;
  source: string;
  direction: SwapDirection;
  tokenMint: string;
  tokenAmount: number;
  quoteMint: string;
  quoteSymbol: "SOL" | "USDC" | "USDT" | "other";
  quoteAmount: number;
  priorityFeeSol: number;
}

interface LeaderHit {
  leader: string;
  sharedTokens: number;
  avgLagSec: number;
  samples: Array<{ tokenMint: string; lagSec: number }>;
}

interface FunderTrace {
  funder: string | null;
  firstFundingSignature: string | null;
  firstFundingTs: number | null;
  knownAsCexDeposit: boolean;
  reason?: string;
}

interface CopycatReport {
  wallet: string;
  analyzedTokens: number;
  leaders: LeaderHit[];
  isCopycat: boolean;
  funder: FunderTrace;
  funderReport: {
    fundedCount: number;
    copycatCount: number;
    flagged: boolean;
  } | null;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

interface TokenPnlRow {
  tokenMint: string;
  buys: number;
  sells: number;
  solSpent: number;
  solReceived: number;
  tokenBought: number;
  tokenSold: number;
  firstSeen: number;
  lastSeen: number;
  realizedSol?: number;
}

interface WalletActivity {
  address: string;
  swaps: WalletSwap[];
  scannedTxs: number;
  buyCount: number;
  sellCount: number;
  uniqueTokens: number;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

function shorten(addr: string, head = 4, tail = 4) {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function copy(s: string) {
  navigator.clipboard?.writeText(s);
}

function relTime(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() / 1000 - ts)));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function Wallet() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<WalletActivity>({
    queryKey: [`/api/wallet/${address}/activity`],
    enabled: !!address,
  });

  const { data: copycat, isLoading: copycatLoading } = useQuery<CopycatReport>({
    queryKey: [`/api/wallet/${address}/copycat`],
    enabled: !!address,
  });

  const buyVolume = data?.swaps
    .filter((s) => s.direction === "buy" && s.quoteSymbol === "SOL")
    .reduce((sum, s) => sum + s.quoteAmount, 0) ?? 0;
  const sellVolume = data?.swaps
    .filter((s) => s.direction === "sell" && s.quoteSymbol === "SOL")
    .reduce((sum, s) => sum + s.quoteAmount, 0) ?? 0;
  const netSol = sellVolume - buyVolume;

  // Per-token PNL (SOL-quoted swaps only, since USDC/USDT would need price normalization)
  const tokenPnl = useMemo<TokenPnlRow[]>(() => {
    if (!data?.ok) return [];
    const map = new Map<string, TokenPnlRow>();
    for (const s of data.swaps) {
      if (s.quoteSymbol !== "SOL") continue;
      const row = map.get(s.tokenMint) ?? {
        tokenMint: s.tokenMint,
        buys: 0,
        sells: 0,
        solSpent: 0,
        solReceived: 0,
        tokenBought: 0,
        tokenSold: 0,
        firstSeen: s.timestamp,
        lastSeen: s.timestamp,
      };
      if (s.direction === "buy") {
        row.buys += 1;
        row.solSpent += s.quoteAmount;
        row.tokenBought += s.tokenAmount;
      } else if (s.direction === "sell") {
        row.sells += 1;
        row.solReceived += s.quoteAmount;
        row.tokenSold += s.tokenAmount;
      }
      row.firstSeen = Math.min(row.firstSeen, s.timestamp);
      row.lastSeen = Math.max(row.lastSeen, s.timestamp);
      map.set(s.tokenMint, row);
    }
    return Array.from(map.values())
      .map((r) => ({ ...r, realizedSol: r.solReceived - r.solSpent }))
      .sort((a, b) => Math.abs(b.realizedSol!) - Math.abs(a.realizedSol!));
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Wallet header */}
        <Card className="mb-4">
          <CardContent className="pt-6 flex items-center gap-4">
            <WalletIcon className="w-6 h-6 text-primary" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold">Wallet</h1>
              <button
                onClick={() => copy(address)}
                className="font-mono text-sm text-muted-foreground hover:text-foreground truncate block max-w-full"
              >
                {address} <Copy className="w-3 h-3 inline-block ml-1 opacity-50" />
              </button>
            </div>
            <WalletWatchToggle address={address} />
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Solscan <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>

        {isLoading && (
          <>
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-96 w-full" />
          </>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load activity: {(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {data && !data.ok && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Unable to scan wallet: {data.reason}</p>
            </CardContent>
          </Card>
        )}

        {data?.ok && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <SummaryCard label="Total Swaps" value={data.swaps.length.toString()} />
              <SummaryCard label="Unique Tokens" value={data.uniqueTokens.toString()} />
              <SummaryCard
                label="Buy / Sell"
                value={`${data.buyCount} / ${data.sellCount}`}
              />
              <SummaryCard
                label="Net SOL"
                value={`${netSol >= 0 ? "+" : ""}${netSol.toFixed(3)}`}
                tone={netSol > 0 ? "green" : netSol < 0 ? "red" : "neutral"}
              />
            </div>

            {/* Copycat report */}
            <CopycatCard
              report={copycat}
              loading={copycatLoading}
              onOpenWallet={(w) => navigate(`/wallet/${w}`)}
              onOpenToken={(t) => navigate(`/token/${t}`)}
            />

            {/* Per-token PNL */}
            {tokenPnl.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Per-Token Activity (SOL-quoted)
                    <span className="text-xs font-normal ml-auto">
                      from last ~{data.scannedTxs} txs · rough estimate
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="grid grid-cols-12 gap-2 text-muted-foreground pb-1 border-b border-border">
                      <div className="col-span-3">Token</div>
                      <div className="col-span-1 text-right">Buys</div>
                      <div className="col-span-1 text-right">Sells</div>
                      <div className="col-span-2 text-right">SOL in</div>
                      <div className="col-span-2 text-right">SOL out</div>
                      <div className="col-span-3 text-right">Realized Δ</div>
                    </div>
                    {tokenPnl.slice(0, 20).map((r) => (
                      <PnlRow key={r.tokenMint} r={r} onOpen={(ca) => navigate(`/token/${ca}`)} />
                    ))}
                    {tokenPnl.length > 20 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        …and {tokenPnl.length - 20} more tokens
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Swap list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Swaps
                  <span className="text-xs font-normal ml-auto">
                    scanned {data.scannedTxs} txs
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.swaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No swap activity found.</p>
                ) : (
                  <div className="space-y-1">
                    {data.swaps.map((s) => (
                      <SwapRow key={s.signature} s={s} onOpenToken={(ca) => navigate(`/token/${ca}`)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "neutral" }) {
  const toneClass =
    tone === "green" ? "text-green-500" : tone === "red" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold font-mono mt-1 ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function WalletWatchToggle({ address }: { address: string }) {
  const [watched, setWatched] = useState(false);
  useEffect(() => {
    setWatched(isWalletWatched(address));
    const refresh = () => setWatched(isWalletWatched(address));
    window.addEventListener("wbuddhi:watchlist-changed", refresh);
    return () => window.removeEventListener("wbuddhi:watchlist-changed", refresh);
  }, [address]);
  return (
    <Button
      size="sm"
      variant={watched ? "default" : "outline"}
      onClick={() => (watched ? removeWalletFromWatchlist(address) : addWalletToWatchlist(address))}
    >
      {watched ? (
        <>
          <EyeOff className="w-4 h-4" /> Unwatch
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" /> Watch
        </>
      )}
    </Button>
  );
}

function CopycatCard({
  report,
  loading,
  onOpenWallet,
  onOpenToken,
}: {
  report?: CopycatReport;
  loading: boolean;
  onOpenWallet: (w: string) => void;
  onOpenToken: (t: string) => void;
}) {
  const fmtLag = (sec: number) => {
    if (sec < 60) return `${sec.toFixed(0)}s`;
    if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
    return `${(sec / 3600).toFixed(1)}h`;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          Copycat & Source Trace
          {report?.ok && (
            <span className="ml-auto flex gap-2 text-xs font-normal">
              {report.isCopycat ? (
                <Badge variant="destructive" className="uppercase">Copycat</Badge>
              ) : (
                <Badge variant="secondary">Original</Badge>
              )}
              {report.funderReport?.flagged && (
                <Badge variant="destructive" className="uppercase">Bad-actor funder</Badge>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <Skeleton className="h-20 w-full" />}

        {report && !report.ok && (
          <p className="text-sm text-muted-foreground">
            Unable to analyze: {report.reason}
          </p>
        )}

        {report?.ok && (
          <>
            {/* Leaders */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> Leaders (wallets this wallet appears to copy)
              </h4>
              {report.leaders.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No consistent leader detected across the last {report.analyzedTokens} buys.
                </p>
              ) : (
                <div className="space-y-1">
                  {report.leaders.map((l) => (
                    <div key={l.leader} className="flex items-center gap-2 text-xs font-mono p-1.5 rounded hover:bg-muted/30">
                      <button
                        onClick={() => onOpenWallet(l.leader)}
                        className="w-28 text-left hover:text-primary truncate"
                        title={`Open leader wallet · ${l.leader}`}
                      >
                        {l.leader.slice(0, 4)}…{l.leader.slice(-4)}
                      </button>
                      <span className="text-muted-foreground">
                        copied on {l.sharedTokens} tokens
                      </span>
                      <span className="text-orange-500">
                        avg lag {fmtLag(l.avgLagSec)}
                      </span>
                      <div className="flex-1 flex flex-wrap gap-1 justify-end">
                        {l.samples.slice(0, 5).map((s, i) => (
                          <button
                            key={i}
                            onClick={() => onOpenToken(s.tokenMint)}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                            title={`Opened this token ${fmtLag(s.lagSec)} after leader`}
                          >
                            {s.tokenMint.slice(0, 3)}…{s.tokenMint.slice(-2)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Funder trace */}
            <div className="border-t border-border pt-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Funding Source (oldest incoming SOL transfer)
              </h4>
              {report.funder.funder ? (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenWallet(report.funder.funder!)}
                      className="font-mono hover:text-primary"
                      title={report.funder.funder}
                    >
                      {report.funder.funder.slice(0, 6)}…{report.funder.funder.slice(-4)}
                    </button>
                    {report.funder.knownAsCexDeposit && (
                      <Badge variant="outline" className="text-xs">CEX deposit — trace ends here</Badge>
                    )}
                    {report.funder.firstFundingSignature && (
                      <a
                        href={`https://solscan.io/tx/${report.funder.firstFundingSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {report.funderReport && (
                    <div className="text-muted-foreground">
                      Registered as funder of {report.funderReport.fundedCount} wallets
                      {" · "}
                      {report.funderReport.copycatCount} confirmed copycats
                      {report.funderReport.flagged && (
                        <span className="text-destructive font-semibold"> · FLAGGED</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {report.funder.reason ?? "No funding source detected in recent history"}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PnlRow({
  r,
  onOpen,
}: {
  r: TokenPnlRow;
  onOpen: (ca: string) => void;
}) {
  const realized = r.realizedSol ?? 0;
  const tone = realized > 0.001 ? "text-green-500" : realized < -0.001 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-0.5 hover:bg-muted/30 rounded-sm">
      <button
        onClick={() => onOpen(r.tokenMint)}
        className="col-span-3 text-left truncate hover:text-primary"
        title={`Open token · ${r.tokenMint}`}
      >
        {r.tokenMint.slice(0, 4)}…{r.tokenMint.slice(-4)}
      </button>
      <div className="col-span-1 text-right">{r.buys}</div>
      <div className="col-span-1 text-right">{r.sells}</div>
      <div className="col-span-2 text-right">{r.solSpent.toFixed(3)}</div>
      <div className="col-span-2 text-right">{r.solReceived.toFixed(3)}</div>
      <div className={`col-span-3 text-right ${tone}`}>
        {realized >= 0 ? "+" : ""}
        {realized.toFixed(3)} SOL
      </div>
    </div>
  );
}

function SwapRow({ s, onOpenToken }: { s: WalletSwap; onOpenToken: (ca: string) => void }) {
  const isBuy = s.direction === "buy";
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-sm">
      {isBuy ? (
        <ArrowDownRight className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <ArrowUpRight className="w-4 h-4 text-destructive shrink-0" />
      )}
      <Badge variant={isBuy ? "default" : "secondary"} className="uppercase text-xs">
        {s.direction}
      </Badge>
      <button
        onClick={() => onOpenToken(s.tokenMint)}
        className="font-mono text-xs hover:text-primary truncate max-w-[140px]"
        title={`Open token page · ${s.tokenMint}`}
      >
        {shorten(s.tokenMint, 4, 4)}
      </button>
      <span className="flex-1 text-xs text-muted-foreground truncate">
        {s.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
        {s.quoteAmount > 0 && (
          <>
            {" "}@ {s.quoteAmount.toFixed(s.quoteSymbol === "SOL" ? 3 : 2)} {s.quoteSymbol}
          </>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{s.source}</span>
      <span className="text-xs text-muted-foreground w-16 text-right">{relTime(s.timestamp)}</span>
      <a
        href={`https://solscan.io/tx/${s.signature}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground"
        title="View tx on Solscan"
      >
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
