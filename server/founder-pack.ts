import { getTokenMetadata } from "./token-service";
import { getTopHolders } from "./holders-service";
import { getRugCheckSummary } from "./rugcheck-service";

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

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

  let confidence = 0;
  const present: string[] = [];
  const missing: string[] = ["first buyers", "launch cluster", "deployer history"];
  if (meta.mintAuthorityRenounced || meta.mintAuthority) {
    confidence += 15;
    present.push("mint authority");
  }
  if (meta.freezeAuthorityRenounced || meta.freezeAuthority) {
    confidence += 15;
    present.push("freeze authority");
  }
  if (top10Pct > 0) {
    confidence += 20;
    present.push("top10 %");
  }
  if (liq != null && mcap != null) {
    confidence += 20;
    present.push("liq/MC");
  } else missing.push("Dex pair");
  if (rug.ok) {
    confidence += 15;
    present.push("RugCheck");
  } else missing.push("RugCheck");
  if (rug.lpLocked != null) {
    confidence += 15;
    present.push("LP lock");
  } else missing.push("LP lock");

  let risk = 0;
  const flags: string[] = [];
  if (!meta.mintAuthorityRenounced) {
    risk += 25;
    flags.push("Mint authority still live — supply can be printed.");
  }
  if (!meta.freezeAuthorityRenounced) {
    risk += 20;
    flags.push("Freeze authority still live — wallets can be frozen.");
  }
  if (top10Pct >= 80) {
    risk += 25;
    flags.push(`Top holders concentrate ${top10Pct.toFixed(1)}% of supply.`);
  } else if (top10Pct >= 50) {
    risk += 15;
    flags.push(`Top holders concentrate ${top10Pct.toFixed(1)}% of supply.`);
  } else if (top10Pct >= 30) {
    risk += 8;
    flags.push(`Top holders concentrate ${top10Pct.toFixed(1)}% of supply.`);
  }
  if (rug.lpLocked === false) {
    risk += 15;
    flags.push("LP does not look locked on RugCheck.");
  }
  if (rug.lpLocked === true) {
    flags.push(rug.lpLockedPct != null ? `RugCheck: LP locked ~${rug.lpLockedPct.toFixed(0)}%.` : "RugCheck: LP marked locked.");
  }
  if (liqMc != null && liqMc < 0.05) {
    risk += 20;
    flags.push(`Liquidity is ${(liqMc * 100).toFixed(1)}% of market cap — very thin book.`);
  } else if (liqMc != null && liqMc < 0.1) {
    risk += 12;
    flags.push(`Liquidity is ${(liqMc * 100).toFixed(1)}% of market cap — thin book.`);
  }
  if (!meta.pair) flags.push("No DexScreener pair on this inspect.");
  if (flags.length === 0) flags.push("No automatic red flags from mint/freeze, top-10, LP lock, or liq/MC.");

  const riskScore = clamp(risk);
  const confidenceScore = clamp(confidence);
  const riskLabel = riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";
  const confidenceLabel = confidenceScore >= 70 ? "high" : confidenceScore >= 40 ? "medium" : "low";

  return {
    ca,
    skill: "founder-pack",
    riskScore,
    riskLabel,
    confidenceScore,
    confidenceLabel,
    present,
    missing,
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
