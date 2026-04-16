// Wallet Constellation — aggregates all wallet signals for a token into a
// node/edge graph suitable for a radial visualization.
//
// Philosophy: reveal which wallets are connected (same funder, same leader,
// same cohort) and which wallets appear in multiple roles at once. No price
// data, no trajectory — just the STATE of the social graph around a token.

import { getTokenMetadata } from "./token-service";
import { getTopHolders } from "./holders-service";
import { getFirstBuyers, classifyCohort } from "./buyers-service";
import { detectBumpBots } from "./bump-detector";
import { analyzeCopycat } from "./copycat-detector";
import { getFunderOf, getFunderReport } from "./bad-actor-registry";

export type WalletRole =
  | "dev"
  | "earlyCohort"
  | "topHolder"
  | "sniper"
  | "bump"
  | "copycatLeader"
  | "funder";

export interface ConstellationNode {
  wallet: string;
  primaryRole: WalletRole; // innermost ring the wallet qualifies for
  roles: WalletRole[]; // every role the wallet fulfills
  // Role-specific metadata for tooltips/labels
  cohortRank?: number;
  holderRank?: number;
  pctOfSupply?: number;
  isSniper?: boolean;
  sniperPriorityFeeSol?: number;
  sniperJitoTipSol?: number;
  bumpRoundTrips?: number;
  bumpFeesSol?: number;
  copycatFollowers?: number; // how many wallets copy this one (as a leader)
  funderFundedCount?: number;
  funderCopycatCount?: number;
  funderFlagged?: boolean;
}

export type EdgeType = "funding" | "copycat" | "sharedFunder";

export interface ConstellationEdge {
  type: EdgeType;
  from: string; // for funding: funder address; for copycat: leader; for sharedFunder: funder of both
  to: string; // for funding: funded; for copycat: follower
  // For sharedFunder, we store the funder in from and one of the wallets in to
  // (edges emitted pairwise). Clients can draw arcs between all wallets that
  // share the same from.
}

export interface ConstellationCluster {
  // A group of wallets sharing the same funder, size >= 2 within our graph
  funder: string;
  members: string[];
  flagged: boolean;
}

export interface ConstellationReport {
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

// Innermost-first ordering for primary-role assignment
const ROLE_PRIORITY: WalletRole[] = [
  "dev",
  "earlyCohort",
  "topHolder",
  "sniper",
  "bump",
  "copycatLeader",
  "funder",
];

function pickPrimary(roles: Set<WalletRole>): WalletRole {
  for (const role of ROLE_PRIORITY) {
    if (roles.has(role)) return role;
  }
  return "funder";
}

const cache = new Map<string, { result: ConstellationReport; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getConstellation(ca: string): Promise<ConstellationReport> {
  const hit = cache.get(ca);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    // All these services already cache internally — calling them here is cheap
    // on repeat visits within TTL windows.
    const [meta, holders, buyersRaw, bump] = await Promise.all([
      getTokenMetadata(ca),
      getTopHolders(ca, 50),
      getFirstBuyers(ca, 200),
      detectBumpBots(ca),
    ]);

    const holderSet = new Set(holders.holders.map((h) => h.owner));
    const cohort = classifyCohort(buyersRaw.buyers, holderSet);

    // Build node map keyed by wallet
    const nodeMap = new Map<string, ConstellationNode>();
    const roleBuckets = new Map<string, Set<WalletRole>>();

    const ensureNode = (wallet: string): ConstellationNode => {
      let n = nodeMap.get(wallet);
      if (!n) {
        n = { wallet, primaryRole: "funder", roles: [] };
        nodeMap.set(wallet, n);
        roleBuckets.set(wallet, new Set());
      }
      return n;
    };
    const addRole = (wallet: string, role: WalletRole) => {
      ensureNode(wallet);
      roleBuckets.get(wallet)!.add(role);
    };

    // Dev / update authority
    if (meta.updateAuthority) {
      const n = ensureNode(meta.updateAuthority);
      addRole(meta.updateAuthority, "dev");
      const devHolder = holders.holders.find((h) => h.owner === meta.updateAuthority);
      if (devHolder) {
        n.holderRank = devHolder.rank;
        n.pctOfSupply = devHolder.pctOfSupply ?? undefined;
      }
    }

    // First cohort (rank <= 20)
    for (const b of cohort.slice(0, 20)) {
      const n = ensureNode(b.wallet);
      addRole(b.wallet, "earlyCohort");
      n.cohortRank = b.rank;
      if (b.isSniper) {
        addRole(b.wallet, "sniper");
        n.isSniper = true;
        n.sniperPriorityFeeSol = b.priorityFeeSol;
        n.sniperJitoTipSol = b.jitoTipSol;
      }
    }

    // Any remaining snipers (rank > 20 within first-100)
    for (const b of cohort) {
      if (!b.isSniper) continue;
      const n = ensureNode(b.wallet);
      addRole(b.wallet, "sniper");
      n.isSniper = true;
      n.sniperPriorityFeeSol = b.priorityFeeSol;
      n.sniperJitoTipSol = b.jitoTipSol;
      if (n.cohortRank === undefined) n.cohortRank = b.rank;
    }

    // Top holders (top 20)
    for (const h of holders.holders.slice(0, 20)) {
      const n = ensureNode(h.owner);
      addRole(h.owner, "topHolder");
      n.holderRank = h.rank;
      n.pctOfSupply = h.pctOfSupply ?? undefined;
    }

    // Bump bots
    for (const b of bump.suspectWallets.slice(0, 15)) {
      const n = ensureNode(b.wallet);
      addRole(b.wallet, "bump");
      n.bumpRoundTrips = Math.min(b.buys, b.sells);
      n.bumpFeesSol = b.totalFeesSol;
    }

    // Copycat leaders — for up to 8 of the most-central cohort wallets,
    // run copycat analysis to find who they were copying and who funded them.
    // We keep the fan-out small so the /constellation call stays responsive.
    const walletsToTraceForCopycat = Array.from(
      new Set([
        ...cohort.slice(0, 8).map((c) => c.wallet),
        ...bump.suspectWallets.slice(0, 4).map((w) => w.wallet),
      ]),
    );

    const edges: ConstellationEdge[] = [];
    const copycatFollowerCount = new Map<string, number>();
    const funderOfWallet = new Map<string, string>();

    await Promise.all(
      walletsToTraceForCopycat.map(async (w) => {
        try {
          const report = await analyzeCopycat(w);
          if (!report.ok) return;

          // Record leaders
          for (const l of report.leaders) {
            ensureNode(l.leader);
            addRole(l.leader, "copycatLeader");
            copycatFollowerCount.set(
              l.leader,
              (copycatFollowerCount.get(l.leader) ?? 0) + 1,
            );
            edges.push({ type: "copycat", from: l.leader, to: w });
          }

          // Record funder
          if (report.funder.funder) {
            funderOfWallet.set(w, report.funder.funder);
            if (!nodeMap.has(report.funder.funder)) {
              addRole(report.funder.funder, "funder");
            }
            edges.push({ type: "funding", from: report.funder.funder, to: w });
          }
        } catch {
          // per-wallet failure doesn't kill the whole report
        }
      }),
    );

    // Also pull funder info from the existing bad-actor registry for ANY wallet
    // in our graph — this reuses prior analyses without re-querying Helius.
    for (const wallet of Array.from(nodeMap.keys())) {
      const f = getFunderOf(wallet);
      if (f && !funderOfWallet.has(wallet)) {
        funderOfWallet.set(wallet, f);
        if (!nodeMap.has(f)) {
          addRole(f, "funder");
        }
        edges.push({ type: "funding", from: f, to: wallet });
      }
    }

    // Populate copycat follower count on nodes
    for (const [leader, count] of Array.from(copycatFollowerCount.entries())) {
      const n = nodeMap.get(leader);
      if (n) n.copycatFollowers = count;
    }

    // Populate funder stats from bad-actor registry
    for (const node of Array.from(nodeMap.values())) {
      if (roleBuckets.get(node.wallet)?.has("funder")) {
        const rep = getFunderReport(node.wallet);
        if (rep) {
          node.funderFundedCount = rep.fundedCount;
          node.funderCopycatCount = rep.copycatCount;
          node.funderFlagged = rep.flagged;
        }
      }
    }

    // Cluster detection: group wallets by their funder when ≥2 of them are in our graph
    const funderGroups = new Map<string, Set<string>>();
    for (const [wallet, funder] of Array.from(funderOfWallet.entries())) {
      if (!nodeMap.has(wallet)) continue;
      if (!funderGroups.has(funder)) funderGroups.set(funder, new Set());
      funderGroups.get(funder)!.add(wallet);
    }

    const clusters: ConstellationCluster[] = [];
    for (const [funder, members] of Array.from(funderGroups.entries())) {
      if (members.size < 2) continue;
      const membersArr = Array.from(members);
      clusters.push({
        funder,
        members: membersArr,
        flagged: nodeMap.get(funder)?.funderFlagged ?? false,
      });
      // Emit pairwise sharedFunder edges so the client can draw arcs
      for (let i = 0; i < membersArr.length; i++) {
        for (let j = i + 1; j < membersArr.length; j++) {
          edges.push({
            type: "sharedFunder",
            from: membersArr[i],
            to: membersArr[j],
          });
        }
      }
    }

    // Finalize nodes: primary role + role list
    const nodes: ConstellationNode[] = Array.from(nodeMap.values()).map((n) => {
      const roles = Array.from(roleBuckets.get(n.wallet)!);
      return { ...n, primaryRole: pickPrimary(new Set(roles)), roles };
    });

    const rolesCount: Record<WalletRole, number> = {
      dev: 0,
      earlyCohort: 0,
      topHolder: 0,
      sniper: 0,
      bump: 0,
      copycatLeader: 0,
      funder: 0,
    };
    for (const n of nodes) rolesCount[n.primaryRole] += 1;

    const result: ConstellationReport = {
      ca,
      tokenName: meta.name,
      tokenSymbol: meta.symbol,
      nodes,
      edges,
      clusters,
      stats: {
        totalNodes: nodes.length,
        rolesCount,
        flaggedClusters: clusters.filter((c) => c.flagged).length,
      },
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(ca, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (e) {
    return {
      ca,
      tokenName: null,
      tokenSymbol: null,
      nodes: [],
      edges: [],
      clusters: [],
      stats: {
        totalNodes: 0,
        rolesCount: {
          dev: 0,
          earlyCohort: 0,
          topHolder: 0,
          sniper: 0,
          bump: 0,
          copycatLeader: 0,
          funder: 0,
        },
        flaggedClusters: 0,
      },
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "constellation failed",
    };
  }
}
