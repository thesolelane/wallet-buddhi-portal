import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

interface RugCheckSummary {
  ok: boolean;
  reason?: string;
  score: number | null;
  riskLevel: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  lpLocked: boolean | null;
  lpLockedPct: number | null;
  topHoldersPct: number | null;
  risks: Array<{ name?: string; level?: string; description?: string }>;
}

export function RugCheckCard({ mint }: { mint: string }) {
  const { data, isLoading } = useQuery<RugCheckSummary>({
    queryKey: [`/api/token/${mint}/rugcheck`],
    enabled: Boolean(mint),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          RugCheck
          {data?.riskLevel && (
            <Badge variant={String(data.riskLevel).toLowerCase().includes("good") ? "secondary" : "destructive"}>
              {data.riskLevel}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <p className="text-muted-foreground">Checking mint risk…</p>}
        {data && !data.ok && (
          <p className="text-muted-foreground">Unavailable: {data.reason || "no report"}</p>
        )}
        {data?.ok && (
          <>
            <p>
              Score {data.score ?? "—"}
              {data.lpLocked != null && (
                <span className="text-muted-foreground">
                  {" "}· LP {data.lpLocked ? "locked" : "unlocked"}
                  {data.lpLockedPct != null ? ` (${data.lpLockedPct.toFixed(0)}%)` : ""}
                </span>
              )}
            </p>
            <p className="text-muted-foreground">
              Mint auth {data.mintAuthority ? "open" : "none"} · Freeze{" "}
              {data.freezeAuthority ? "open" : "none"}
              {data.topHoldersPct != null ? ` · Top holders ${data.topHoldersPct.toFixed(0)}%` : ""}
            </p>
            {data.risks.slice(0, 5).map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {r.level ? `${r.level}: ` : ""}
                {r.name || r.description}
              </p>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
