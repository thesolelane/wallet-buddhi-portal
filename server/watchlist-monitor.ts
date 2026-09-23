/**
 * Watch-only monitor.
 * Reads public activity for watched addresses. Never requests or stores keys.
 */
import { storage } from "./storage";
import { getWalletActivity } from "./wallet-service";
import { getTokenMetadata } from "./token-service";
import { checkTokenIdentity } from "./token-copycat-service";
import type { Signal, TokenMetadata, WatchedWallet } from "@shared/schema";

const SCAN_LIMIT = 80;
const SUSPICIOUS_SCORE = 50;
const DANGER_SCORE = 70;

export interface ScanSummary {
  wallets: number;
  buysSeen: number;
  newTokens: number;
  alerts: number;
  errors: string[];
}

function toStoredMeta(ca: string, meta: Awaited<ReturnType<typeof getTokenMetadata>>): TokenMetadata {
  const pumpHint =
    (meta.pair?.dex ?? "").toLowerCase().includes("pump") ||
    (meta.description ?? "").toLowerCase().includes("pump.fun");
  return {
    mint: ca,
    symbol: meta.symbol,
    name: meta.name,
    marketCapUsd: meta.pair?.marketCap ?? meta.pair?.fdv ?? null,
    priceUsd: null,
    website: meta.socials.website,
    twitter: meta.socials.twitter,
    telegram: meta.socials.telegram,
    discord: meta.socials.discord,
    imageUrl: meta.image,
    creator: meta.creators[0]?.address ?? null,
    updateAuthority: meta.updateAuthority,
    isPumpFun: pumpHint,
    sources: [
      meta.source.helius ? "helius" : null,
      meta.source.dexscreener ? "dexscreener" : null,
    ].filter((s): s is string => Boolean(s)),
  };
}

function signalsFromIdentity(identity: Awaited<ReturnType<typeof checkTokenIdentity>>): Signal[] {
  const signals: Signal[] = [];
  for (const match of identity.matches.slice(0, 6)) {
    for (const kind of match.kinds) {
      const type =
        kind === "exactNormalizedSymbol" || kind === "fuzzySymbol"
          ? kind === "exactNormalizedSymbol"
            ? "ticker_exact"
            : "ticker_fuzzy"
          : kind === "exactNormalizedName" || kind === "fuzzyName"
            ? "name_fuzzy"
            : kind === "sameTwitter" || kind === "sameWebsite"
              ? "social_overlap"
              : "pump_fun_clone";
      signals.push({
        type,
        confidence: Math.min(1, match.score / 100),
        detail: match.note,
      });
    }
  }
  return signals;
}

export async function scanWatchedWallet(wallet: WatchedWallet): Promise<{
  buysSeen: number;
  newTokens: number;
  alerts: number;
  error?: string;
}> {
  const activity = await getWalletActivity(wallet.pubkey, SCAN_LIMIT);
  if (!activity.ok) {
    return { buysSeen: 0, newTokens: 0, alerts: 0, error: activity.reason || "activity failed" };
  }

  const buys = activity.swaps.filter((s) => s.direction === "buy" && s.tokenMint);
  let newTokens = 0;
  let alerts = 0;

  for (const buy of buys) {
    const existing = await storage.findToken(wallet.id, buy.tokenMint);
    if (existing) continue;

    const rawMeta = await getTokenMetadata(buy.tokenMint);
    const stored = await storage.recordPurchase(wallet.id, toStoredMeta(buy.tokenMint, rawMeta));
    newTokens += 1;

    const identity = await checkTokenIdentity(buy.tokenMint);
    if (!identity.ok || identity.isSelf || identity.highestScore < SUSPICIOUS_SCORE) continue;

    const top = identity.matches[0];
    await storage.createAlert({
      watchedWalletId: wallet.id,
      newMint: buy.tokenMint,
      newSymbol: stored.symbol,
      newName: stored.name,
      matchedTokenId: top?.protectedToken.ca ?? null,
      matchedMint: top?.protectedToken.ca ?? null,
      matchedSymbol: top?.protectedToken.symbol ?? null,
      matchedName: top?.protectedToken.name ?? null,
      signals: signalsFromIdentity(identity),
      verdict: identity.highestScore >= DANGER_SCORE ? "DANGER" : "SUSPICIOUS",
    });
    alerts += 1;
  }

  return { buysSeen: buys.length, newTokens, alerts };
}

export async function scanOwnerWatchlist(ownerPubkey: string): Promise<ScanSummary> {
  const wallets = await storage.listWatchedWallets(ownerPubkey);
  return scanWalletList(wallets);
}

export async function scanAllWatchlists(): Promise<ScanSummary> {
  const wallets = await storage.listWatchedWallets();
  return scanWalletList(wallets);
}

async function scanWalletList(wallets: WatchedWallet[]): Promise<ScanSummary> {
  const summary: ScanSummary = {
    wallets: wallets.length,
    buysSeen: 0,
    newTokens: 0,
    alerts: 0,
    errors: [],
  };
  for (const wallet of wallets) {
    try {
      const result = await scanWatchedWallet(wallet);
      summary.buysSeen += result.buysSeen;
      summary.newTokens += result.newTokens;
      summary.alerts += result.alerts;
      if (result.error) summary.errors.push(`${wallet.pubkey}: ${result.error}`);
    } catch (error) {
      summary.errors.push(
        `${wallet.pubkey}: ${error instanceof Error ? error.message : "scan failed"}`,
      );
    }
  }
  return summary;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startWatchlistMonitor(intervalMs = 60_000) {
  if (timer) return;
  const tick = async () => {
    try {
      const summary = await scanAllWatchlists();
      console.log(
        `[watchlist-monitor] wallets=${summary.wallets} buys=${summary.buysSeen} new=${summary.newTokens} alerts=${summary.alerts}`,
      );
      if (summary.errors.length) {
        console.warn("[watchlist-monitor] errors", summary.errors.slice(0, 5));
      }
    } catch (error) {
      console.error("[watchlist-monitor] tick failed", error);
    }
  };
  void tick();
  timer = setInterval(tick, intervalMs);
}
