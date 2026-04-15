// Holders service — Phase B.1 (read-only slice, no DB)
// Pulls token accounts via Helius DAS getTokenAccounts, sorts by balance,
// returns top N with percentage of circulating supply.

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_RPC = `https://${HELIUS_NETWORK}.helius-rpc.com/?api-key=${HELIUS_KEY}`;

export interface Holder {
  rank: number;
  owner: string;
  amount: string; // raw (pre-decimals)
  uiAmount: number;
  pctOfSupply: number | null;
}

export interface HoldersResult {
  ca: string;
  decimals: number | null;
  supply: string | null;
  totalAccountsScanned: number;
  holders: Holder[];
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

async function rpc(body: any) {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY not set");
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Helius HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`Helius: ${json.error.message}`);
  return json.result;
}

async function fetchTokenInfo(ca: string) {
  const result = await rpc({
    jsonrpc: "2.0",
    id: "wb-getAsset",
    method: "getAsset",
    params: { id: ca },
  });
  return {
    decimals: result?.token_info?.decimals ?? null,
    supply: result?.token_info?.supply ?? null,
  };
}

async function fetchAllTokenAccounts(ca: string, maxPages = 10) {
  // Helius DAS getTokenAccounts — paginated
  const all: Array<{ owner: string; amount: string }> = [];
  let page = 1;
  for (; page <= maxPages; page++) {
    const result: any = await rpc({
      jsonrpc: "2.0",
      id: `wb-getTokenAccounts-${page}`,
      method: "getTokenAccounts",
      params: { mint: ca, page, limit: 1000 },
    });
    const accs = result?.token_accounts ?? [];
    for (const a of accs) {
      if (a?.owner && a?.amount) all.push({ owner: a.owner, amount: String(a.amount) });
    }
    if (accs.length < 1000) break;
  }
  return all;
}

export async function getTopHolders(ca: string, topN = 50): Promise<HoldersResult> {
  try {
    const [tokenInfo, accounts] = await Promise.all([
      fetchTokenInfo(ca),
      fetchAllTokenAccounts(ca),
    ]);

    const decimals = tokenInfo.decimals ?? 0;
    const supplyStr = tokenInfo.supply;
    let supplyBig: bigint | null = null;
    try {
      if (supplyStr) supplyBig = BigInt(supplyStr);
    } catch {
      supplyBig = null;
    }

    // Aggregate by owner (some owners have multiple token accounts)
    const byOwner = new Map<string, bigint>();
    for (const a of accounts) {
      try {
        const cur = byOwner.get(a.owner) ?? BigInt(0);
        byOwner.set(a.owner, cur + BigInt(a.amount));
      } catch {
        // skip malformed
      }
    }

    const sorted = Array.from(byOwner.entries()).sort((a, b) =>
      b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0,
    );

    let divisor = BigInt(1);
    for (let i = 0; i < decimals; i++) divisor *= BigInt(10);

    const top = sorted.slice(0, topN).map(([owner, amt], i): Holder => {
      const uiAmount = Number(amt) / Number(divisor || BigInt(1));
      let pct: number | null = null;
      if (supplyBig && supplyBig > BigInt(0)) {
        // pct as (amt * 10000 / supply) / 100 for 2 decimal precision
        const bp = Number((amt * BigInt(10_000)) / supplyBig);
        pct = bp / 100;
      }
      return {
        rank: i + 1,
        owner,
        amount: amt.toString(),
        uiAmount,
        pctOfSupply: pct,
      };
    });

    return {
      ca,
      decimals,
      supply: supplyStr,
      totalAccountsScanned: accounts.length,
      holders: top,
      fetchedAt: Date.now(),
      ok: true,
    };
  } catch (e) {
    return {
      ca,
      decimals: null,
      supply: null,
      totalAccountsScanned: 0,
      holders: [],
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "failed",
    };
  }
}
