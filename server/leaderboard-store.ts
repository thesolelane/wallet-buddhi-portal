import { pool } from "./db";
import {
  recordBump,
  recordLeader,
  recordPair,
  recordSniper,
  recordTraderSnapshot,
} from "./session-registry";
import { dumpRegistry } from "./session-registry-dump";

let ready: Promise<void> | null = null;

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
        priorityFeeSol: Number(row.totalPriorityFeeSol || 0) / Math.max((row.tokens || []).length, 1),
        jitoTipSol: Number(row.totalJitoTipSol || 0) / Math.max((row.tokens || []).length, 1),
        stillHolding: (row.snipesExited || 0) === 0,
        timestamp: row.lastSeen || 0,
      });
    }
  }
  for (const row of payload.bumps || []) {
    for (const ca of row.tokens || []) {
      recordBump({
        wallet: row.wallet,
        ca,
        feesSol: Number(row.totalFeesSol || 0) / Math.max((row.tokens || []).length, 1),
        roundTrips: Number(row.totalRoundTrips || 0) / Math.max((row.tokens || []).length, 1),
        lastSeen: row.lastActive || row.lastSeen || 0,
      });
    }
  }
  for (const row of payload.leaders || []) {
    const followers = row.followers || [];
    for (const follower of followers.length ? followers : [row.leader]) {
      recordLeader({
        leader: row.leader,
        follower,
        sharedTokens: row.tokens || row.totalSharedTokens || [],
        avgLagSec: row.avgLagSec || 0,
        timestamp: row.lastSeen || 0,
      });
    }
  }
  for (const row of payload.traders || []) {
    recordTraderSnapshot({
      wallet: row.wallet,
      realizedSol: row.realizedSol || 0,
      tokensTraded: row.tokens || row.tokensTraded || [],
      winningTokenCount: row.winningTokens || 0,
      losingTokenCount: row.losingTokens || 0,
      timestamp: row.lastSeen || 0,
    });
  }
  for (const row of payload.pairs || []) {
    recordPair({
      walletA: row.walletA,
      walletB: row.walletB,
      score: row.totalScore || row.score || 0,
      sharedTokens: row.sharedTokens || [],
      sharedCounterparties: row.sharedCounterparties || [],
      directTransfers: row.directTransfers || 0,
      timestamp: row.lastSeen || 0,
    });
  }
}

export async function persistLeaderboards() {
  await ensureTable();
  const payload = { ...dumpRegistry(), savedAt: Date.now() };
  await pool.query(
    `INSERT INTO leaderboard_state (id, payload, updated_at)
     VALUES ('default', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [JSON.stringify(payload)],
  );
}

export function scheduleLeaderboardPersist() {
  void persistLeaderboards().catch((error) => console.error("leaderboard persist failed", error));
}
