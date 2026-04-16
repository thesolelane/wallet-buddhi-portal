import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, Zap, Bot, Target, TrendingUp, AlertTriangle, GitBranch } from "lucide-react";

interface SniperRow {
  wallet: string;
  tokensSniped: number;
  totalJitoTipSol: number;
  avgPriorityFeeSol: number;
  exitRate: number;
  lastSeen: number;
}
interface BumpRow {
  wallet: string;
  tokensBumped: number;
  totalFeesSol: number;
  totalRoundTrips: number;
  lastActive: number;
}
interface LeaderRow {
  leader: string;
  followers: number;
  sharedTokens: number;
  avgLagSec: number;
  lastSeen: number;
}
interface TraderRow {
  wallet: string;
  realizedSol: number;
  tokensTraded: number;
  winRate: number;
  lastSeen: number;
}
interface PairRow {
  walletA: string;
  walletB: string;
  score: number;
  sharedTokens: number;
  sharedCounterparties: number;
  directTransfers: number;
  lastSeen: number;
}
interface FunderRow {
  funder: string;
  fundedCount: number;
  copycatCount: number;
  funded: string[];
  flagged: boolean;
}
interface LeaderboardsResponse {
  counts: { snipers: number; bumps: number; leaders: number; traders: number; pairs: number };
  snipers: SniperRow[];
  bumps: BumpRow[];
  leaders: LeaderRow[];
  traders: TraderRow[];
  pairs: PairRow[];
  flaggedFunders: FunderRow[];
  fetchedAt: number;
}

type TabKey = "snipers" | "bumps" | "leaders" | "traders" | "pairs" | "funders";

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "snipers", label: "Repeat Snipers", icon: Zap },
  { key: "bumps", label: "Bump Operators", icon: Bot },
  { key: "leaders", label: "Copycat Leaders", icon: Target },
  { key: "funders", label: "Bad-Actor Funders", icon: AlertTriangle },
  { key: "traders", label: "Profitable Traders", icon: TrendingUp },
  { key: "pairs", label: "Persistent Pairs", icon: GitBranch },
];

function shorten(addr: string, head = 5, tail = 4) {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Leaderboards() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<TabKey>("snipers");
  const { data, isLoading, refetch, isFetching } = useQuery<LeaderboardsResponse>({
    queryKey: ["/api/leaderboards"],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex items-start gap-4">
          <Trophy className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Leaderboards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cross-token rankings from every analysis run in this session. Wallets appear after
              showing up on ≥2 tokens. Restart clears the data (persistence lands later).
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Tab strip */}
        <div className="flex flex-wrap gap-1 mb-4 border-b border-border">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm inline-flex items-center gap-1.5 border-b-2 -mb-px ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              {TABS.find((t) => t.key === tab)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-40 w-full" />}
            {data && tab === "snipers" && (
              <SniperTable rows={data.snipers} onOpen={(w) => navigate(`/wallet/${w}`)} />
            )}
            {data && tab === "bumps" && (
              <BumpTable rows={data.bumps} onOpen={(w) => navigate(`/wallet/${w}`)} />
            )}
            {data && tab === "leaders" && (
              <LeaderTable rows={data.leaders} onOpen={(w) => navigate(`/wallet/${w}`)} />
            )}
            {data && tab === "funders" && (
              <FunderTable rows={data.flaggedFunders} onOpen={(w) => navigate(`/wallet/${w}`)} />
            )}
            {data && tab === "traders" && (
              <TraderTable rows={data.traders} onOpen={(w) => navigate(`/wallet/${w}`)} />
            )}
            {data && tab === "pairs" && (
              <PairTable rows={data.pairs} onOpen={(w) => navigate(`/wallet/${w}`)} />
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-4">
      No {label} yet. Analyze some tokens and wallets to populate this board.
    </p>
  );
}

function SniperTable({ rows, onOpen }: { rows: SniperRow[]; onOpen: (w: string) => void }) {
  if (rows.length === 0) return <EmptyRow label="repeat snipers" />;
  return (
    <div className="space-y-1">
      <HeaderRow cols={["Wallet", "Tokens", "Jito tips (SOL)", "Avg fee", "Exit rate", "Last seen"]} />
      {rows.map((r) => (
        <div key={r.wallet} className="grid grid-cols-6 gap-2 items-center py-1 text-xs font-mono hover:bg-muted/30 rounded">
          <button onClick={() => onOpen(r.wallet)} className="text-left hover:text-primary truncate" title={r.wallet}>
            {shorten(r.wallet)}
          </button>
          <span>{r.tokensSniped}</span>
          <span>{r.totalJitoTipSol.toFixed(3)}</span>
          <span>{r.avgPriorityFeeSol.toFixed(4)}</span>
          <span className={r.exitRate > 0.5 ? "text-orange-500" : ""}>
            {(r.exitRate * 100).toFixed(0)}%
          </span>
          <span className="text-muted-foreground">{timeAgo(r.lastSeen)}</span>
        </div>
      ))}
    </div>
  );
}

function BumpTable({ rows, onOpen }: { rows: BumpRow[]; onOpen: (w: string) => void }) {
  if (rows.length === 0) return <EmptyRow label="bump operators" />;
  return (
    <div className="space-y-1">
      <HeaderRow cols={["Wallet", "Tokens", "Fees (SOL)", "Round trips", "", "Last active"]} />
      {rows.map((r) => (
        <div key={r.wallet} className="grid grid-cols-6 gap-2 items-center py-1 text-xs font-mono hover:bg-muted/30 rounded">
          <button onClick={() => onOpen(r.wallet)} className="text-left hover:text-primary truncate" title={r.wallet}>
            {shorten(r.wallet)}
          </button>
          <span>{r.tokensBumped}</span>
          <span className="text-orange-500">{r.totalFeesSol.toFixed(3)}</span>
          <span>{r.totalRoundTrips}</span>
          <span></span>
          <span className="text-muted-foreground">{timeAgo(r.lastActive)}</span>
        </div>
      ))}
    </div>
  );
}

function LeaderTable({ rows, onOpen }: { rows: LeaderRow[]; onOpen: (w: string) => void }) {
  if (rows.length === 0) return <EmptyRow label="copycat leaders" />;
  return (
    <div className="space-y-1">
      <HeaderRow cols={["Leader", "Followers", "Shared tokens", "Avg lag", "", "Last seen"]} />
      {rows.map((r) => (
        <div key={r.leader} className="grid grid-cols-6 gap-2 items-center py-1 text-xs font-mono hover:bg-muted/30 rounded">
          <button onClick={() => onOpen(r.leader)} className="text-left hover:text-primary truncate" title={r.leader}>
            {shorten(r.leader)}
          </button>
          <span>{r.followers}</span>
          <span>{r.sharedTokens}</span>
          <span>
            {r.avgLagSec < 60
              ? `${r.avgLagSec.toFixed(0)}s`
              : `${(r.avgLagSec / 60).toFixed(1)}m`}
          </span>
          <span></span>
          <span className="text-muted-foreground">{timeAgo(r.lastSeen)}</span>
        </div>
      ))}
    </div>
  );
}

function TraderTable({ rows, onOpen }: { rows: TraderRow[]; onOpen: (w: string) => void }) {
  if (rows.length === 0) return <EmptyRow label="trader snapshots" />;
  return (
    <div className="space-y-1">
      <HeaderRow cols={["Wallet", "Realized SOL", "Tokens", "Win rate", "", "Last seen"]} />
      {rows.map((r) => (
        <div key={r.wallet} className="grid grid-cols-6 gap-2 items-center py-1 text-xs font-mono hover:bg-muted/30 rounded">
          <button onClick={() => onOpen(r.wallet)} className="text-left hover:text-primary truncate" title={r.wallet}>
            {shorten(r.wallet)}
          </button>
          <span className={r.realizedSol > 0 ? "text-green-500" : r.realizedSol < 0 ? "text-destructive" : ""}>
            {r.realizedSol >= 0 ? "+" : ""}
            {r.realizedSol.toFixed(3)}
          </span>
          <span>{r.tokensTraded}</span>
          <span>{(r.winRate * 100).toFixed(0)}%</span>
          <span></span>
          <span className="text-muted-foreground">{timeAgo(r.lastSeen)}</span>
        </div>
      ))}
    </div>
  );
}

function PairTable({ rows, onOpen }: { rows: PairRow[]; onOpen: (w: string) => void }) {
  if (rows.length === 0) return <EmptyRow label="persistent pairs" />;
  return (
    <div className="space-y-1">
      <HeaderRow cols={["A ↔ B", "Score", "Shared tokens", "Direct xfers", "Shared cp", "Last seen"]} />
      {rows.map((r) => (
        <div key={`${r.walletA}|${r.walletB}`} className="grid grid-cols-6 gap-2 items-center py-1 text-xs font-mono hover:bg-muted/30 rounded">
          <span className="truncate">
            <button onClick={() => onOpen(r.walletA)} className="hover:text-primary">
              {shorten(r.walletA, 4, 3)}
            </button>
            <span className="text-muted-foreground mx-1">↔</span>
            <button onClick={() => onOpen(r.walletB)} className="hover:text-primary">
              {shorten(r.walletB, 4, 3)}
            </button>
          </span>
          <span className={r.directTransfers > 0 ? "text-red-600" : "text-amber-500"}>
            {r.score}
          </span>
          <span>{r.sharedTokens}</span>
          <span>{r.directTransfers}</span>
          <span>{r.sharedCounterparties}</span>
          <span className="text-muted-foreground">{timeAgo(r.lastSeen)}</span>
        </div>
      ))}
    </div>
  );
}

function FunderTable({ rows, onOpen }: { rows: FunderRow[]; onOpen: (w: string) => void }) {
  if (rows.length === 0) return <EmptyRow label="flagged funders" />;
  return (
    <div className="space-y-2">
      {rows.map((f) => (
        <div key={f.funder} className="p-3 rounded border border-destructive/30 bg-destructive/5 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="uppercase text-xs">flagged</Badge>
            <button onClick={() => onOpen(f.funder)} className="font-mono text-sm hover:text-primary" title={f.funder}>
              {shorten(f.funder, 8, 6)}
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              funded {f.fundedCount} · {f.copycatCount} copycats
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {f.funded.slice(0, 15).map((w) => (
              <button
                key={w}
                onClick={() => onOpen(w)}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-primary hover:text-primary"
                title={w}
              >
                {shorten(w, 4, 3)}
              </button>
            ))}
            {f.funded.length > 15 && (
              <span className="text-[10px] text-muted-foreground px-1">+{f.funded.length - 15}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeaderRow({ cols }: { cols: string[] }) {
  return (
    <div className="grid grid-cols-6 gap-2 text-xs font-mono text-muted-foreground pb-1 border-b border-border">
      {cols.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}
