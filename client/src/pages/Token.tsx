import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ExternalLink, Globe, MessageCircle, Users, Grid3x3, Bot, Activity, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FaTwitter, FaTelegram, FaDiscord } from "react-icons/fa";

interface BumpWallet {
  wallet: string;
  buys: number;
  sells: number;
  firstSeen: number;
  lastSeen: number;
  medianBuySol: number;
  medianSellSol: number;
  totalFeesSol: number;
  balanceRatio: number;
}

interface BumpReport {
  ca: string;
  scannedTxs: number;
  suspectWallets: BumpWallet[];
  totalFeesBurnedSol: number;
  activeLast24h: boolean;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

interface CohortBuyer {
  rank: number;
  wallet: string;
  signature: string;
  timestamp: number;
  quoteMint: string;
  quoteSymbol: "SOL" | "USDC" | "USDT" | "other";
  quoteAmount: number;
  tokenAmount: number;
  source: string;
  priorityFeeSol: number;
  jitoTipSol: number;
  isSniper: boolean;
  state: "holding" | "exited";
}

interface BuyersResult {
  ca: string;
  buyers: CohortBuyer[];
  scannedTxs: number;
  hitLimit: boolean;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
  stats?: {
    total: number;
    stillHolding: number;
    exited: number;
    snipers: number;
    snipersHolding: number;
    totalJitoTipSol: number;
  };
}

interface Holder {
  rank: number;
  owner: string;
  amount: string;
  uiAmount: number;
  pctOfSupply: number | null;
}

interface HoldersResult {
  ca: string;
  decimals: number | null;
  supply: string | null;
  totalAccountsScanned: number;
  holders: Holder[];
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

interface TokenMetadata {
  ca: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  supply: string | null;
  image: string | null;
  description: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  mintAuthorityRenounced: boolean;
  freezeAuthorityRenounced: boolean;
  updateAuthority: string | null;
  creators: Array<{ address: string; share: number; verified: boolean }>;
  socials: {
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
  };
  pair: {
    dex: string | null;
    pairAddress: string | null;
    quoteSymbol: string | null;
    liquidityUsd: number | null;
    fdv: number | null;
    marketCap: number | null;
    pairCreatedAt: number | null;
  } | null;
  fetchedAt: number;
  source: { helius: boolean; dexscreener: boolean };
}

function shorten(addr: string | null, head = 4, tail = 4) {
  if (!addr) return "—";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function fmtUsd(n: number | null) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtSupply(s: string | null, decimals: number | null) {
  if (!s) return "—";
  const d = decimals ?? 0;
  try {
    const n = BigInt(s);
    let divisor = BigInt(1);
    for (let i = 0; i < d; i++) divisor *= BigInt(10);
    const whole = n / divisor;
    return whole.toLocaleString();
  } catch {
    return s;
  }
}

function fmtAge(ms: number | null) {
  if (!ms) return "—";
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

function copy(s: string) {
  navigator.clipboard?.writeText(s);
}

export default function Token() {
  const params = useParams<{ ca: string }>();
  const ca = params.ca;

  const { data, isLoading, error } = useQuery<TokenMetadata>({
    queryKey: [`/api/token/${ca}`],
    enabled: !!ca,
  });

  const { data: holders, isLoading: holdersLoading } = useQuery<HoldersResult>({
    queryKey: [`/api/token/${ca}/holders`],
    enabled: !!ca,
  });

  const { data: buyers, isLoading: buyersLoading } = useQuery<BuyersResult>({
    queryKey: [`/api/token/${ca}/buyers`],
    enabled: !!ca,
  });

  const { data: bump, isLoading: bumpLoading } = useQuery<BumpReport>({
    queryKey: [`/api/token/${ca}/bump-report`],
    enabled: !!ca,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load token: {(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {data && (
          <div className="space-y-4">
            {/* Header card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {data.image && (
                    <img
                      src={data.image}
                      alt={data.symbol ?? "token"}
                      className="w-16 h-16 rounded-full object-cover bg-muted"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold">{data.name ?? "Unknown"}</h1>
                      {data.symbol && (
                        <Badge variant="secondary" className="font-mono">
                          ${data.symbol}
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => copy(data.ca)}
                      className="text-sm font-mono text-muted-foreground hover:text-foreground mt-1"
                      title="Copy contract address"
                    >
                      {shorten(data.ca, 8, 8)}
                    </button>
                    {data.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {data.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health pills — synthesize all signals at the top */}
            <HealthPills data={data} holders={holders} buyers={buyers} bump={bump} />

            {/* AI Analyst */}
            <AnalystCard ca={data.ca} />

            {/* State cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Authority status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Authority Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AuthorityRow
                    label="Mint authority"
                    renounced={data.mintAuthorityRenounced}
                    holder={data.mintAuthority}
                  />
                  <AuthorityRow
                    label="Freeze authority"
                    renounced={data.freezeAuthorityRenounced}
                    holder={data.freezeAuthority}
                  />
                  {data.updateAuthority && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">Update authority</span>
                      <button
                        onClick={() => copy(data.updateAuthority!)}
                        className="font-mono text-xs hover:text-foreground"
                        title={`Likely deployer\n${data.updateAuthority}\nClick to copy`}
                      >
                        {shorten(data.updateAuthority)} 👤
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supply */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Supply
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-mono">
                    {fmtSupply(data.supply, data.decimals)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Decimals: {data.decimals ?? "—"}
                  </p>
                </CardContent>
              </Card>

              {/* Age */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pair Age
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{fmtAge(data.pair?.pairCreatedAt ?? null)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.pair?.pairCreatedAt
                      ? new Date(data.pair.pairCreatedAt).toLocaleDateString()
                      : "No pair found"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Market state — figures only, no chart */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StateCard label="Market Cap" value={fmtUsd(data.pair?.marketCap ?? null)} />
              <StateCard label="FDV" value={fmtUsd(data.pair?.fdv ?? null)} />
              <StateCard label="Liquidity" value={fmtUsd(data.pair?.liquidityUsd ?? null)} />
              <StateCard
                label="DEX"
                value={data.pair?.dex ?? "—"}
                sub={data.pair?.quoteSymbol ? `vs ${data.pair.quoteSymbol}` : undefined}
              />
            </div>

            {/* First-200 Buyer Cohort */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  First {buyers?.buyers?.length ?? 200} Buyers
                  {buyers?.ok && buyers.stats && (
                    <span className="text-xs font-normal ml-auto flex gap-3">
                      <span className="text-green-500">
                        {buyers.stats.stillHolding} holding
                      </span>
                      <span className="text-muted-foreground">
                        {buyers.stats.exited} exited
                      </span>
                      {buyers.stats.snipers > 0 && (
                        <span className="text-orange-500" title="Used Jito tip or heavy priority fee in first 100">
                          ⚡ {buyers.stats.snipers} snipers
                        </span>
                      )}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {buyersLoading && (
                  <div>
                    <Skeleton className="h-40 w-full" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Scanning tx history — first load may take 30–60s…
                    </p>
                  </div>
                )}
                {buyers && !buyers.ok && (
                  <p className="text-sm text-muted-foreground">
                    Unable to load cohort: {buyers.reason}
                  </p>
                )}
                {buyers?.ok && buyers.buyers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No swap txs found in recent history.
                  </p>
                )}
                {buyers?.ok && buyers.buyers.length > 0 && (
                  <>
                    <CohortGrid buyers={buyers.buyers} />
                    <p className="text-xs text-muted-foreground mt-3">
                      Green = still holding · Gray = exited · Orange ring = sniper
                      {" (Jito-tipped or high priority fee in first 100)"}
                      {buyers.stats && buyers.stats.totalJitoTipSol > 0 && (
                        <>
                          {" · "}Cohort paid {buyers.stats.totalJitoTipSol.toFixed(3)} SOL in Jito tips
                        </>
                      )}
                      {" · "}Scanned {buyers.scannedTxs} txs
                      {buyers.hitLimit && " (hit page cap — may be incomplete)"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bump-bot report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Bump-Bot Detector
                  {bump?.ok && (
                    <span className="text-xs font-normal ml-auto flex gap-3">
                      <span className={bump.suspectWallets.length > 0 ? "text-orange-500" : "text-green-500"}>
                        {bump.suspectWallets.length} suspect wallets
                      </span>
                      {bump.totalFeesBurnedSol > 0 && (
                        <span className="text-muted-foreground">
                          {bump.totalFeesBurnedSol.toFixed(3)} SOL burned on fees
                        </span>
                      )}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bumpLoading && <Skeleton className="h-20 w-full" />}
                {bump && !bump.ok && (
                  <p className="text-sm text-muted-foreground">
                    Unable to analyze: {bump.reason}
                  </p>
                )}
                {bump?.ok && bump.suspectWallets.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No bump-bot patterns detected in the scanned history. Volume appears organic.
                  </p>
                )}
                {bump?.ok && bump.suspectWallets.length > 0 && (
                  <div className="space-y-1.5">
                    {bump.suspectWallets.slice(0, 10).map((w) => (
                      <BumpRow key={w.wallet} w={w} />
                    ))}
                    {bump.suspectWallets.length > 10 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        …and {bump.suspectWallets.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Holders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Top 50 Holders
                  {holders?.ok && (
                    <span className="text-xs font-normal ml-auto">
                      {holders.totalAccountsScanned} total accounts
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {holdersLoading && <Skeleton className="h-60 w-full" />}
                {holders && !holders.ok && (
                  <p className="text-sm text-muted-foreground">
                    Unable to load holders: {holders.reason}
                  </p>
                )}
                {holders?.ok && holders.holders.length === 0 && (
                  <p className="text-sm text-muted-foreground">No holders found.</p>
                )}
                {holders?.ok && holders.holders.length > 0 && (
                  <div className="space-y-1">
                    {holders.holders.map((h) => (
                      <HolderRow key={h.owner} h={h} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Socials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Socials
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <SocialLink href={data.socials.website} icon={<Globe className="w-4 h-4" />} label="Website" />
                <SocialLink href={data.socials.twitter} icon={<FaTwitter className="w-4 h-4" />} label="Twitter" />
                <SocialLink
                  href={data.socials.telegram}
                  icon={<FaTelegram className="w-4 h-4" />}
                  label="Telegram"
                />
                <SocialLink href={data.socials.discord} icon={<FaDiscord className="w-4 h-4" />} label="Discord" />
                {!data.socials.website &&
                  !data.socials.twitter &&
                  !data.socials.telegram &&
                  !data.socials.discord && (
                    <p className="text-sm text-muted-foreground">No socials reported.</p>
                  )}
              </CardContent>
            </Card>

            {/* Source / freshness */}
            <p className="text-xs text-muted-foreground text-right">
              Sources:{" "}
              <span className={data.source.helius ? "text-foreground" : ""}>Helius</span>
              {" · "}
              <span className={data.source.dexscreener ? "text-foreground" : ""}>DexScreener</span>
              {" · fetched "}
              {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function CohortGrid({ buyers }: { buyers: CohortBuyer[] }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
      {buyers.map((b) => {
        const tone =
          b.state === "holding"
            ? "bg-green-500/70 hover:bg-green-500"
            : "bg-muted-foreground/30 hover:bg-muted-foreground/60";
        const sniperRing = b.isSniper ? "ring-2 ring-orange-500" : "";
        const qty =
          b.quoteAmount > 0
            ? `${b.quoteAmount.toFixed(b.quoteSymbol === "SOL" ? 3 : 2)} ${b.quoteSymbol}`
            : "—";
        const sniperLine = b.isSniper
          ? `\n⚡ SNIPER — priority fee ${b.priorityFeeSol.toFixed(4)} SOL${
              b.jitoTipSol > 0 ? `, Jito tip ${b.jitoTipSol.toFixed(4)} SOL` : ""
            }`
          : "";
        const title = `#${b.rank} ${b.wallet.slice(0, 4)}…${b.wallet.slice(-4)}\nBought: ${qty}\nSource: ${b.source}\n${b.state}${sniperLine}`;
        return (
          <button
            key={b.wallet + b.signature}
            title={title}
            onClick={() => copy(b.wallet)}
            className={`aspect-square rounded-sm ${tone} ${sniperRing} transition-colors`}
            aria-label={title}
          />
        );
      })}
    </div>
  );
}

function AnalystCard({ ca }: { ca: string }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [model, setModel] = useState("llama3.1:8b");
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setVerdict(null);
    try {
      const res = await fetch(`/api/token/${ca}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const body = await res.json();
      if (!body.ok) {
        setErr(body.reason || body.error || "Analyst failed");
        return;
      }
      setVerdict(body.verdict);
      setLatency(body.latencyMs);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          AI Analyst (local Ollama)
          <span className="text-xs font-normal ml-auto">
            {latency !== null && `${latency} ms`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="flex-1 bg-transparent border border-border rounded-md px-2 py-1 text-xs font-mono"
            placeholder="model (e.g. llama3.1:8b)"
          />
          <Button onClick={run} disabled={busy} size="sm">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Analyze
          </Button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        {verdict && (
          <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/30 rounded-md p-3 border border-border">
            {verdict}
          </pre>
        )}
        {!verdict && !err && !busy && (
          <p className="text-xs text-muted-foreground">
            Sends the structured signals above to your local Ollama instance and returns a plain-English
            verdict. No cloud calls. Configure <code>OLLAMA_HOST</code> in <code>.env</code>.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HealthPills({
  data,
  holders,
  buyers,
  bump,
}: {
  data: TokenMetadata;
  holders?: HoldersResult;
  buyers?: BuyersResult;
  bump?: BumpReport;
}) {
  const pills: Array<{ tone: "green" | "yellow" | "red" | "gray"; text: string; title?: string }> = [];

  // Authority
  if (data.mintAuthorityRenounced && data.freezeAuthorityRenounced) {
    pills.push({ tone: "green", text: "✓ Authorities renounced" });
  } else if (data.mintAuthorityRenounced || data.freezeAuthorityRenounced) {
    pills.push({
      tone: "yellow",
      text: `⚠ ${!data.mintAuthorityRenounced ? "Mint" : "Freeze"} authority live`,
    });
  } else {
    pills.push({ tone: "red", text: "✗ Both authorities live — mint/freeze risk" });
  }

  // Dev wallet still holding
  if (data.updateAuthority && holders?.ok) {
    const devHolder = holders.holders.find((h) => h.owner === data.updateAuthority);
    if (devHolder && (devHolder.pctOfSupply ?? 0) > 5) {
      pills.push({
        tone: "red",
        text: `⚠ Dev holds ${devHolder.pctOfSupply!.toFixed(1)}% of supply`,
        title: `Update authority ${data.updateAuthority} still in top holders`,
      });
    } else if (devHolder) {
      pills.push({
        tone: "yellow",
        text: `Dev still holds ${(devHolder.pctOfSupply ?? 0).toFixed(2)}%`,
      });
    } else {
      pills.push({ tone: "green", text: "Dev wallet exited top holders" });
    }
  }

  // Top-holder concentration
  if (holders?.ok) {
    const top10Pct = holders.holders.slice(0, 10).reduce((s, h) => s + (h.pctOfSupply ?? 0), 0);
    if (top10Pct > 50) {
      pills.push({ tone: "red", text: `⚠ Top 10 hold ${top10Pct.toFixed(0)}% — concentrated` });
    } else if (top10Pct > 30) {
      pills.push({ tone: "yellow", text: `Top 10 hold ${top10Pct.toFixed(0)}%` });
    } else {
      pills.push({ tone: "green", text: `Top 10 hold ${top10Pct.toFixed(0)}% — distributed` });
    }
  }

  // Cohort hold rate (first 200)
  if (buyers?.ok && buyers.stats && buyers.stats.total > 0) {
    const holdPct = (buyers.stats.stillHolding / buyers.stats.total) * 100;
    if (holdPct >= 40) {
      pills.push({ tone: "green", text: `${holdPct.toFixed(0)}% of early buyers holding` });
    } else if (holdPct >= 15) {
      pills.push({ tone: "yellow", text: `${holdPct.toFixed(0)}% of early buyers holding` });
    } else {
      pills.push({ tone: "red", text: `Only ${holdPct.toFixed(0)}% of early buyers left` });
    }
  }

  // Snipers
  if (buyers?.ok && buyers.stats) {
    const s = buyers.stats.snipers;
    if (s === 0) {
      pills.push({ tone: "green", text: "No sniper activity" });
    } else if (s < 10) {
      pills.push({ tone: "yellow", text: `⚡ ${s} snipers in first 100` });
    } else {
      pills.push({ tone: "red", text: `⚡ ${s} snipers in first 100 — heavy` });
    }
  }

  // Bump bots
  if (bump?.ok) {
    const n = bump.suspectWallets.length;
    if (n === 0) {
      pills.push({ tone: "green", text: "Volume looks organic" });
    } else if (n < 3) {
      pills.push({ tone: "yellow", text: `🤖 ${n} bump-bot wallets` });
    } else {
      pills.push({
        tone: "red",
        text: `🤖 ${n} bump bots — ${bump.totalFeesBurnedSol.toFixed(2)} SOL burned`,
      });
    }
  }

  const toneClasses: Record<typeof pills[number]["tone"], string> = {
    green: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
    yellow: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
    red: "bg-destructive/10 text-destructive border-destructive/30",
    gray: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Health Signals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {pills.map((p, i) => (
            <span
              key={i}
              title={p.title}
              className={`text-xs px-2.5 py-1 rounded-full border ${toneClasses[p.tone]}`}
            >
              {p.text}
            </span>
          ))}
          {pills.length === 0 && (
            <span className="text-xs text-muted-foreground">Loading signals…</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BumpRow({ w }: { w: BumpWallet }) {
  const roundTrips = Math.min(w.buys, w.sells);
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <button
        onClick={() => copy(w.wallet)}
        className="w-28 text-left hover:text-foreground truncate"
        title={w.wallet}
      >
        {shorten(w.wallet, 4, 4)}
      </button>
      <span className="flex-1 text-muted-foreground">
        {w.buys} buys · {w.sells} sells ({roundTrips} round trips)
      </span>
      <span className="w-24 text-right text-muted-foreground">
        med {w.medianBuySol.toFixed(3)} SOL
      </span>
      <span className="w-20 text-right text-orange-500">
        {w.totalFeesSol.toFixed(4)} SOL fees
      </span>
    </div>
  );
}

function HolderRow({ h }: { h: Holder }) {
  const pct = h.pctOfSupply ?? 0;
  const barWidth = Math.min(100, pct);
  // Color intensity: >5% concerning (whale), 1-5% notable, <1% normal
  const barColor =
    pct >= 5 ? "bg-destructive/70" : pct >= 1 ? "bg-orange-500/70" : "bg-primary/60";
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="w-8 text-muted-foreground text-right">#{h.rank}</span>
      <button
        onClick={() => copy(h.owner)}
        className="w-28 text-left hover:text-foreground truncate"
        title={h.owner}
      >
        {shorten(h.owner, 4, 4)}
      </button>
      <div className="flex-1 h-5 bg-muted rounded-sm relative overflow-hidden">
        <div
          className={`absolute left-0 top-0 bottom-0 ${barColor} rounded-sm`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className="w-16 text-right">
        {h.pctOfSupply !== null ? `${h.pctOfSupply.toFixed(2)}%` : "—"}
      </span>
    </div>
  );
}

function StateCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold font-mono mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AuthorityRow({
  label,
  renounced,
  holder,
}: {
  label: string;
  renounced: boolean;
  holder: string | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        {renounced ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-500">Renounced</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="font-mono text-xs">{shorten(holder)}</span>
          </>
        )}
      </span>
    </div>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm"
    >
      {icon}
      {label}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  );
}
