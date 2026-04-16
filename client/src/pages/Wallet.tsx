import { useParams } from "wouter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Activity, Copy, ExternalLink, Wallet as WalletIcon } from "lucide-react";

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

  const buyVolume = data?.swaps
    .filter((s) => s.direction === "buy" && s.quoteSymbol === "SOL")
    .reduce((sum, s) => sum + s.quoteAmount, 0) ?? 0;
  const sellVolume = data?.swaps
    .filter((s) => s.direction === "sell" && s.quoteSymbol === "SOL")
    .reduce((sum, s) => sum + s.quoteAmount, 0) ?? 0;
  const netSol = sellVolume - buyVolume;

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
