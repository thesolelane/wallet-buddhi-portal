const DEX = "https://api.dexscreener.com/latest/dex/tokens";

export type TokenQuote = {
  mint: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  holders: number | null;
};

export async function getTokenQuotes(mints: string[]): Promise<TokenQuote[]> {
  const unique = [...new Set(mints)].slice(0, 8);
  if (unique.length === 0) return [];
  const res = await fetch(`${DEX}/${unique.join(",")}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`DexScreener HTTP ${res.status}`);
  const body = await res.json();
  const pairs = Array.isArray(body?.pairs) ? body.pairs : [];
  const best = new Map<string, any>();
  for (const pair of pairs) {
    const mint = String(pair?.baseToken?.address || "");
    if (!mint) continue;
    const liq = Number(pair?.liquidity?.usd || 0);
    const prev = best.get(mint);
    if (!prev || liq > Number(prev?.liquidity?.usd || 0)) best.set(mint, pair);
  }
  return unique.map((mint) => {
    const pair = best.get(mint);
    const holders =
      typeof pair?.holders?.count === "number"
        ? pair.holders.count
        : typeof pair?.info?.holders === "number"
          ? pair.info.holders
          : null;
    return {
      mint,
      priceUsd: pair?.priceUsd != null ? Number(pair.priceUsd) : null,
      marketCapUsd: pair?.marketCap != null ? Number(pair.marketCap) : pair?.fdv != null ? Number(pair.fdv) : null,
      liquidityUsd: pair?.liquidity?.usd != null ? Number(pair.liquidity.usd) : null,
      holders,
    };
  });
}
