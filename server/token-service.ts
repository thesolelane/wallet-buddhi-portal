// Token metadata service — Phase A
// Pulls from Helius DAS getAsset + DexScreener (free).
// No price data, no charts. State only.

const HELIUS_KEY = process.env.HELIUS_API_KEY;
const HELIUS_NETWORK = process.env.SOLANA_NETWORK === "devnet" ? "devnet" : "mainnet";
const HELIUS_RPC = `https://${HELIUS_NETWORK}.helius-rpc.com/?api-key=${HELIUS_KEY}`;

export interface TokenMetadata {
  ca: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  supply: string | null;
  image: string | null;
  description: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  mintAuthorityRenounced: boolean;
  freezeAuthorityRenounced: boolean;
  updateAuthority: string | null; // Metaplex update authority — often the deployer/dev
  creators: Array<{ address: string; share: number; verified: boolean }>;
  socials: {
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
  };
  pair: {
    dex: string | null;
    pairAddress: string | null;
    quoteSymbol: string | null;
    liquidityUsd: number | null;
    fdv: number | null;
    marketCap: number | null;
    pairCreatedAt: number | null; // unix ms
  } | null;
  fetchedAt: number;
  source: {
    helius: boolean;
    dexscreener: boolean;
  };
}

async function fetchHeliusAsset(ca: string) {
  if (!HELIUS_KEY) {
    return { data: null, ok: false, reason: "HELIUS_API_KEY not set" };
  }
  try {
    const res = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "wb-portal-getAsset",
        method: "getAsset",
        params: { id: ca },
      }),
    });
    if (!res.ok) {
      return { data: null, ok: false, reason: `Helius HTTP ${res.status}` };
    }
    const json = await res.json();
    if (json.error) {
      return { data: null, ok: false, reason: `Helius: ${json.error.message}` };
    }
    return { data: json.result, ok: true };
  } catch (e) {
    return { data: null, ok: false, reason: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function fetchDexScreener(ca: string) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    if (!res.ok) {
      return { data: null, ok: false, reason: `DexScreener HTTP ${res.status}` };
    }
    const json = await res.json();
    return { data: json, ok: true };
  } catch (e) {
    return { data: null, ok: false, reason: e instanceof Error ? e.message : "fetch failed" };
  }
}

function pickBestPair(pairs: any[] | undefined) {
  if (!pairs || pairs.length === 0) return null;
  // Prefer highest-liquidity pair
  const sorted = [...pairs].sort((a, b) => {
    const la = a?.liquidity?.usd ?? 0;
    const lb = b?.liquidity?.usd ?? 0;
    return lb - la;
  });
  return sorted[0];
}

export async function getTokenMetadata(ca: string): Promise<TokenMetadata> {
  const [helius, dex] = await Promise.all([fetchHeliusAsset(ca), fetchDexScreener(ca)]);

  const h = helius.data;
  const hContent = h?.content;
  const hMeta = hContent?.metadata;
  const hToken = h?.token_info;
  const hAuth = h?.authorities;
  const hLinks = hContent?.links;

  const mintAuth = hToken?.mint_authority ?? null;
  const freezeAuth = hToken?.freeze_authority ?? null;

  // Update authority — first entry in authorities[] with scopes including "full"
  // or just the first one (Metaplex convention).
  const authList = Array.isArray(hAuth) ? hAuth : [];
  const updateAuth =
    authList.find((a: any) => Array.isArray(a?.scopes) && a.scopes.includes("full"))?.address ??
    authList[0]?.address ??
    null;

  const creators = Array.isArray(h?.creators)
    ? h.creators.map((c: any) => ({
        address: c.address,
        share: c.share ?? 0,
        verified: !!c.verified,
      }))
    : [];

  const pair = pickBestPair(dex.data?.pairs);
  const dexInfo = pair?.info;

  // Socials: prefer DexScreener (more reliable for memecoins), fall back to on-chain JSON
  const socials = {
    website: dexInfo?.websites?.[0]?.url ?? hLinks?.external_url ?? null,
    twitter:
      dexInfo?.socials?.find((s: any) => s.type === "twitter")?.url ??
      hLinks?.twitter ??
      null,
    telegram:
      dexInfo?.socials?.find((s: any) => s.type === "telegram")?.url ??
      hLinks?.telegram ??
      null,
    discord:
      dexInfo?.socials?.find((s: any) => s.type === "discord")?.url ?? null,
  };

  return {
    ca,
    name: hMeta?.name ?? pair?.baseToken?.name ?? null,
    symbol: hMeta?.symbol ?? pair?.baseToken?.symbol ?? null,
    decimals: hToken?.decimals ?? null,
    supply: hToken?.supply ?? null,
    image: hContent?.files?.[0]?.uri ?? hContent?.links?.image ?? dexInfo?.imageUrl ?? null,
    description: hMeta?.description ?? null,
    mintAuthority: mintAuth,
    freezeAuthority: freezeAuth,
    mintAuthorityRenounced: mintAuth === null,
    freezeAuthorityRenounced: freezeAuth === null,
    updateAuthority: updateAuth,
    creators,
    socials,
    pair: pair
      ? {
          dex: pair.dexId ?? null,
          pairAddress: pair.pairAddress ?? null,
          quoteSymbol: pair.quoteToken?.symbol ?? null,
          liquidityUsd: pair.liquidity?.usd ?? null,
          fdv: pair.fdv ?? null,
          marketCap: pair.marketCap ?? null,
          pairCreatedAt: pair.pairCreatedAt ?? null,
        }
      : null,
    fetchedAt: Date.now(),
    source: {
      helius: helius.ok,
      dexscreener: dex.ok,
    },
  };
}
