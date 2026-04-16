// Copycat detector — finds wallets that a target wallet appears to be copying,
// and traces the target wallet's funding source. Feeds the bad-actor registry.
//
// Heuristic v1:
//   1. Take target wallet W's 5 most-recent buys.
//   2. For each bought token, find the first ~20 buyers via existing buyers-service.
//   3. If the same wallet X shows up BEFORE W in ≥2 tokens' cohorts → X is a candidate "leader".
//   4. Time gap between X's buy and W's buy is recorded (shorter = more suspicious).
//   5. Trace W's funding source via Helius parsed txs (earliest incoming native transfer).
//   6. Register (funder → W) and flag W as copycat if ≥2 leaders detected.

import { getWalletActivity } from "./wallet-service";
import { getFirstBuyers } from "./buyers-service";
import {
  flagCopycat,
  getFunderReport,
  getFunderOf,
  recordFunding,
} from "./bad-actor-registry";

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_PARSED_BASE = HELIUS_NETWORK === "devnet"
  ? "https://api-devnet.helius.xyz"
  : "https://api.helius.xyz";

export interface LeaderHit {
  leader: string;
  sharedTokens: number;
  avgLagSec: number; // how long after leader's buy W bought (across shared tokens)
  samples: Array<{ tokenMint: string; lagSec: number }>;
}

export interface FunderTrace {
  funder: string | null;
  firstFundingSignature: string | null;
  firstFundingTs: number | null;
  knownAsCexDeposit: boolean;
  reason?: string;
}

export interface CopycatReport {
  wallet: string;
  analyzedTokens: number;
  leaders: LeaderHit[];
  isCopycat: boolean;
  funder: FunderTrace;
  funderReport: {
    fundedCount: number;
    copycatCount: number;
    flagged: boolean;
  } | null;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

// Small heuristic: known CEX hot wallet prefixes (incomplete but useful to warn
// "traced to CEX — can't go further").
const CEX_DEPOSIT_HOTSPOTS = new Set<string>([
  // Binance hot wallets (sample)
  "2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S",
  "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
  // Coinbase
  "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS",
  // Kraken
  "FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5",
]);

async function fetchFirstIncomingNativeTransfer(
  address: string,
): Promise<FunderTrace> {
  if (!HELIUS_KEY) {
    return {
      funder: null,
      firstFundingSignature: null,
      firstFundingTs: null,
      knownAsCexDeposit: false,
      reason: "HELIUS_API_KEY not set",
    };
  }
  try {
    // Paginate backwards; we want the OLDEST incoming native transfer,
    // which means we walk until we run out.
    let before: string | undefined;
    let oldest:
      | { from: string; signature: string; ts: number; amount: number }
      | null = null;
    const maxPages = 10;
    for (let p = 0; p < maxPages; p++) {
      const url = new URL(
        `${HELIUS_PARSED_BASE}/v0/addresses/${address}/transactions`,
      );
      url.searchParams.set("api-key", HELIUS_KEY);
      url.searchParams.set("limit", "100");
      if (before) url.searchParams.set("before", before);
      const res = await fetch(url.toString());
      if (!res.ok) break;
      const txs: any[] = await res.json();
      if (!txs || txs.length === 0) break;

      for (const tx of txs) {
        if (tx.transactionError) continue;
        const nats: any[] = tx.nativeTransfers ?? [];
        for (const n of nats) {
          if (
            n?.toUserAccount === address &&
            n.fromUserAccount &&
            n.fromUserAccount !== address
          ) {
            const ts = tx.timestamp ?? 0;
            if (!oldest || ts < oldest.ts) {
              oldest = {
                from: n.fromUserAccount,
                signature: tx.signature,
                ts,
                amount: Number(n.amount ?? 0) / 1e9,
              };
            }
          }
        }
      }
      before = txs[txs.length - 1]?.signature;
      if (!before) break;
    }

    if (!oldest) {
      return {
        funder: null,
        firstFundingSignature: null,
        firstFundingTs: null,
        knownAsCexDeposit: false,
        reason: "No incoming native transfers found in recent history",
      };
    }

    return {
      funder: oldest.from,
      firstFundingSignature: oldest.signature,
      firstFundingTs: oldest.ts,
      knownAsCexDeposit: CEX_DEPOSIT_HOTSPOTS.has(oldest.from),
    };
  } catch (e) {
    return {
      funder: null,
      firstFundingSignature: null,
      firstFundingTs: null,
      knownAsCexDeposit: false,
      reason: e instanceof Error ? e.message : "funder trace failed",
    };
  }
}

const cache = new Map<string, { result: CopycatReport; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function analyzeCopycat(wallet: string): Promise<CopycatReport> {
  const hit = cache.get(wallet);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    const activity = await getWalletActivity(wallet, 100);
    if (!activity.ok) {
      throw new Error(activity.reason || "activity fetch failed");
    }

    // Collect this wallet's buys with timestamps, most recent first
    const myBuys = activity.swaps
      .filter((s) => s.direction === "buy")
      .slice(0, 5);

    const leaderCandidates = new Map<
      string,
      { sharedTokens: number; lagSecs: number[]; samples: LeaderHit["samples"] }
    >();

    // For each of W's buys, fetch first-buyers of that token and compare timestamps
    for (const buy of myBuys) {
      try {
        const buyersResult = await getFirstBuyers(buy.tokenMint, 50);
        if (!buyersResult.ok) continue;
        // Find W's own entry in the cohort (if any) to get its precise timestamp
        const myEntry = buyersResult.buyers.find((b) => b.wallet === wallet);
        const myTs = myEntry?.timestamp ?? buy.timestamp;
        if (!myTs) continue;

        // Look for any other wallet that bought before W within 2 hours
        for (const b of buyersResult.buyers) {
          if (b.wallet === wallet) continue;
          if (b.timestamp >= myTs) continue;
          const lag = myTs - b.timestamp;
          if (lag > 7200) continue; // 2h cutoff — ignore stale leaders

          const cand = leaderCandidates.get(b.wallet) ?? {
            sharedTokens: 0,
            lagSecs: [],
            samples: [],
          };
          cand.sharedTokens += 1;
          cand.lagSecs.push(lag);
          cand.samples.push({ tokenMint: buy.tokenMint, lagSec: lag });
          leaderCandidates.set(b.wallet, cand);
        }
      } catch {
        // skip — one token's lookup failure shouldn't kill the whole analysis
      }
    }

    const leaders: LeaderHit[] = Array.from(leaderCandidates.entries())
      .filter(([, v]) => v.sharedTokens >= 2) // need to show up across ≥2 tokens
      .map(([leader, v]) => ({
        leader,
        sharedTokens: v.sharedTokens,
        avgLagSec: v.lagSecs.reduce((a, b) => a + b, 0) / v.lagSecs.length,
        samples: v.samples,
      }))
      .sort((a, b) => b.sharedTokens - a.sharedTokens || a.avgLagSec - b.avgLagSec)
      .slice(0, 10);

    const isCopycat = leaders.length > 0;

    // Funder trace
    let funderTrace = await fetchFirstIncomingNativeTransfer(wallet);

    // Register funding link in bad-actor registry (even if not yet a copycat,
    // so we can cluster later)
    if (funderTrace.funder) {
      recordFunding(funderTrace.funder, wallet);
    }

    if (isCopycat) {
      flagCopycat(wallet);
    }

    const funderReport = funderTrace.funder
      ? getFunderReport(funderTrace.funder)
      : null;

    const result: CopycatReport = {
      wallet,
      analyzedTokens: myBuys.length,
      leaders,
      isCopycat,
      funder: funderTrace,
      funderReport: funderReport
        ? {
            fundedCount: funderReport.fundedCount,
            copycatCount: funderReport.copycatCount,
            flagged: funderReport.flagged,
          }
        : null,
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(wallet, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (e) {
    return {
      wallet,
      analyzedTokens: 0,
      leaders: [],
      isCopycat: false,
      funder: {
        funder: null,
        firstFundingSignature: null,
        firstFundingTs: null,
        knownAsCexDeposit: false,
      },
      funderReport: null,
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "copycat analysis failed",
    };
  }
}
