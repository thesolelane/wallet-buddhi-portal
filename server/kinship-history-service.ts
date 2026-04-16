// Kinship History — second layer for the Kinship graph.
//
// After the initial per-token graph is built, rescan the wallets in it for
// EARLIER relationships across the last 90 days. We look for ANY kind of
// connection between wallet pairs, not just shared-token overlap:
//
//   1. Shared tokens   — both bought/sold the same OTHER token(s)
//   2. Shared counterparty — both received from OR sent to the same wallet
//                             (excluding the pair themselves)
//   3. Direct transfer — one wallet sent SOL/tokens to the other at any point
//
// Each detected connection produces a KinshipPair with a type-tagged evidence
// list and a strength score. Higher score = more independent confirmations
// that the two wallets are related.

import { getConstellation } from "./constellation-service";

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_PARSED_BASE = HELIUS_NETWORK === "devnet"
  ? "https://api-devnet.helius.xyz"
  : "https://api.helius.xyz";

const HISTORY_WINDOW_SEC = 90 * 24 * 3600;
const MAX_WALLETS_SCANNED = 15;
const MAX_PAGES_PER_WALLET = 5; // ~500 recent txs per wallet
const MIN_SCORE_TO_REPORT = 1;

export type KinshipLinkType = "sharedToken" | "sharedCounterparty" | "directTransfer";

export interface KinshipEvidence {
  type: KinshipLinkType;
  // For sharedToken: the shared mint. For sharedCounterparty: the common wallet.
  // For directTransfer: "A->B" direction encoded in fromWallet/toWallet fields.
  address: string;
  fromWallet?: string;
  toWallet?: string;
  sampleSignature?: string;
  sampleTs?: number;
}

export interface KinshipPair {
  walletA: string;
  walletB: string;
  score: number;
  linkCount: number;
  linkTypes: KinshipLinkType[];
  sharedTokens: string[];
  sharedCounterparties: string[];
  directTransfers: Array<{ from: string; to: string; signature: string; ts: number }>;
  firstSeen: number;
  lastSeen: number;
}

export interface KinshipHistoryReport {
  ca: string;
  scannedWallets: number;
  windowDays: number;
  pairs: KinshipPair[];
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

interface WalletProfile {
  wallet: string;
  // Tokens the wallet touched (mint -> earliest/latest ts)
  tokensTouched: Map<string, { firstSeen: number; lastSeen: number }>;
  // Every distinct counterparty wallet seen in nativeTransfers or tokenTransfers,
  // together with the latest tx sig as evidence
  counterparties: Map<string, { latestSig: string; latestTs: number }>;
  // Direct transfers TO a specific wallet. Key = target wallet.
  directSends: Map<string, { signature: string; ts: number }>;
}

const cache = new Map<string, { result: KinshipHistoryReport; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchParsed(address: string, before?: string, limit = 100): Promise<any[]> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY not set");
  const url = new URL(`${HELIUS_PARSED_BASE}/v0/addresses/${address}/transactions`);
  url.searchParams.set("api-key", HELIUS_KEY);
  url.searchParams.set("limit", String(limit));
  if (before) url.searchParams.set("before", before);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Helius parsed HTTP ${res.status}`);
  return (await res.json()) as any[];
}

async function buildProfile(
  wallet: string,
  cutoffTs: number,
  currentCa: string,
): Promise<WalletProfile> {
  const profile: WalletProfile = {
    wallet,
    tokensTouched: new Map(),
    counterparties: new Map(),
    directSends: new Map(),
  };

  let before: string | undefined;
  try {
    for (let page = 0; page < MAX_PAGES_PER_WALLET; page++) {
      const txs = await fetchParsed(wallet, before, 100);
      if (!txs || txs.length === 0) break;

      let reachedCutoff = false;

      for (const tx of txs) {
        const ts = tx.timestamp ?? 0;
        if (ts && ts < cutoffTs) {
          reachedCutoff = true;
          continue;
        }
        if (tx.transactionError) continue;
        const sig = tx.signature ?? "";

        // Token transfers — register mints and counterparties
        const tokenTransfers: any[] = tx.tokenTransfers ?? [];
        for (const t of tokenTransfers) {
          const mint = t?.mint;
          if (mint && mint !== currentCa) {
            const prev = profile.tokensTouched.get(mint);
            if (!prev) {
              profile.tokensTouched.set(mint, { firstSeen: ts, lastSeen: ts });
            } else {
              prev.firstSeen = Math.min(prev.firstSeen, ts);
              prev.lastSeen = Math.max(prev.lastSeen, ts);
            }
          }
          const from = t?.fromUserAccount;
          const to = t?.toUserAccount;
          // Register direct send if wallet is source and the receiver is not itself
          if (from === wallet && to && to !== wallet) {
            if (!profile.directSends.has(to)) {
              profile.directSends.set(to, { signature: sig, ts });
            }
            // also a counterparty
            if (!profile.counterparties.has(to)) {
              profile.counterparties.set(to, { latestSig: sig, latestTs: ts });
            }
          }
          if (to === wallet && from && from !== wallet) {
            if (!profile.counterparties.has(from)) {
              profile.counterparties.set(from, { latestSig: sig, latestTs: ts });
            }
          }
        }

        // Native SOL transfers — only counterparty + directSend tracking
        const natTransfers: any[] = tx.nativeTransfers ?? [];
        for (const n of natTransfers) {
          const from = n?.fromUserAccount;
          const to = n?.toUserAccount;
          if (!from || !to) continue;
          if (from === wallet && to !== wallet) {
            if (!profile.directSends.has(to)) {
              profile.directSends.set(to, { signature: sig, ts });
            }
            if (!profile.counterparties.has(to)) {
              profile.counterparties.set(to, { latestSig: sig, latestTs: ts });
            }
          }
          if (to === wallet && from !== wallet) {
            if (!profile.counterparties.has(from)) {
              profile.counterparties.set(from, { latestSig: sig, latestTs: ts });
            }
          }
        }
      }

      before = txs[txs.length - 1]?.signature;
      if (!before || reachedCutoff) break;
    }
  } catch {
    // partial profile is fine — we'll use whatever data we got
  }

  return profile;
}

export async function getKinshipHistory(ca: string): Promise<KinshipHistoryReport> {
  const hit = cache.get(ca);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    const constellation = await getConstellation(ca);
    if (!constellation.ok) throw new Error(constellation.reason || "constellation failed");

    // Prioritize wallets to scan — inner rings first
    const priority = new Map<string, number>();
    for (const n of constellation.nodes) {
      const score =
        (n.roles.includes("dev") ? 100 : 0) +
        (n.roles.includes("earlyCohort") ? (21 - (n.cohortRank ?? 21)) : 0) +
        (n.roles.includes("topHolder") ? Math.max(0, 21 - (n.holderRank ?? 21)) : 0) +
        (n.roles.includes("sniper") ? 5 : 0) +
        (n.roles.includes("bump") ? 3 : 0) +
        (n.roles.includes("copycatLeader") ? 2 : 0);
      if (score > 0) priority.set(n.wallet, score);
    }
    const walletsToScan = Array.from(priority.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_WALLETS_SCANNED)
      .map(([w]) => w);

    if (walletsToScan.length < 2) {
      const empty: KinshipHistoryReport = {
        ca,
        scannedWallets: walletsToScan.length,
        windowDays: 90,
        pairs: [],
        fetchedAt: Date.now(),
        ok: true,
      };
      cache.set(ca, { result: empty, expiresAt: Date.now() + CACHE_TTL_MS });
      return empty;
    }

    const cutoff = Math.floor(Date.now() / 1000) - HISTORY_WINDOW_SEC;
    const profiles = await Promise.all(
      walletsToScan.map((w) => buildProfile(w, cutoff, ca)),
    );

    const walletSet = new Set(walletsToScan);
    const pairs: KinshipPair[] = [];

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const a = profiles[i];
        const b = profiles[j];

        // 1) shared tokens
        const sharedTokens: string[] = [];
        for (const mint of Array.from(a.tokensTouched.keys())) {
          if (b.tokensTouched.has(mint)) sharedTokens.push(mint);
        }

        // 2) shared counterparties (exclude A and B themselves)
        const sharedCounterparties: string[] = [];
        for (const cp of Array.from(a.counterparties.keys())) {
          if (cp === a.wallet || cp === b.wallet) continue;
          // Exclude other wallets in the scanned set — those are already graph
          // nodes and aren't "external clusters"; we only count truly external
          // shared counterparties for the sharedCounterparty signal.
          if (walletSet.has(cp)) continue;
          if (b.counterparties.has(cp)) sharedCounterparties.push(cp);
        }

        // 3) direct transfers
        const directTransfers: KinshipPair["directTransfers"] = [];
        const aSentToB = a.directSends.get(b.wallet);
        if (aSentToB) {
          directTransfers.push({
            from: a.wallet,
            to: b.wallet,
            signature: aSentToB.signature,
            ts: aSentToB.ts,
          });
        }
        const bSentToA = b.directSends.get(a.wallet);
        if (bSentToA) {
          directTransfers.push({
            from: b.wallet,
            to: a.wallet,
            signature: bSentToA.signature,
            ts: bSentToA.ts,
          });
        }

        // Score: direct transfer = 3 each, shared counterparty = 1 each (capped),
        // shared token = 1 each (capped). Heavy weight on direct because it's
        // irrefutable evidence of a relationship.
        const tokenScore = Math.min(sharedTokens.length, 5);
        const cpScore = Math.min(sharedCounterparties.length, 5);
        const directScore = directTransfers.length * 3;
        const score = tokenScore + cpScore + directScore;
        if (score < MIN_SCORE_TO_REPORT) continue;

        const linkTypes: KinshipLinkType[] = [];
        if (sharedTokens.length > 0) linkTypes.push("sharedToken");
        if (sharedCounterparties.length > 0) linkTypes.push("sharedCounterparty");
        if (directTransfers.length > 0) linkTypes.push("directTransfer");

        // Determine first/last seen across evidence
        let firstSeen = Number.MAX_SAFE_INTEGER;
        let lastSeen = 0;
        for (const mint of sharedTokens) {
          const aT = a.tokensTouched.get(mint)!;
          const bT = b.tokensTouched.get(mint)!;
          firstSeen = Math.min(firstSeen, aT.firstSeen, bT.firstSeen);
          lastSeen = Math.max(lastSeen, aT.lastSeen, bT.lastSeen);
        }
        for (const cp of sharedCounterparties) {
          const aCp = a.counterparties.get(cp)!;
          const bCp = b.counterparties.get(cp)!;
          firstSeen = Math.min(firstSeen, aCp.latestTs, bCp.latestTs);
          lastSeen = Math.max(lastSeen, aCp.latestTs, bCp.latestTs);
        }
        for (const d of directTransfers) {
          firstSeen = Math.min(firstSeen, d.ts);
          lastSeen = Math.max(lastSeen, d.ts);
        }
        if (firstSeen === Number.MAX_SAFE_INTEGER) firstSeen = 0;

        pairs.push({
          walletA: a.wallet,
          walletB: b.wallet,
          score,
          linkCount: sharedTokens.length + sharedCounterparties.length + directTransfers.length,
          linkTypes,
          sharedTokens: sharedTokens.slice(0, 20),
          sharedCounterparties: sharedCounterparties.slice(0, 20),
          directTransfers,
          firstSeen,
          lastSeen,
        });
      }
    }

    pairs.sort((a, b) => b.score - a.score);

    const result: KinshipHistoryReport = {
      ca,
      scannedWallets: walletsToScan.length,
      windowDays: 90,
      pairs,
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(ca, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (e) {
    return {
      ca,
      scannedWallets: 0,
      windowDays: 90,
      pairs: [],
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "kinship history failed",
    };
  }
}
