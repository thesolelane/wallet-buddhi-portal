// Token copycat detection — identifies tokens that IMPERSONATE a protected
// token by comparing normalized name/symbol/handle against the protected list.
//
// Detects obfuscation tactics like:
//   - case / whitespace variation          $CATH vs cath
//   - punctuation insertion                $C.A.T.H, $C_A_T_H
//   - homoglyph substitution (cyrillic)    $САТН  (С=U+0421, А=U+0410, Т=U+0422)
//   - greek / math lookalike chars         $CΛTH  (Λ=U+039B ≈ A)
//   - zero-width characters                $CA​TH  (U+200B between A and T)
//   - doubled letters                      $CATTH, $CAATH
//   - similar Twitter handles
//   - same website domain
//   - CA vanity prefix collision           (weak signal)
//
// For each potential copycat, returns a match list with reasons so the UI
// can explain why the token looks like an impersonator.

import { getTokenMetadata } from "./token-service";
import { listProtectedTokens, type ProtectedToken } from "./protected-tokens";

export type MatchKind =
  | "exactNormalizedName"
  | "exactNormalizedSymbol"
  | "fuzzyName"
  | "fuzzySymbol"
  | "sameTwitter"
  | "sameWebsite"
  | "caPrefixMatch";

export interface IdentityMatch {
  protectedToken: ProtectedToken;
  kinds: MatchKind[];
  score: number; // weighted confidence 0..100
  note: string; // human-readable summary of the strongest signal
}

export interface IdentityCheckResult {
  ca: string;
  name: string;
  symbol: string;
  twitterHandle: string | null;
  websiteDomain: string | null;
  isSelf: boolean; // true if the current token IS a protected token (safe)
  matches: IdentityMatch[]; // strongest matches first
  highestScore: number;
  fetchedAt: number;
  ok: boolean;
  reason?: string;
}

// Homoglyph map — every key character normalizes to the latin value.
// Covers common cyrillic, greek, math, fullwidth, and smallcaps substitutions.
const HOMOGLYPHS: Record<string, string> = {
  // Cyrillic
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "А": "A", "В": "B", "Е": "E", "Н": "H", "К": "K", "М": "M", "О": "O",
  "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X", "І": "I", "і": "i",
  // Greek
  "α": "a", "ο": "o", "ρ": "p", "Α": "A", "Β": "B", "Ε": "E", "Η": "H",
  "Ι": "I", "Κ": "K", "Λ": "A", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P",
  "Τ": "T", "Υ": "Y", "Χ": "X", "Ζ": "Z",
  // Fullwidth
  "Ａ": "A", "Ｂ": "B", "Ｃ": "C", "Ｄ": "D", "Ｅ": "E", "Ｆ": "F",
  "ａ": "a", "ｂ": "b", "ｃ": "c", "ｄ": "d", "ｅ": "e", "ｆ": "f",
  // Math alphanumerics (sample — common ones)
  "𝐀": "A", "𝐂": "C", "𝐓": "T", "𝐇": "H",
  "𝒶": "a", "𝒸": "c", "𝓉": "t", "𝒽": "h",
};

// Zero-width and invisible characters
const INVISIBLE_RE = /[\u200B-\u200D\u200E\u200F\uFEFF\u061C\u202A-\u202E\u2060-\u2069]/g;

function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  // Strip invisible chars, apply homoglyph map, lowercase, strip non-alphanumeric
  let out = s.replace(INVISIBLE_RE, "");
  out = Array.from(out).map((ch) => HOMOGLYPHS[ch] ?? ch).join("");
  out = out.toLowerCase();
  out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // strip combining marks
  out = out.replace(/[^a-z0-9]/g, ""); // drop everything non-alphanumeric
  return out;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0);
  const curr = new Array(b.length + 1).fill(0);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function extractHandle(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:twitter\.com|x\.com)\/(@?[A-Za-z0-9_]{1,15})/i);
  return m ? m[1].replace(/^@/, "").toLowerCase() : null;
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export async function checkTokenIdentity(ca: string): Promise<IdentityCheckResult> {
  try {
    const protectedList = listProtectedTokens();
    if (protectedList.length === 0) {
      return {
        ca,
        name: "",
        symbol: "",
        twitterHandle: null,
        websiteDomain: null,
        isSelf: false,
        matches: [],
        highestScore: 0,
        fetchedAt: Date.now(),
        ok: true,
      };
    }

    const meta = await getTokenMetadata(ca);
    const name = meta.name ?? "";
    const symbol = meta.symbol ?? "";
    const twitterHandle = extractHandle(meta.socials.twitter);
    const websiteDomain = extractDomain(meta.socials.website);

    const normName = normalizeText(name);
    const normSymbol = normalizeText(symbol);

    // If this very CA is already in the protected list, it's self (safe)
    const isSelf = protectedList.some((p) => p.ca === ca);

    const matches: IdentityMatch[] = [];
    for (const p of protectedList) {
      if (p.ca === ca) continue; // skip self

      const kinds: MatchKind[] = [];
      const notes: string[] = [];
      let score = 0;

      const pNormName = normalizeText(p.name);
      const pNormSymbol = normalizeText(p.symbol);

      // Name matches
      if (normName && pNormName && normName === pNormName) {
        kinds.push("exactNormalizedName");
        notes.push(`Same normalized name "${p.name}"`);
        score += 55;
      } else if (normName && pNormName) {
        const d = levenshtein(normName, pNormName);
        if (d > 0 && d <= 2 && pNormName.length >= 3) {
          kinds.push("fuzzyName");
          notes.push(`Name ${d} chars off from "${p.name}"`);
          score += 30;
        }
      }

      // Symbol matches
      if (normSymbol && pNormSymbol && normSymbol === pNormSymbol) {
        kinds.push("exactNormalizedSymbol");
        notes.push(`Same normalized symbol "$${p.symbol}"`);
        score += 50;
      } else if (normSymbol && pNormSymbol) {
        const d = levenshtein(normSymbol, pNormSymbol);
        if (d > 0 && d <= 1 && pNormSymbol.length >= 3) {
          kinds.push("fuzzySymbol");
          notes.push(`Symbol ${d} char off from "$${p.symbol}"`);
          score += 25;
        }
      }

      // Social handle match
      if (twitterHandle && p.twitterHandle && twitterHandle === p.twitterHandle) {
        kinds.push("sameTwitter");
        notes.push(`Uses the same Twitter handle @${p.twitterHandle}`);
        score += 20;
      }

      // Same website domain
      if (websiteDomain && p.websiteDomain && websiteDomain === p.websiteDomain) {
        kinds.push("sameWebsite");
        notes.push(`Points at the same website ${p.websiteDomain}`);
        score += 15;
      }

      // Weak: CA prefix collision (vanity attack)
      if (
        ca.slice(0, 4).toLowerCase() === p.ca.slice(0, 4).toLowerCase() &&
        ca !== p.ca
      ) {
        kinds.push("caPrefixMatch");
        notes.push(`CA vanity prefix matches ${p.ca.slice(0, 4)}…`);
        score += 5;
      }

      if (kinds.length > 0) {
        matches.push({
          protectedToken: p,
          kinds,
          score: Math.min(score, 100),
          note: notes.join(" · "),
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    return {
      ca,
      name,
      symbol,
      twitterHandle,
      websiteDomain,
      isSelf,
      matches,
      highestScore: matches[0]?.score ?? 0,
      fetchedAt: Date.now(),
      ok: true,
    };
  } catch (e) {
    return {
      ca,
      name: "",
      symbol: "",
      twitterHandle: null,
      websiteDomain: null,
      isSelf: false,
      matches: [],
      highestScore: 0,
      fetchedAt: Date.now(),
      ok: false,
      reason: e instanceof Error ? e.message : "identity check failed",
    };
  }
}
