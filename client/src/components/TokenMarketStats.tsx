import { Card, CardContent } from "@/components/ui/card";

export interface TokenPairStats {
  dex: string | null;
  quoteSymbol: string | null;
  priceUsd: number | null;
  volume24h: number | null;
  buys24h: number | null;
  sells24h: number | null;
  liquidityUsd: number | null;
  fdv: number | null;
  marketCap: number | null;
}

function fmtUsd(n: number | null) {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (Math.abs(n) >= 1) return `$${n.toFixed(4)}`;
  if (Math.abs(n) > 0) return `$${n.toPrecision(4)}`;
  return "$0";
}

function StateCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold font-mono mt-1">{value}</p>
        {sub ? <p className="text-xs text-muted-foreground mt-1">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export function TokenMarketStats({ pair }: { pair: TokenPairStats | null | undefined }) {
  const buys = pair?.buys24h;
  const sells = pair?.sells24h;
  const flow =
    buys != null && sells != null ? `${buys} buys / ${sells} sells` : undefined;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StateCard label="Price" value={fmtUsd(pair?.priceUsd ?? null)} />
      <StateCard label="24h Volume" value={fmtUsd(pair?.volume24h ?? null)} sub={flow} />
      <StateCard label="Market Cap" value={fmtUsd(pair?.marketCap ?? null)} />
      <StateCard label="FDV" value={fmtUsd(pair?.fdv ?? null)} />
      <StateCard label="Liquidity" value={fmtUsd(pair?.liquidityUsd ?? null)} />
      <StateCard
        label="DEX"
        value={pair?.dex ?? "—"}
        sub={pair?.quoteSymbol ? `vs ${pair.quoteSymbol}` : undefined}
      />
    </div>
  );
}
