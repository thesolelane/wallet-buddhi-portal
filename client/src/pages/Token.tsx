import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ExternalLink, Globe, MessageCircle } from "lucide-react";
import { FaTwitter, FaTelegram, FaDiscord } from "react-icons/fa";

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
    const divisor = BigInt(10) ** BigInt(d);
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
