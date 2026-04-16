// Session registry — cross-token aggregation for leaderboards.
//
// As users analyze tokens and wallets, services feed their findings here.
// Leaderboards read from this registry. Session-scoped (resets on restart);
// persistence lands in a later slice.

export interface SniperEntry {
  wallet: string;
  tokens: Set<string>;
  totalJitoTipSol: number;
  totalPriorityFeeSol: number;
  snipesExited: number; // count of tokens where this wallet sniped then left top holders
  snipesTotal: number;
  lastSeen: number;
}

export interface BumpEntry {
  wallet: string;
  tokens: Set<string>;
  totalFeesSol: number;
  totalRoundTrips: number;
  lastActive: number; // most recent lastSeen ts across tokens
}

export interface LeaderEntry {
  leader: string;
  followers: Set<string>;
  tokenObservations: number; // how many times a copycat-on-this-leader was observed
  totalSharedTokens: Set<string>;
  avgLagSecSum: number;
  avgLagSecCount: number;
  lastSeen: number;
}

export interface TraderEntry {
  wallet: string;
  realizedSol: number;
  tokensTraded: Set<string>;
  winningTokens: number;
  losingTokens: number;
  lastSeen: number;
}

export interface PairEntry {
  walletA: string;
  walletB: string;
  totalScore: number;
  sharedTokens: Set<string>;
  sharedCounterparties: Set<string>;
  directTransfers: number;
  lastSeen: number;
}

const snipers = new Map<string, SniperEntry>();
const bumps = new Map<string, BumpEntry>();
const leaders = new Map<string, LeaderEntry>();
const traders = new Map<string, TraderEntry>();
const pairs = new Map<string, PairEntry>(); // key = `${a}|${b}` (sorted)

// -----------------------------------------------------------------------------
// Recording APIs — called from services

export interface SniperObservation {
  wallet: string;
  ca: string;
  priorityFeeSol: number;
  jitoTipSol: number;
  stillHolding: boolean;
  timestamp: number;
}

export function recordSniper(obs: SniperObservation) {
  let e = snipers.get(obs.wallet);
  if (!e) {
    e = {
      wallet: obs.wallet,
      tokens: new Set(),
      totalJitoTipSol: 0,
      totalPriorityFeeSol: 0,
      snipesExited: 0,
      snipesTotal: 0,
      lastSeen: obs.timestamp,
    };
    snipers.set(obs.wallet, e);
  }
  if (!e.tokens.has(obs.ca)) {
    e.snipesTotal += 1;
    if (!obs.stillHolding) e.snipesExited += 1;
  }
  e.tokens.add(obs.ca);
  e.totalJitoTipSol += obs.jitoTipSol;
  e.totalPriorityFeeSol += obs.priorityFeeSol;
  e.lastSeen = Math.max(e.lastSeen, obs.timestamp);
}

export interface BumpObservation {
  wallet: string;
  ca: string;
  feesSol: number;
  roundTrips: number;
  lastSeen: number;
}

export function recordBump(obs: BumpObservation) {
  let e = bumps.get(obs.wallet);
  if (!e) {
    e = {
      wallet: obs.wallet,
      tokens: new Set(),
      totalFeesSol: 0,
      totalRoundTrips: 0,
      lastActive: obs.lastSeen,
    };
    bumps.set(obs.wallet, e);
  }
  e.tokens.add(obs.ca);
  e.totalFeesSol += obs.feesSol;
  e.totalRoundTrips += obs.roundTrips;
  e.lastActive = Math.max(e.lastActive, obs.lastSeen);
}

export interface LeaderObservation {
  leader: string;
  follower: string;
  sharedTokens: string[];
  avgLagSec: number;
  timestamp: number;
}

export function recordLeader(obs: LeaderObservation) {
  let e = leaders.get(obs.leader);
  if (!e) {
    e = {
      leader: obs.leader,
      followers: new Set(),
      tokenObservations: 0,
      totalSharedTokens: new Set(),
      avgLagSecSum: 0,
      avgLagSecCount: 0,
      lastSeen: obs.timestamp,
    };
    leaders.set(obs.leader, e);
  }
  e.followers.add(obs.follower);
  e.tokenObservations += 1;
  for (const t of obs.sharedTokens) e.totalSharedTokens.add(t);
  e.avgLagSecSum += obs.avgLagSec;
  e.avgLagSecCount += 1;
  e.lastSeen = Math.max(e.lastSeen, obs.timestamp);
}

export interface TraderObservation {
  wallet: string;
  realizedSol: number; // signed, only when positive or negative matters
  tokensTraded: string[];
  winningTokenCount: number;
  losingTokenCount: number;
  timestamp: number;
}

export function recordTraderSnapshot(obs: TraderObservation) {
  // Replace-on-write because each wallet analysis is a full snapshot of recent
  // activity. We don't accumulate realizedSol across calls to avoid double
  // counting the same swaps.
  const e: TraderEntry = {
    wallet: obs.wallet,
    realizedSol: obs.realizedSol,
    tokensTraded: new Set(obs.tokensTraded),
    winningTokens: obs.winningTokenCount,
    losingTokens: obs.losingTokenCount,
    lastSeen: obs.timestamp,
  };
  traders.set(obs.wallet, e);
}

export interface PairObservation {
  walletA: string;
  walletB: string;
  score: number;
  sharedTokens: string[];
  sharedCounterparties: string[];
  directTransfers: number;
  timestamp: number;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function recordPair(obs: PairObservation) {
  const key = pairKey(obs.walletA, obs.walletB);
  let e = pairs.get(key);
  if (!e) {
    const [a, b] = key.split("|");
    e = {
      walletA: a,
      walletB: b,
      totalScore: 0,
      sharedTokens: new Set(),
      sharedCounterparties: new Set(),
      directTransfers: 0,
      lastSeen: obs.timestamp,
    };
    pairs.set(key, e);
  }
  // Use max-score across sightings (not sum — pair score is already a per-scan metric)
  e.totalScore = Math.max(e.totalScore, obs.score);
  for (const t of obs.sharedTokens) e.sharedTokens.add(t);
  for (const c of obs.sharedCounterparties) e.sharedCounterparties.add(c);
  e.directTransfers = Math.max(e.directTransfers, obs.directTransfers);
  e.lastSeen = Math.max(e.lastSeen, obs.timestamp);
}

// -----------------------------------------------------------------------------
// Read APIs

export function getRepeatSnipers(minTokens = 2) {
  return Array.from(snipers.values())
    .filter((e) => e.tokens.size >= minTokens)
    .map((e) => ({
      wallet: e.wallet,
      tokensSniped: e.tokens.size,
      totalJitoTipSol: e.totalJitoTipSol,
      avgPriorityFeeSol: e.totalPriorityFeeSol / Math.max(e.snipesTotal, 1),
      exitRate: e.snipesTotal ? e.snipesExited / e.snipesTotal : 0,
      lastSeen: e.lastSeen,
    }))
    .sort((a, b) => b.tokensSniped - a.tokensSniped);
}

export function getBumpOperators(minTokens = 2) {
  return Array.from(bumps.values())
    .filter((e) => e.tokens.size >= minTokens)
    .map((e) => ({
      wallet: e.wallet,
      tokensBumped: e.tokens.size,
      totalFeesSol: e.totalFeesSol,
      totalRoundTrips: e.totalRoundTrips,
      lastActive: e.lastActive,
    }))
    .sort((a, b) => b.tokensBumped - a.tokensBumped);
}

export function getCopycatLeaders(minFollowers = 2) {
  return Array.from(leaders.values())
    .filter((e) => e.followers.size >= minFollowers)
    .map((e) => ({
      leader: e.leader,
      followers: e.followers.size,
      sharedTokens: e.totalSharedTokens.size,
      avgLagSec: e.avgLagSecCount ? e.avgLagSecSum / e.avgLagSecCount : 0,
      lastSeen: e.lastSeen,
    }))
    .sort((a, b) => b.followers - a.followers);
}

export function getProfitableTraders(top = 50) {
  return Array.from(traders.values())
    .map((e) => ({
      wallet: e.wallet,
      realizedSol: e.realizedSol,
      tokensTraded: e.tokensTraded.size,
      winRate: (e.winningTokens + e.losingTokens)
        ? e.winningTokens / (e.winningTokens + e.losingTokens)
        : 0,
      lastSeen: e.lastSeen,
    }))
    .sort((a, b) => b.realizedSol - a.realizedSol)
    .slice(0, top);
}

export function getPersistentPairs(minScore = 3) {
  return Array.from(pairs.values())
    .filter((e) => e.totalScore >= minScore)
    .map((e) => ({
      walletA: e.walletA,
      walletB: e.walletB,
      score: e.totalScore,
      sharedTokens: e.sharedTokens.size,
      sharedCounterparties: e.sharedCounterparties.size,
      directTransfers: e.directTransfers,
      lastSeen: e.lastSeen,
    }))
    .sort((a, b) => b.score - a.score);
}

export function getRegistryCounts() {
  return {
    snipers: snipers.size,
    bumps: bumps.size,
    leaders: leaders.size,
    traders: traders.size,
    pairs: pairs.size,
  };
}
