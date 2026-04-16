// Protected tokens registry — the user's canonical "real" tokens.
// Any new token analyzed in the portal is compared against this list via the
// token-copycat-service. Session-scoped for now (persistence lands later).

import { getTokenMetadata } from "./token-service";

export interface ProtectedToken {
  ca: string;
  name: string;
  symbol: string;
  twitterHandle: string | null;
  websiteDomain: string | null;
  addedAt: number;
  note?: string;
}

const registry = new Map<string, ProtectedToken>();

function extractHandle(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:twitter\.com|x\.com)\/(@?[A-Za-z0-9_]{1,15})/i);
  if (m) return m[1].replace(/^@/, "").toLowerCase();
  return null;
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

export async function addProtectedToken(ca: string, note?: string): Promise<ProtectedToken> {
  const meta = await getTokenMetadata(ca);
  const entry: ProtectedToken = {
    ca,
    name: meta.name ?? ca,
    symbol: meta.symbol ?? "",
    twitterHandle: extractHandle(meta.socials.twitter),
    websiteDomain: extractDomain(meta.socials.website),
    addedAt: Date.now(),
    note,
  };
  registry.set(ca, entry);
  return entry;
}

export function removeProtectedToken(ca: string): boolean {
  return registry.delete(ca);
}

export function listProtectedTokens(): ProtectedToken[] {
  return Array.from(registry.values()).sort((a, b) => b.addedAt - a.addedAt);
}

export function getProtectedToken(ca: string): ProtectedToken | undefined {
  return registry.get(ca);
}
