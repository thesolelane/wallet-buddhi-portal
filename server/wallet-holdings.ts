const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC =
  process.env.HELIUS_RPC_URL ||
  (process.env.SOLANA_NETWORK === "devnet"
    ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_KEY}`
    : `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`);

const FUNGIBLE = new Set(["FungibleToken", "FungibleAsset"]);

export interface WalletHolding {
  mint: string;
  amount: number;
  symbol: string | null;
  name: string | null;
  image: string | null;
}

export interface WalletHoldingsResult {
  address: string;
  holdings: WalletHolding[];
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

const cache = new Map<string, { result: WalletHoldingsResult; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

function tokenAmount(item: any): number {
  const info = item.token_info || {};
  if (typeof info.ui_amount === "number") return info.ui_amount;
  if (typeof info.uiAmount === "number") return info.uiAmount;
  const decimals = Number(info.decimals ?? 0);
  const raw = Number(info.balance ?? info.amount ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return decimals > 0 ? raw / Math.pow(10, decimals) : raw;
}

export async function getWalletHoldings(address: string): Promise<WalletHoldingsResult> {
  const hit = cache.get(address);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  if (!HELIUS_KEY) {
    return {
      address,
      holdings: [],
      fetchedAt: Date.now(),
      ok: false,
      reason: "Holdings need a Helius key",
    };
  }

  try {
    const holdings: WalletHolding[] = [];
    let page = 1;
    const maxPages = 4;

    while (page <= maxPages) {
      const res = await fetch(HELIUS_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "holdings",
          method: "searchAssets",
          params: {
            ownerAddress: address,
            tokenType: "fungible",
            page,
            limit: 100,
            displayOptions: {
              showFungible: true,
              showZeroBalance: false,
              showNativeBalance: false,
            },
          },
        }),
      });
      if (!res.ok) throw new Error(`Helius DAS HTTP ${res.status}`);
      const body = await res.json();
      if (body.error) throw new Error(body.error.message || "DAS error");
      const items = body.result?.items || [];
      if (items.length === 0) break;

      for (const item of items) {
        const interfaceType = String(item.interface || "");
        if (!FUNGIBLE.has(interfaceType) && !interfaceType.toLowerCase().includes("fungible")) {
          continue;
        }
        const mint = item.id || item.token_info?.mint;
        if (!mint) continue;
        const amount = tokenAmount(item);
        if (!amount || amount <= 0) continue;
        holdings.push({
          mint,
          amount,
          symbol: item.content?.metadata?.symbol || item.token_info?.symbol || null,
          name: item.content?.metadata?.name || item.token_info?.name || null,
          image: item.content?.links?.image || null,
        });
      }
      if (items.length < 100) break;
      page += 1;
    }

    holdings.sort((a, b) => b.amount - a.amount);
    const result: WalletHoldingsResult = {
      address,
      holdings: holdings.slice(0, 40),
      fetchedAt: Date.now(),
      ok: true,
    };
    cache.set(address, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (error) {
    return {
      address,
      holdings: [],
      fetchedAt: Date.now(),
      ok: false,
      reason: error instanceof Error ? error.message : "failed",
    };
  }
}
