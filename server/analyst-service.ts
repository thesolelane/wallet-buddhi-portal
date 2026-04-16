// AI Analyst — Phase G application
// Packages all on-chain signals into a structured prompt and asks a local
// Ollama model for a plain-English verdict. No cloud calls, no PII leak.

import { ollamaProvider } from "./llm/ollama-client";
import { getTokenMetadata } from "./token-service";
import { getTopHolders } from "./holders-service";
import { getFirstBuyers, classifyCohort } from "./buyers-service";
import { detectBumpBots } from "./bump-detector";

export interface AnalystReport {
  ca: string;
  model: string;
  verdict: string;
  latencyMs: number;
  signals: any; // the JSON that went into the prompt, for transparency
  ok: boolean;
  reason?: string;
  fetchedAt: number;
}

const SYSTEM_PROMPT = `You are a conservative Solana on-chain analyst. You do NOT give price predictions.
You do NOT give buy/sell recommendations.
You analyze on-chain STATE only — authority status, holder concentration, cohort retention, sniper activity, bump-bot activity, dev wallet behavior.

Given a JSON block of signals, respond with:
1. A one-line headline (≤ 12 words) describing the token's current state.
2. Three short bullet points of the most important observations.
3. One "Risk note" line if anything is concerning. Omit it if everything looks clean.

Do NOT discuss price, market cap trend, mcap, FDV, or anything directional.
Focus on: who is holding, who bought in early, whether volume looks organic, whether the dev is still present.
Keep total response under 120 words. No filler.`;

export async function runAnalyst(ca: string, model = "llama3.1:8b"): Promise<AnalystReport> {
  const started = Date.now();
  try {
    // Gather signals in parallel (all already cached by their services)
    const [meta, holders, buyersRaw, bump] = await Promise.all([
      getTokenMetadata(ca),
      getTopHolders(ca, 50),
      getFirstBuyers(ca, 200),
      detectBumpBots(ca),
    ]);

    const holderSet = new Set(holders.holders.map((h) => h.owner));
    const cohort = classifyCohort(buyersRaw.buyers, holderSet);
    const top10 = holders.holders.slice(0, 10);
    const top10Pct = top10.reduce((s, h) => s + (h.pctOfSupply ?? 0), 0);
    const devHolder = meta.updateAuthority
      ? holders.holders.find((h) => h.owner === meta.updateAuthority)
      : undefined;

    const signals = {
      token: {
        name: meta.name,
        symbol: meta.symbol,
        pairAgeDays:
          meta.pair?.pairCreatedAt
            ? Math.floor((Date.now() - meta.pair.pairCreatedAt) / 86400000)
            : null,
        liquidityUsd: meta.pair?.liquidityUsd ?? null,
      },
      authorities: {
        mintRenounced: meta.mintAuthorityRenounced,
        freezeRenounced: meta.freezeAuthorityRenounced,
        updateAuthority: meta.updateAuthority,
      },
      holders: {
        totalAccountsScanned: holders.totalAccountsScanned,
        top10ConcentrationPct: Number(top10Pct.toFixed(1)),
        top3: top10.slice(0, 3).map((h) => ({
          wallet: h.owner.slice(0, 8) + "…",
          pctOfSupply: h.pctOfSupply,
        })),
      },
      cohort: {
        totalFirstBuyers: cohort.length,
        stillHolding: cohort.filter((c) => c.state === "holding").length,
        exited: cohort.filter((c) => c.state === "exited").length,
        snipers: cohort.filter((c) => c.isSniper).length,
        snipersStillHolding: cohort.filter((c) => c.isSniper && c.state === "holding").length,
        totalJitoTipsSol: Number(
          cohort.reduce((s, c) => s + c.jitoTipSol, 0).toFixed(3),
        ),
      },
      devWallet: devHolder
        ? {
            address: devHolder.owner.slice(0, 8) + "…",
            pctOfSupplyHeld: devHolder.pctOfSupply,
          }
        : meta.updateAuthority
          ? { status: "not in top holders — appears to have exited" }
          : { status: "no update authority recorded" },
      bumpBots: {
        suspectCount: bump.suspectWallets.length,
        estimatedFeesBurnedSol: Number(bump.totalFeesBurnedSol.toFixed(3)),
        activeLast24h: bump.activeLast24h,
      },
    };

    const resp = await ollamaProvider.complete({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Signals:\n\`\`\`json\n${JSON.stringify(signals, null, 2)}\n\`\`\``,
        },
      ],
      temperature: 0.2,
      maxTokens: 500,
    });

    return {
      ca,
      model,
      verdict: resp.content,
      latencyMs: Date.now() - started,
      signals,
      ok: true,
      fetchedAt: Date.now(),
    };
  } catch (e) {
    return {
      ca,
      model,
      verdict: "",
      latencyMs: Date.now() - started,
      signals: null,
      ok: false,
      reason: e instanceof Error ? e.message : "failed",
      fetchedAt: Date.now(),
    };
  }
}
