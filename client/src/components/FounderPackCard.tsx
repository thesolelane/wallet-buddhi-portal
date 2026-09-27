import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Pack = {
  flags: string[];
  authorities: { mintRenounced: boolean; freezeRenounced: boolean };
  holders: { top10Pct: number };
  liquidity: {
    liquidityUsd: number | null;
    marketCapUsd: number | null;
    liqToMcap: number | null;
    lpLocked: boolean | null;
    lpLockedPct: number | null;
  };
  rugcheck: { ok: boolean; score: number | null; riskLevel: string | null; reason?: string };
  ok: boolean;
};

function money(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function FounderPackCard({ ca }: { ca: string }) {
  const { data, isLoading, error } = useQuery<Pack>({
    queryKey: [`/api/token/${ca}/founder-pack`],
    enabled: !!ca,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Founder pack</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <p className="text-muted-foreground">Loading founder signals…</p>}
        {error && <p className="text-destructive">Could not load founder pack.</p>}
        {data && (
          <>
            <p className="text-xs text-muted-foreground">
              Mint {data.authorities.mintRenounced ? "renounced" : "LIVE"} · Freeze{" "}
              {data.authorities.freezeRenounced ? "renounced" : "LIVE"} · Top10 {data.holders.top10Pct.toFixed(1)}%
              {data.liquidity.liqToMcap != null ? ` · Liq/MC ${(data.liquidity.liqToMcap * 100).toFixed(1)}%` : ""}
              {data.liquidity.lpLocked == null ? "" : data.liquidity.lpLocked ? " · LP locked" : " · LP unlocked"}
            </p>
            <p className="text-xs text-muted-foreground">
              Liq {money(data.liquidity.liquidityUsd)} · MC {money(data.liquidity.marketCapUsd)}
              {data.rugcheck.ok && data.rugcheck.score != null ? ` · RugCheck ${data.rugcheck.score}` : ""}
              {data.rugcheck.riskLevel ? ` ${data.rugcheck.riskLevel}` : ""}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {data.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
