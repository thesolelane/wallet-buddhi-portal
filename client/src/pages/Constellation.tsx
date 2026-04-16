import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

type WalletRole =
  | "dev"
  | "earlyCohort"
  | "topHolder"
  | "sniper"
  | "bump"
  | "copycatLeader"
  | "funder";

type EdgeType = "funding" | "copycat" | "sharedFunder";

interface ConstellationNode {
  wallet: string;
  primaryRole: WalletRole;
  roles: WalletRole[];
  cohortRank?: number;
  holderRank?: number;
  pctOfSupply?: number;
  isSniper?: boolean;
  sniperPriorityFeeSol?: number;
  sniperJitoTipSol?: number;
  bumpRoundTrips?: number;
  bumpFeesSol?: number;
  copycatFollowers?: number;
  funderFundedCount?: number;
  funderCopycatCount?: number;
  funderFlagged?: boolean;
}

interface ConstellationEdge {
  type: EdgeType;
  from: string;
  to: string;
}

interface ConstellationCluster {
  funder: string;
  members: string[];
  flagged: boolean;
}

interface ConstellationReport {
  ca: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  clusters: ConstellationCluster[];
  stats: {
    totalNodes: number;
    rolesCount: Record<WalletRole, number>;
    flaggedClusters: number;
  };
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

const ROLE_ORBITS: Record<WalletRole, { radius: number; label: string; color: string }> = {
  dev:           { radius: 80,  label: "Dev / Authority", color: "#a855f7" },
  earlyCohort:   { radius: 150, label: "First cohort",    color: "#14f195" },
  topHolder:     { radius: 220, label: "Top holders",     color: "#3b82f6" },
  sniper:        { radius: 290, label: "Snipers",         color: "#f97316" },
  bump:          { radius: 360, label: "Bump bots",       color: "#eab308" },
  copycatLeader: { radius: 430, label: "Copycat leaders", color: "#ef4444" },
  funder:        { radius: 500, label: "Funders",         color: "#94a3b8" },
};

const VIEWBOX_SIZE = 1120; // 500+60 padding on each side
const CENTER = VIEWBOX_SIZE / 2;

// Color a cluster by hashing the funder address so same cluster stays consistent
function clusterColor(funder: string): string {
  let h = 0;
  for (let i = 0; i < funder.length; i++) h = (h * 31 + funder.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function positionsOnOrbit(count: number, radius: number, angleOffset = 0) {
  const positions: Array<{ x: number; y: number; angle: number }> = [];
  for (let i = 0; i < count; i++) {
    const angle = angleOffset + (i / Math.max(count, 1)) * Math.PI * 2;
    positions.push({
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
      angle,
    });
  }
  return positions;
}

function shorten(addr: string, head = 4, tail = 4) {
  if (!addr || addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export default function Constellation() {
  const params = useParams<{ ca: string }>();
  const ca = params.ca;
  const [, navigate] = useLocation();
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ConstellationReport>({
    queryKey: [`/api/token/${ca}/constellation`],
    enabled: !!ca,
  });

  // Compute positions for every node
  const layout = useMemo(() => {
    if (!data?.ok) return null;

    const byRole = new Map<WalletRole, ConstellationNode[]>();
    for (const role of Object.keys(ROLE_ORBITS) as WalletRole[]) {
      byRole.set(role, []);
    }
    for (const n of data.nodes) {
      byRole.get(n.primaryRole)!.push(n);
    }

    const positions = new Map<string, { x: number; y: number; role: WalletRole }>();
    let angleOffset = 0;
    for (const role of Object.keys(ROLE_ORBITS) as WalletRole[]) {
      const list = byRole.get(role)!;
      if (list.length === 0) continue;
      const orbit = ROLE_ORBITS[role];
      const pts = positionsOnOrbit(list.length, orbit.radius, angleOffset);
      list.forEach((n, i) => {
        positions.set(n.wallet, { x: pts[i].x, y: pts[i].y, role });
      });
      angleOffset += Math.PI / 9; // stagger orbits so wallets don't line up radially
    }

    return { positions, byRole };
  }, [data]);

  const activeWallet = selectedWallet ?? hoveredWallet;
  const activeNode = data?.nodes.find((n) => n.wallet === activeWallet);

  // Determine which edges/clusters relate to the active wallet
  const highlightedEdges = useMemo(() => {
    if (!data || !activeWallet) return new Set<number>();
    const s = new Set<number>();
    data.edges.forEach((e, i) => {
      if (e.from === activeWallet || e.to === activeWallet) s.add(i);
    });
    return s;
  }, [data, activeWallet]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-start gap-3 mb-4">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/token/${ca}`)}>
            <ArrowLeft className="w-4 h-4" /> Back to token
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Wallet Constellation
              {data && (
                <span className="text-sm font-normal text-muted-foreground">
                  · {data.tokenName ?? shorten(ca ?? "")}{" "}
                  {data.tokenSymbol && `($${data.tokenSymbol})`}
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Radial view of every wallet connected to this token. Inner ring = closest to the token.
              Lines = funding or copycat relationships. Cluster tint = same funder.
            </p>
          </div>
        </div>

        {isLoading && <Skeleton className="h-[600px] w-full" />}
        {error && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Failed: {(error as Error).message}</p>
            </CardContent>
          </Card>
        )}
        {data && !data.ok && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Unable to build constellation: {data.reason}</p>
            </CardContent>
          </Card>
        )}

        {data?.ok && layout && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* SVG canvas */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <svg
                  viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
                  className="w-full h-auto bg-background"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedWallet(null);
                  }}
                >
                  {/* Orbit rings */}
                  {(Object.keys(ROLE_ORBITS) as WalletRole[]).map((role) => {
                    if ((layout.byRole.get(role) ?? []).length === 0) return null;
                    const orbit = ROLE_ORBITS[role];
                    return (
                      <g key={role}>
                        <circle
                          cx={CENTER}
                          cy={CENTER}
                          r={orbit.radius}
                          fill="none"
                          stroke="currentColor"
                          strokeOpacity="0.08"
                          strokeDasharray="2 6"
                        />
                        <text
                          x={CENTER + orbit.radius + 6}
                          y={CENTER}
                          fill={orbit.color}
                          fontSize="11"
                          opacity="0.55"
                          fontFamily="monospace"
                        >
                          {orbit.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Edges */}
                  {data.edges.map((edge, i) => {
                    const a = layout.positions.get(edge.from);
                    const b = layout.positions.get(edge.to);
                    if (!a || !b) return null;
                    const active = highlightedEdges.has(i);
                    let stroke = "currentColor";
                    let dash = "";
                    let opacity = active ? 0.75 : 0.18;
                    if (edge.type === "funding") stroke = "#94a3b8";
                    if (edge.type === "copycat") {
                      stroke = "#ef4444";
                      dash = "3 3";
                    }
                    if (edge.type === "sharedFunder") {
                      stroke = clusterColor(edge.from);
                      opacity = active ? 0.5 : 0.12;
                    }
                    return (
                      <line
                        key={i}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={stroke}
                        strokeWidth={active ? 1.8 : 1}
                        strokeOpacity={opacity}
                        strokeDasharray={dash}
                      />
                    );
                  })}

                  {/* Token center */}
                  <g>
                    <circle cx={CENTER} cy={CENTER} r="32" fill="hsl(var(--primary))" fillOpacity="0.15" stroke="hsl(var(--primary))" strokeWidth="2" />
                    <text
                      x={CENTER}
                      y={CENTER - 2}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {data.tokenSymbol ? `$${data.tokenSymbol}` : "TOKEN"}
                    </text>
                    <text
                      x={CENTER}
                      y={CENTER + 14}
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="9"
                      opacity="0.5"
                      fontFamily="monospace"
                    >
                      {shorten(data.ca, 4, 4)}
                    </text>
                  </g>

                  {/* Nodes */}
                  {data.nodes.map((n) => {
                    const pos = layout.positions.get(n.wallet);
                    if (!pos) return null;
                    const orbit = ROLE_ORBITS[n.primaryRole];
                    const r = n.roles.length > 1 ? 9 : 7;
                    const isActive = n.wallet === activeWallet;
                    const isFlagged = n.funderFlagged;
                    return (
                      <g
                        key={n.wallet}
                        onMouseEnter={() => setHoveredWallet(n.wallet)}
                        onMouseLeave={() => setHoveredWallet(null)}
                        onClick={() => {
                          if (selectedWallet === n.wallet) {
                            navigate(`/wallet/${n.wallet}`);
                          } else {
                            setSelectedWallet(n.wallet);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={r + (isActive ? 4 : 0)}
                          fill={orbit.color}
                          fillOpacity={isActive ? 1 : 0.8}
                          stroke={isFlagged ? "#ef4444" : "white"}
                          strokeOpacity={isActive ? 1 : 0.35}
                          strokeWidth={isFlagged ? 2.5 : 1}
                        />
                        {/* Extra role dots (miniature badges) */}
                        {n.roles.length > 1 &&
                          n.roles
                            .filter((role) => role !== n.primaryRole)
                            .slice(0, 3)
                            .map((role, idx) => (
                              <circle
                                key={role}
                                cx={pos.x + (idx - 1) * 4}
                                cy={pos.y + r + 4}
                                r="2"
                                fill={ROLE_ORBITS[role].color}
                              />
                            ))}
                      </g>
                    );
                  })}
                </svg>
              </CardContent>
            </Card>

            {/* Side panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {(Object.keys(ROLE_ORBITS) as WalletRole[]).map((r) => {
                    const o = ROLE_ORBITS[r];
                    const count = data.stats.rolesCount[r];
                    return (
                      <div key={r} className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: o.color }}
                        />
                        <span className="flex-1">{o.label}</span>
                        <span className="text-muted-foreground font-mono">{count}</span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                    <p>— Grey line: funding</p>
                    <p>— Red dashed: copycat</p>
                    <p>— Colored: shared-funder cluster</p>
                    <p>— Double dot = multi-role wallet</p>
                    <p>— Red ring = flagged funder</p>
                  </div>
                </CardContent>
              </Card>

              {/* Selection panel */}
              {activeNode && (
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                      Focus
                      {activeNode.funderFlagged && (
                        <Badge variant="destructive" className="text-[10px] uppercase">flagged</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="font-mono break-all">
                      <button
                        onClick={() => navigate(`/wallet/${activeNode.wallet}`)}
                        className="hover:text-primary text-left"
                      >
                        {activeNode.wallet}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeNode.roles.map((r) => (
                        <Badge
                          key={r}
                          variant="secondary"
                          style={{ background: `${ROLE_ORBITS[r].color}33`, color: ROLE_ORBITS[r].color }}
                        >
                          {ROLE_ORBITS[r].label}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      {activeNode.cohortRank !== undefined && (
                        <p>Cohort rank #{activeNode.cohortRank}</p>
                      )}
                      {activeNode.holderRank !== undefined && activeNode.pctOfSupply !== undefined && (
                        <p>
                          Holds #{activeNode.holderRank} · {activeNode.pctOfSupply.toFixed(2)}%
                        </p>
                      )}
                      {activeNode.isSniper && (
                        <p>
                          ⚡ Sniper · fee {activeNode.sniperPriorityFeeSol?.toFixed(4)} SOL
                          {(activeNode.sniperJitoTipSol ?? 0) > 0 &&
                            ` · tip ${activeNode.sniperJitoTipSol?.toFixed(4)}`}
                        </p>
                      )}
                      {activeNode.bumpRoundTrips && (
                        <p>
                          🤖 {activeNode.bumpRoundTrips} round trips · {activeNode.bumpFeesSol?.toFixed(3)} SOL in fees
                        </p>
                      )}
                      {activeNode.copycatFollowers && (
                        <p>Followed by {activeNode.copycatFollowers} copycat wallets</p>
                      )}
                      {activeNode.funderFundedCount !== undefined && (
                        <p>
                          Funder of {activeNode.funderFundedCount} wallets · {activeNode.funderCopycatCount} copycats
                        </p>
                      )}
                    </div>
                    <Button size="sm" className="w-full mt-2" onClick={() => navigate(`/wallet/${activeNode.wallet}`)}>
                      Open wallet page
                    </Button>
                  </CardContent>
                </Card>
              )}

              {data.clusters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs text-muted-foreground">
                      Clusters · {data.clusters.length} (flagged: {data.stats.flaggedClusters})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {data.clusters.slice(0, 6).map((c) => (
                      <div key={c.funder} className="p-2 rounded border border-border">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ background: clusterColor(c.funder) }}
                          />
                          <button
                            onClick={() => setSelectedWallet(c.funder)}
                            className="font-mono hover:text-primary truncate"
                          >
                            {shorten(c.funder, 4, 4)}
                          </button>
                          <span className="ml-auto text-muted-foreground">
                            {c.members.length} wallets
                          </span>
                          {c.flagged && (
                            <Badge variant="destructive" className="text-[9px] uppercase">
                              flagged
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
