const RUGCHECK_BASE = "https://api.rugcheck.xyz/v1/tokens";

export interface RugCheckSummary {
  mint: string;
  score: number | null;
  riskLevel: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  lpLocked: boolean | null;
  lpLockedPct: number | null;
  topHoldersPct: number | null;
  risks: Array<{ name?: string; level?: string; description?: string }>;
  ok: boolean;
  reason?: string;
  fetchedAt: number;
}

const cache = new Map<string, { result: RugCheckSummary; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getRugCheckSummary(mint: string): Promise<RugCheckSummary> {
  const hit = cache.get(mint);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  try {
    const res = await fetch(`${RUGCHECK_BASE}/${mint}/report/summary`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`RugCheck HTTP ${res.status}`);
    }
    const body = await res.json();
    const result: RugCheckSummary = {
      mint,
      score: typeof body.score === "number" ? body.score : null,
      riskLevel: body.riskLevel || body.risk_level || null,
      mintAuthority: body.mintAuthority ?? body.token?.mintAuthority ?? null,
      freezeAuthority: body.freezeAuthority ?? body.token?.freezeAuthority ?? null,
      lpLocked: typeof body.lpLocked === "boolean" ? body.lpLocked : null,
      lpLockedPct: typeof body.lpLockedPct === "number" ? body.lpLockedPct : null,
      topHoldersPct: typeof body.topHoldersPct === "number" ? body.topHoldersPct : null,
      risks: Array.isArray(body.risks) ? body.risks.slice(0, 8) : [],
      ok: true,
      fetchedAt: Date.now(),
    };
    cache.set(mint, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (error) {
    return {
      mint,
      score: null,
      riskLevel: null,
      mintAuthority: null,
      freezeAuthority: null,
      lpLocked: null,
      lpLockedPct: null,
      topHoldersPct: null,
      risks: [],
      ok: false,
      reason: error instanceof Error ? error.message : "failed",
      fetchedAt: Date.now(),
    };
  }
}
