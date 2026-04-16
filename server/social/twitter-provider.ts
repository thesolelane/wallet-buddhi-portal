// Twitter provider — Phase F
// Targets twitterapi.io-compatible endpoints. Returns { configured: false }
// when no API key is set, so the UI can display "Configure X_API_KEY to enable".

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
// twitterapi.io is the documented default; can be swapped via env
const TWITTER_API_BASE = process.env.TWITTER_API_BASE || "https://api.twitterapi.io";

export interface TwitterAccountMetrics {
  handle: string;
  verified: boolean;
  followers: number;
  following: number;
  tweetCount: number;
  accountCreatedAt: number; // unix ms
  accountAgeDays: number;
  mentionsLast24h: number | null;
  engagementLast24h: number | null; // sum of likes + retweets
}

export interface TwitterResult {
  configured: boolean;
  ok: boolean;
  handle: string | null;
  metrics: TwitterAccountMetrics | null;
  reason?: string;
}

function extractHandle(url: string | null): string | null {
  if (!url) return null;
  // Handles https://twitter.com/xxx, https://x.com/xxx, @xxx, or raw xxx
  const match = url.match(/(?:twitter\.com|x\.com)\/(@?[A-Za-z0-9_]{1,15})/i);
  if (match) return match[1].replace(/^@/, "");
  const bare = url.match(/^@?([A-Za-z0-9_]{1,15})$/);
  return bare ? bare[1] : null;
}

export async function fetchTwitterMetrics(twitterUrl: string | null): Promise<TwitterResult> {
  const handle = extractHandle(twitterUrl);
  if (!handle) {
    return { configured: !!TWITTER_API_KEY, ok: false, handle: null, metrics: null, reason: "No Twitter handle on token" };
  }
  if (!TWITTER_API_KEY) {
    return {
      configured: false,
      ok: false,
      handle,
      metrics: null,
      reason: "TWITTER_API_KEY not set",
    };
  }
  try {
    // twitterapi.io convention: /twitter/user/info?userName={handle}
    const url = new URL(`${TWITTER_API_BASE}/twitter/user/info`);
    url.searchParams.set("userName", handle);
    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": TWITTER_API_KEY },
    });
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        handle,
        metrics: null,
        reason: `Twitter API HTTP ${res.status}`,
      };
    }
    const body: any = await res.json();
    const u = body?.data ?? body;
    const created = Date.parse(u?.createdAt ?? u?.created_at ?? "") || 0;
    const metrics: TwitterAccountMetrics = {
      handle,
      verified: !!u?.verified,
      followers: Number(u?.followers ?? u?.followers_count ?? 0),
      following: Number(u?.following ?? u?.friends_count ?? 0),
      tweetCount: Number(u?.statusesCount ?? u?.statuses_count ?? 0),
      accountCreatedAt: created,
      accountAgeDays: created ? Math.floor((Date.now() - created) / 86400000) : 0,
      mentionsLast24h: null, // requires search endpoint — Phase F.2
      engagementLast24h: null,
    };
    return { configured: true, ok: true, handle, metrics };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      handle,
      metrics: null,
      reason: e instanceof Error ? e.message : "twitter fetch failed",
    };
  }
}
