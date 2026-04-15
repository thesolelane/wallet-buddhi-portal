// Buyers service — Phase B
// Scans first-N buyers of a token using Helius parsed-transactions API.
// On-demand (no DB yet). Cached in memory for 10 min per token.

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_PARSED_BASE = HELIUS_NETWORK === "devnet"
  ? "https://api-devnet.helius.xyz"
  : "https://api.helius.xyz";

// Known base quote mints we treat as "SOL/USD paid"
const WSOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export interface Buyer {
  rank: number; // 1 = first buyer
  wallet: string;
  signature: string;
  timestamp: number; // unix seconds
  quoteMint: string; // WSOL/USDC/other
  quoteSymbol: "SOL" | "USDC" | "USDT" | "other";
  quoteAmount: number; // UI amount
  tokenAmount: number; // UI amount of the token bought
  source: string; // dex source reported by Helius
}

export interface BuyersResult {
  ca: string;
  buyers: Buyer[];
  scannedTxs: number;
  hitLimit: boolean;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

// Naive in-memory cache: ca -> { result, expiresAt }
const cache = new Map<string, { result: BuyersResult; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function classifyQuote(mint: string): Buyer["quoteSymbol"] {
  if (mint === WSOL) return "SOL";
  if (mint === USDC) return "USDC";
  if (mint === USDT) return "USDT";
  return "other";
}

async function fetchHeliusParsed(
  address: string,
  before?: string,
  limit = 100,
): Promise<any[]> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY not set");
  const url = new URL(`${HELIUS_PARSED_BASE}/v0/addresses/${address}/transactions`);
  url.searchParams.set("api-key", HELIUS_KEY);
  url.searchParams.set("limit", String(limit));
  if (before) url.searchParams.set("before", before);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Helius parsed HTTP ${res.status}`);
  return (await res.json()) as any[];
}

/**
 * Walk parsed-tx history backwards in time, collecting the first N unique
 * buyer wallets (earliest txs). We paginate until we reach the end of history
 * or hit a safety cap, then reverse and deduplicate by wallet.
 */
export async function getFirstBuyers(
  ca: string,
  limit = 200,
  maxPages = 20,
): Promise<BuyersResult> {
  const hit = cache.get(ca);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    const allBuys: Buyer[] = [];
    let before: string | undefined;
    let scanned = 0;
    let page = 0;
    let hitLimit = false;

    // Paginate backwards. Helius returns newest-first. We keep going until
    // fewer than `pageSize` are returned (end of history) or we hit maxPages.
    const pageSize = 100;

    for (; page < maxPages; page++) {
      const txs = await fetchHeliusParsed(ca, before, pageSize);
      if (!txs || txs.length === 0) break;
      scanned += txs.length;

      for (const tx of txs) {
        if (tx.transactionError) continue;
        // Helius classifies swaps as type === "SWAP"
        const isSwap = tx.type === "SWAP" || (tx.events && tx.events.swap);
        if (!isSwap) continue;

        const swapEvent = tx.events?.swap;
        if (!swapEvent) continue;

        // Identify: who RECEIVED the target token (= buyer), and what quote was paid.
        const tokenInputs = swapEvent.tokenInputs ?? [];
        const tokenOutputs = swapEvent.tokenOutputs ?? [];
        const nativeInput = swapEvent.nativeInput;

        // Search outputs for our token
        const targetOut = tokenOutputs.find((t: any) => t?.mint === ca);
        if (!targetOut) continue; // this swap didn't end with buyer holding our token

        const buyer = targetOut.userAccount || targetOut.tokenAccount;
        if (!buyer) continue;

        // Figure out quote paid: prefer nativeInput (SOL), else first non-target tokenInput
        let quoteMint = "";
        let quoteAmount = 0;
        if (nativeInput?.amount) {
          quoteMint = WSOL;
          quoteAmount = Number(nativeInput.amount) / 1e9;
        } else {
          const quoteIn = tokenInputs.find((t: any) => t?.mint && t.mint !== ca);
          if (quoteIn) {
            quoteMint = quoteIn.mint;
            const amt = quoteIn.rawTokenAmount?.tokenAmount ?? quoteIn.tokenAmount ?? 0;
            const dec = quoteIn.rawTokenAmount?.decimals ?? 6;
            quoteAmount = Number(amt) / Math.pow(10, dec);
          }
        }

        const tokenAmount = (() => {
          const raw = targetOut.rawTokenAmount?.tokenAmount ?? targetOut.tokenAmount ?? 0;
          const dec = targetOut.rawTokenAmount?.decimals ?? 0;
          return Number(raw) / Math.pow(10, dec);
        })();

        allBuys.push({
          rank: 0, // filled in after sort
          wallet: buyer,
          signature: tx.signature,
          timestamp: tx.timestamp ?? 0,
          quoteMint,
          quoteSymbol: classifyQuote(quoteMint),
          quoteAmount,
          tokenAmount,
          source: tx.source || "unknown",
        });
      }

      before = txs[txs.length - 1]?.signature;
      if (!before || txs.length < pageSize) break;
    }

    if (page >= maxPages) hitLimit = true;

    // Sort ascending by timestamp so earliest come first
    allBuys.sort((a, b) => a.timestamp - b.timestamp);

    // Dedup by wallet — keep first occurrence only
    const seen = new Set<string>();
    const firstBuys: Buyer[] = [];
    for (const b of allBuys) {
      if (seen.has(b.wallet)) continue;
      seen.add(b.wallet);
      firstBuys.push(b);
      if (firstBuys.length >= limit) break;
    }
    firstBuys.forEach((b, i) => (b.rank = i + 1));

    const result: BuyersResult = {
      ca,
      buyers: firstBuys,
      scannedTxs: scanned,
      hitLimit,
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(ca, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (e) {
    return {
      ca,
      buyers: [],
      scannedTxs: 0,
      hitLimit: false,
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "failed",
    };
  }
}

/**
 * Given the first-buyer list and the current top-holders set, classify each
 * cohort wallet as: still holding / partial exit / fully exited.
 * Called from the route so we can overlay the cohort grid with hold state.
 */
export function classifyCohort(
  buyers: Buyer[],
  currentHolders: Set<string>,
): Array<Buyer & { state: "holding" | "exited" }> {
  return buyers.map((b) => ({
    ...b,
    state: currentHolders.has(b.wallet) ? "holding" : "exited",
  }));
}
