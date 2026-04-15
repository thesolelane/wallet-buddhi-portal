import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ExternalLink, Globe, MessageCircle, Users, Grid3x3 } from "lucide-react";
import { FaTwitter, FaTelegram, FaDiscord } from "react-icons/fa";

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
