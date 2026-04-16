import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BadActorReport {
  funder: string;
  fundedCount: number;
  copycatCount: number;
  funded: string[];
  flagged: boolean;
}

interface BadActorsResponse {
  totalFunders: number;
  totalCopycats: number;
  flaggedFunders: number;
  flagThreshold: number;
  flagged: BadActorReport[];
}

export default function BadActors() {
  const [, navigate] = useLocation();
  const { data, isLoading, refetch, isFetching } = useQuery<BadActorsResponse>({
    queryKey: ["/api/bad-actors"],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6 flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-destructive shrink-0 mt-1" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Bad Actor Registry</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wallets that have funded {data?.flagThreshold ?? 3}+ confirmed copycats. Populated
              as users analyze wallets across the portal. Session-scoped — resets on server restart.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Funders tracked" value={data?.totalFunders ?? 0} />
          <StatCard label="Copycats flagged" value={data?.totalCopycats ?? 0} />
          <StatCard label="Bad-actor funders" value={data?.flaggedFunders ?? 0} tone="red" />
          <StatCard label="Flag threshold" value={`≥${data?.flagThreshold ?? 3}`} />
        </div>

        {/* Flagged list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flagged Funders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-40 w-full" />}
            {data && data.flagged.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No flagged funders yet. They appear automatically as wallets are analyzed and copycats identified.
              </p>
            )}
            {data && data.flagged.length > 0 && (
              <div className="space-y-4">
                {data.flagged.map((f) => (
                  <div
                    key={f.funder}
                    className="p-3 rounded-md border border-destructive/30 bg-destructive/5 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="uppercase text-xs">flagged</Badge>
                      <button
                        onClick={() => navigate(`/wallet/${f.funder}`)}
                        className="font-mono text-sm hover:text-primary"
                        title={f.funder}
                      >
                        {f.funder.slice(0, 8)}…{f.funder.slice(-6)}
                      </button>
                      <span className="ml-auto text-xs text-muted-foreground">
                        funded {f.fundedCount} · {f.copycatCount} copycats
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {f.funded.slice(0, 20).map((w) => (
                        <button
                          key={w}
                          onClick={() => navigate(`/wallet/${w}`)}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-primary hover:text-primary"
                          title={w}
                        >
                          {w.slice(0, 4)}…{w.slice(-3)}
                        </button>
                      ))}
                      {f.funded.length > 20 && (
                        <span className="text-[10px] text-muted-foreground px-1">
                          +{f.funded.length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "red" }) {
  const toneClass = tone === "red" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold font-mono mt-1 ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
