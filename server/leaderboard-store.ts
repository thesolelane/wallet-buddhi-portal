import { pool } from "./db";
import {
  getBumpOperators,
  getCopycatLeaders,
  getPersistentPairs,
  getProfitableTraders,
  getRepeatSnipers,
  recordBump,
  recordLeader,
  recordPair,
  recordSniper,
  recordTraderSnapshot,
} from "./session-registry";

let ready: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureTable() {
  if (!ready) {
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS leaderboard_state (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      )
      .then(() => undefined);
  }
  await ready;
}

export async function hydrateLeaderboards() {
  await ensureTable();
  const result = await pool.query("SELECT payload FROM leaderboard_state WHERE id = $1", ["default"]);
  const payload = result.rows[0]?.payload;
  if (!payload) return;
  for (const row of payload.snipers || []) {
    for (const ca of row.tokens || []) {
      recordSniper({
        wallet: row.wallet,
        ca,
        priorityFeeSol: 0,
        jitoTipSol: 0,
        stillHolding: true,
        timestamp: row.lastSeen || 0,
      });
    }
  }
  for (const row of payload.bumps || []) {
    for (const ca of row.tokens || []) {
      recordBump({
        wallet: row.wallet,
        ca,
        feesSol: 0,
        roundTrips: 0,
        lastSeen: row.lastActive || 0,
      });
    }
  }
  for (const row of payload.leaders || []) {
    recordLeader({
      leader: row.leader,
      follower: (row.followers && row.followers[0]) || row.leader,
      sharedTokens: row.tokens || [],
      avgLagSec: row.avgLagSec || 0,
      timestamp: row.lastSeen || 0,
    });
  }
  for (const row of payload.traders || []) {
    recordTraderSnapshot({
      wallet: row.wallet,
      realizedSol: row.realizedSol || 0,
      tokensTraded: row.tokens || [],
      winningTokenCount: row.winningTokens || 0,
      losingTokenCount: row.losingTokens || 0,
      timestamp: row.lastSeen || 0,
    });
  }
  for (const row of payload.pairs || []) {
    recordPair({
      walletA: row.walletA,
      walletB: row.walletB,
      score: row.score || 0,
      sharedTokens: [],
      sharedCounterparties: [],
      directTransfers: row.directTransfers || 0,
      timestamp: row.lastSeen || 0,
    });
  }
}

export async function persistLeaderboards() {
  await ensureTable();
  const payload = {
    snipers: getRepeatSnipers(1),
    bumps: getBumpOperators(1),
    leaders: getCopycatLeaders(1),
    traders: getProfitableTraders(200),
    pairs: getPersistentPairs(0),
    savedAt: Date.now(),
  };
  await pool.query(
    `INSERT INTO leaderboard_state (id, payload, updated_at)
     VALUES ('default', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [JSON.stringify(payload)],
  );
}

export function scheduleLeaderboardPersist() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void persistLeaderboards().catch((error) => {
      console.error("leaderboard persist failed", error);
    });
  }, 1500);
}
