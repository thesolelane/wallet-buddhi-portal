// Wallet activity service — companion core
// Fetches a wallet's recent swap activity from Helius parsed transactions.
// On-demand, 2-min cache per wallet.

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_PARSED_BASE = HELIUS_NETWORK === "devnet"
  ? "https://api-devnet.helius.xyz"
  : "https://api.helius.xyz";

const WSOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export type SwapDirection = "buy" | "sell" | "unknown";

export interface WalletSwap {
  signature: string;
  timestamp: number;
  source: string; // dex source
  direction: SwapDirection;
  tokenMint: string; // non-quote token in the swap
  tokenAmount: number;
  quoteMint: string;
  quoteSymbol: "SOL" | "USDC" | "USDT" | "other";
  quoteAmount: number;
  priorityFeeSol: number;
}

export interface WalletActivity {
  address: string;
  swaps: WalletSwap[];
  scannedTxs: number;
  buyCount: number;
  sellCount: number;
  uniqueTokens: number;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

interface CacheEntry {
  result: WalletActivity;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function classifyQuote(mint: string): WalletSwap["quoteSymbol"] {
  if (mint === WSOL) return "SOL";
  if (mint === USDC) return "USDC";
  if (mint === USDT) return "USDT";
  return "other";
}

function isQuote(mint: string): boolean {
  return mint === WSOL || mint === USDC || mint === USDT;
}

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

export async function getWalletActivity(address: string, limit = 100): Promise<WalletActivity> {
  const hit = cache.get(address);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    const swaps: WalletSwap[] = [];
    let scanned = 0;
    let before: string | undefined;
    const maxPages = 3; // ~300 txs of recent history

    for (let p = 0; p < maxPages; p++) {
      const txs = await fetchParsed(address, before, 100);
      if (!txs || txs.length === 0) break;
      scanned += txs.length;

      for (const tx of txs) {
        if (tx.transactionError) continue;
        const swap = tx.events?.swap;
        if (!swap) continue;

        const tokenInputs = swap.tokenInputs ?? [];
        const tokenOutputs = swap.tokenOutputs ?? [];
        const nativeInput = swap.nativeInput;
        const nativeOutput = swap.nativeOutput;
        const priorityFeeSol = Number(tx.fee ?? 0) / 1e9;

        // Determine direction: user account receives token (buy) or sends token (sell)
        // vs a quote mint. Prefer the non-quote mint as "tokenMint".
        const nonQuoteOut = tokenOutputs.find(
          (t: any) => t?.mint && !isQuote(t.mint) && (t.userAccount === address || t.tokenAccount === address),
        );
        const nonQuoteIn = tokenInputs.find(
          (t: any) => t?.mint && !isQuote(t.mint) && (t.userAccount === address || t.tokenAccount === address),
        );

        let direction: SwapDirection = "unknown";
        let tokenMint = "";
        let tokenAmount = 0;
        let quoteMint = "";
        let quoteAmount = 0;

        if (nonQuoteOut) {
          // Wallet received a non-quote token = buy
          direction = "buy";
          tokenMint = nonQuoteOut.mint;
          const dec = nonQuoteOut.rawTokenAmount?.decimals ?? 0;
          const raw = nonQuoteOut.rawTokenAmount?.tokenAmount ?? nonQuoteOut.tokenAmount ?? 0;
          tokenAmount = Number(raw) / Math.pow(10, dec);

          if (nativeInput?.amount) {
            quoteMint = WSOL;
            quoteAmount = Number(nativeInput.amount) / 1e9;
          } else {
            const qi = tokenInputs.find((t: any) => t?.mint && isQuote(t.mint));
            if (qi) {
              quoteMint = qi.mint;
              const d = qi.rawTokenAmount?.decimals ?? 6;
              quoteAmount = Number(qi.rawTokenAmount?.tokenAmount ?? qi.tokenAmount ?? 0) / Math.pow(10, d);
            }
          }
        } else if (nonQuoteIn) {
          direction = "sell";
          tokenMint = nonQuoteIn.mint;
          const dec = nonQuoteIn.rawTokenAmount?.decimals ?? 0;
          const raw = nonQuoteIn.rawTokenAmount?.tokenAmount ?? nonQuoteIn.tokenAmount ?? 0;
          tokenAmount = Number(raw) / Math.pow(10, dec);

          if (nativeOutput?.amount) {
            quoteMint = WSOL;
            quoteAmount = Number(nativeOutput.amount) / 1e9;
          } else {
            const qo = tokenOutputs.find((t: any) => t?.mint && isQuote(t.mint));
            if (qo) {
              quoteMint = qo.mint;
              const d = qo.rawTokenAmount?.decimals ?? 6;
              quoteAmount = Number(qo.rawTokenAmount?.tokenAmount ?? qo.tokenAmount ?? 0) / Math.pow(10, d);
            }
          }
        }

        if (direction === "unknown" || !tokenMint) continue;

        swaps.push({
          signature: tx.signature,
          timestamp: tx.timestamp ?? 0,
          source: tx.source || "unknown",
          direction,
          tokenMint,
          tokenAmount,
          quoteMint,
          quoteSymbol: classifyQuote(quoteMint),
          quoteAmount,
          priorityFeeSol,
        });

        if (swaps.length >= limit) break;
      }
      if (swaps.length >= limit) break;
      before = txs[txs.length - 1]?.signature;
      if (!before) break;
    }

    swaps.sort((a, b) => b.timestamp - a.timestamp);
    const uniqueTokens = new Set(swaps.map((s) => s.tokenMint)).size;

    const result: WalletActivity = {
      address,
      swaps,
      scannedTxs: scanned,
      buyCount: swaps.filter((s) => s.direction === "buy").length,
      sellCount: swaps.filter((s) => s.direction === "sell").length,
      uniqueTokens,
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(address, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (e) {
    return {
      address,
      swaps: [],
      scannedTxs: 0,
      buyCount: 0,
      sellCount: 0,
      uniqueTokens: 0,
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "failed",
    };
  }
}
