// Bump-bot detector — Phase E
// Scans the same parsed-tx stream used by buyers-service and flags wallets
// with round-trip buy→sell patterns characteristic of bump bots.
//
// Heuristic v1 (conservative):
//   - wallet has >= 3 buys and >= 3 sells on this token
//   - buy-count / sell-count is within 0.5x–2x (balanced round trips)
//   - median buy size and median sell size are within 30% of each other
//   - at least some txs within last 24h (active campaign)
// Output includes estimated SOL fee burn so users can see "fake volume cost".

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_PARSED_BASE = HELIUS_NETWORK === "devnet"
  ? "https://api-devnet.helius.xyz"
  : "https://api.helius.xyz";

export interface BumpWalletEntry {
  wallet: string;
  buys: number;
  sells: number;
  firstSeen: number;
  lastSeen: number;
  medianBuySol: number;
  medianSellSol: number;
  totalFeesSol: number;
  balanceRatio: number; // sells/buys ratio, 1.0 = perfectly balanced
}

export interface BumpReport {
  ca: string;
  scannedTxs: number;
  suspectWallets: BumpWalletEntry[];
  totalFeesBurnedSol: number;
  activeLast24h: boolean;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

const cache = new Map<string, { result: BumpReport; expiresAt: number }>();
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

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface WalletStats {
  buys: number[];
  sells: number[];
  fees: number;
  firstSeen: number;
  lastSeen: number;
}

export async function detectBumpBots(ca: string, maxPages = 10): Promise<BumpReport> {
  const hit = cache.get(ca);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    const perWallet = new Map<string, WalletStats>();
    let before: string | undefined;
    let scanned = 0;
    const pageSize = 100;
    const nowSec = Math.floor(Date.now() / 1000);
    let activeLast24h = false;

    for (let page = 0; page < maxPages; page++) {
      const txs = await fetchParsed(ca, before, pageSize);
      if (!txs || txs.length === 0) break;
      scanned += txs.length;

      for (const tx of txs) {
        if (tx.transactionError) continue;
        const swap = tx.events?.swap;
        if (!swap) continue;

        const ts = tx.timestamp ?? 0;
        if (nowSec - ts <= 86400) activeLast24h = true;

        const tokenInputs = swap.tokenInputs ?? [];
        const tokenOutputs = swap.tokenOutputs ?? [];
        const nativeInput = swap.nativeInput;
        const nativeOutput = swap.nativeOutput;
        const fee = Number(tx.fee ?? 0) / 1e9;

        // Buy: wallet received target token. Identify by tokenOutputs mint===ca.
        const boughtOut = tokenOutputs.find((t: any) => t?.mint === ca);
        // Sell: wallet sent target token. tokenInputs mint===ca with a token/native OUTPUT to same user.
        const soldIn = tokenInputs.find((t: any) => t?.mint === ca);

        if (boughtOut) {
          const wallet = boughtOut.userAccount || boughtOut.tokenAccount;
          if (!wallet) continue;
          const solPaid =
            (nativeInput?.amount ? Number(nativeInput.amount) / 1e9 : 0) +
            // some DEXs have zero nativeInput; treat USDC as zero for this detector
            0;
          const stats = perWallet.get(wallet) ?? newStats(ts);
          stats.buys.push(solPaid);
          stats.fees += fee;
          stats.firstSeen = Math.min(stats.firstSeen, ts);
          stats.lastSeen = Math.max(stats.lastSeen, ts);
          perWallet.set(wallet, stats);
        } else if (soldIn) {
          const wallet = soldIn.userAccount || soldIn.tokenAccount;
          if (!wallet) continue;
          const solReceived = nativeOutput?.amount ? Number(nativeOutput.amount) / 1e9 : 0;
          const stats = perWallet.get(wallet) ?? newStats(ts);
          stats.sells.push(solReceived);
          stats.fees += fee;
          stats.firstSeen = Math.min(stats.firstSeen, ts);
          stats.lastSeen = Math.max(stats.lastSeen, ts);
          perWallet.set(wallet, stats);
        }
      }

      before = txs[txs.length - 1]?.signature;
      if (!before || txs.length < pageSize) break;
    }

    const suspects: BumpWalletEntry[] = [];
    let totalFees = 0;
    for (const [wallet, s] of Array.from(perWallet.entries())) {
      totalFees += s.fees;
      if (s.buys.length < 3 || s.sells.length < 3) continue;
      const ratio = s.sells.length / s.buys.length;
      if (ratio < 0.5 || ratio > 2.0) continue;
      const medB = median(s.buys);
      const medS = median(s.sells);
      if (medB === 0 || medS === 0) continue;
      const sizeSimilarity = Math.abs(medB - medS) / Math.max(medB, medS);
      if (sizeSimilarity > 0.3) continue;

      suspects.push({
        wallet,
        buys: s.buys.length,
        sells: s.sells.length,
        firstSeen: s.firstSeen,
        lastSeen: s.lastSeen,
        medianBuySol: medB,
        medianSellSol: medS,
        totalFeesSol: s.fees,
        balanceRatio: ratio,
      });
    }

    // Rank suspects by number of round trips (descending)
    suspects.sort((a, b) => Math.min(b.buys, b.sells) - Math.min(a.buys, a.sells));

    const result: BumpReport = {
      ca,
      scannedTxs: scanned,
      suspectWallets: suspects.slice(0, 20),
      totalFeesBurnedSol: suspects.reduce((s, x) => s + x.totalFeesSol, 0),
      activeLast24h,
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(ca, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (e) {
    return {
      ca,
      scannedTxs: 0,
      suspectWallets: [],
      totalFeesBurnedSol: 0,
      activeLast24h: false,
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "failed",
    };
  }
}

function newStats(ts: number): WalletStats {
  return { buys: [], sells: [], fees: 0, firstSeen: ts || Number.MAX_SAFE_INTEGER, lastSeen: ts };
}
