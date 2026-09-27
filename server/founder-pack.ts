import { getTokenMetadata } from "./token-service";
import { getTopHolders } from "./holders-service";
import { getRugCheckSummary } from "./rugcheck-service";

export async function getFounderPack(ca: string) {
  const [meta, holders, rug] = await Promise.all([
    getTokenMetadata(ca),
    getTopHolders(ca, 10),
    getRugCheckSummary(ca),
  ]);
  const top = holders.holders || [];
  const top10Pct =
    rug.topHoldersPct ??
    top.reduce((s, h) => s + (h.pctOfSupply ?? 0), 0);
  const liq = meta.pair?.liquidityUsd ?? null;
  const mcap = meta.pair?.marketCap ?? meta.pair?.fdv ?? null;
  const liqMc = liq != null && mcap && mcap > 0 ? liq / mcap : null;
  const flags: string[] = [];
  if (!meta.mintAuthorityRenounced) flags.push("Mint authority still live — supply can be printed.");
  if (!meta.freezeAuthorityRenounced) flags.push("Freeze authority still live — wallets can be frozen.");
  if (top10Pct >= 30) flags.push(`Top holders concentrate ${top10Pct.toFixed(1)}% of supply.`);
  if (rug.lpLocked === false) flags.push("LP does not look locked on RugCheck.");
  if (rug.lpLocked === true) flags.push(rug.lpLockedPct != null ? `RugCheck: LP locked ~${rug.lpLockedPct.toFixed(0)}%.` : "RugCheck: LP marked locked.");
  if (liqMc != null && liqMc < 0.1) flags.push(`Liquidity is ${(liqMc * 100).toFixed(1)}% of market cap — thin book.`);
  if (!meta.pair) flags.push("No DexScreener pair on this inspect.");
  if (flags.length === 0) flags.push("No automatic red flags from mint/freeze, top-10, LP lock, or liq/MC.");

  return {
    ca,
    skill: "founder-pack",
    authorities: {
      mintRenounced: meta.mintAuthorityRenounced,
      freezeRenounced: meta.freezeAuthorityRenounced,
      updateAuthority: meta.updateAuthority,
    },
    holders: {
      top10Pct: Number(top10Pct.toFixed(2)),
      scanned: holders.totalAccountsScanned,
    },
    liquidity: {
      liquidityUsd: liq,
      marketCapUsd: mcap,
      liqToMcap: liqMc,
      lpLocked: rug.lpLocked,
      lpLockedPct: rug.lpLockedPct,
    },
    rugcheck: {
      ok: rug.ok,
      score: rug.score,
      riskLevel: rug.riskLevel,
      risks: rug.risks,
      reason: rug.reason,
    },
    flags,
    ok: true,
    fetchedAt: Date.now(),
  };
}
