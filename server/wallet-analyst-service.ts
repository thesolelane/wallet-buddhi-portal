// Wallet AI Analyst — sends wallet signals to local Ollama for verdict.
// Mirrors token analyst-service but focused on trader behavior.

import { ollamaProvider } from "./llm/ollama-client";
import { getWalletActivity } from "./wallet-service";
import { analyzeCopycat } from "./copycat-detector";

export interface WalletAnalystReport {
  wallet: string;
  model: string;
  verdict: string;
  latencyMs: number;
  signals: any;
  ok: boolean;
  reason?: string;
  fetchedAt: number;
}

const SYSTEM_PROMPT = `You are a Solana on-chain wallet analyst. You do NOT predict prices or give trade advice.
You analyze a wallet's BEHAVIOR from on-chain state only.

Given a JSON block of signals, respond with:
1. A one-line headline (≤ 12 words) describing this wallet's style.
2. Three short bullet points covering: trading pattern, copycat status, funding source.
3. One "Risk note" line if the wallet is a copycat, has a flagged funder, or shows predatory patterns. Omit if clean.

Keep under 120 words. No filler. No price talk.`;

export async function runWalletAnalyst(
  wallet: string,
  model = "llama3.1:8b",
): Promise<WalletAnalystReport> {
  const started = Date.now();
  try {
    const [activity, copycat] = await Promise.all([
      getWalletActivity(wallet, 100),
      analyzeCopycat(wallet),
    ]);

    // Roll up per-token PNL in SOL
    const tokenStats = new Map<
      string,
      { buys: number; sells: number; solIn: number; solOut: number }
    >();
    for (const s of activity.swaps) {
      if (s.quoteSymbol !== "SOL") continue;
      const row = tokenStats.get(s.tokenMint) ?? { buys: 0, sells: 0, solIn: 0, solOut: 0 };
      if (s.direction === "buy") {
        row.buys += 1;
        row.solIn += s.quoteAmount;
      } else if (s.direction === "sell") {
        row.sells += 1;
        row.solOut += s.quoteAmount;
      }
      tokenStats.set(s.tokenMint, row);
    }
    const realized = Array.from(tokenStats.values()).reduce(
      (sum, r) => sum + (r.solOut - r.solIn),
      0,
    );
    const winners = Array.from(tokenStats.values()).filter((r) => r.solOut - r.solIn > 0.001).length;
    const losers = Array.from(tokenStats.values()).filter((r) => r.solOut - r.solIn < -0.001).length;

    const signals = {
      activity: {
        swaps: activity.swaps.length,
        buys: activity.buyCount,
        sells: activity.sellCount,
        uniqueTokens: activity.uniqueTokens,
        scanned: activity.scannedTxs,
      },
      pnl: {
        estimatedRealizedSol: Number(realized.toFixed(3)),
        tokensInProfit: winners,
        tokensInLoss: losers,
      },
      copycat: {
        isCopycat: copycat.isCopycat,
        leadersDetected: copycat.leaders.length,
        topLeader: copycat.leaders[0]
          ? {
              wallet: copycat.leaders[0].leader.slice(0, 8) + "…",
              sharedTokens: copycat.leaders[0].sharedTokens,
              avgLagSec: Math.round(copycat.leaders[0].avgLagSec),
            }
          : null,
      },
      funder: copycat.funder.funder
        ? {
            address: copycat.funder.funder.slice(0, 8) + "…",
            cexDeposit: copycat.funder.knownAsCexDeposit,
            flagged: copycat.funderReport?.flagged ?? false,
            copycatCount: copycat.funderReport?.copycatCount ?? 0,
          }
        : { status: "no incoming native transfer found" },
    };

    const resp = await ollamaProvider.complete({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Wallet signals:\n\`\`\`json\n${JSON.stringify(signals, null, 2)}\n\`\`\``,
        },
      ],
      temperature: 0.2,
      maxTokens: 500,
    });

    return {
      wallet,
      model,
      verdict: resp.content,
      latencyMs: Date.now() - started,
      signals,
      ok: true,
      fetchedAt: Date.now(),
    };
  } catch (e) {
    return {
      wallet,
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
