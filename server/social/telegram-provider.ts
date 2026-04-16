// Telegram provider — Phase F
// Targets TGStat API for channel/group health metrics. Graceful degradation
// when no key is set.

const TGSTAT_API_KEY = process.env.TGSTAT_API_KEY;
const TGSTAT_BASE = "https://api.tgstat.ru";

export interface TelegramChannelMetrics {
  username: string;
  title: string | null;
  subscribers: number;
  channelAgeDays: number | null;
  avgPostReach: number | null;
  participantsCount: number | null;
}

export interface TelegramResult {
  configured: boolean;
  ok: boolean;
  username: string | null;
  metrics: TelegramChannelMetrics | null;
  reason?: string;
}

function extractTgUsername(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/t(?:elegram)?\.me\/(?:@)?([A-Za-z0-9_]{4,})/i);
  if (m) return m[1];
  const bare = url.match(/^@?([A-Za-z0-9_]{4,})$/);
  return bare ? bare[1] : null;
}

export async function fetchTelegramMetrics(telegramUrl: string | null): Promise<TelegramResult> {
  const username = extractTgUsername(telegramUrl);
  if (!username) {
    return {
      configured: !!TGSTAT_API_KEY,
      ok: false,
      username: null,
      metrics: null,
      reason: "No Telegram handle on token",
    };
  }
  if (!TGSTAT_API_KEY) {
    return {
      configured: false,
      ok: false,
      username,
      metrics: null,
      reason: "TGSTAT_API_KEY not set",
    };
  }
  try {
    const url = new URL(`${TGSTAT_BASE}/channels/get`);
    url.searchParams.set("token", TGSTAT_API_KEY);
    url.searchParams.set("channelId", `@${username}`);
    const res = await fetch(url.toString());
    if (!res.ok) {
      return {
        configured: true,
        ok: false,
        username,
        metrics: null,
        reason: `TGStat HTTP ${res.status}`,
      };
    }
    const body: any = await res.json();
    if (body?.status !== "ok") {
      return {
        configured: true,
        ok: false,
        username,
        metrics: null,
        reason: body?.error || "TGStat returned non-ok status",
      };
    }
    const c = body.response ?? {};
    const metrics: TelegramChannelMetrics = {
      username,
      title: c.title ?? null,
      subscribers: Number(c.participants_count ?? 0),
      channelAgeDays: null,
      avgPostReach: null,
      participantsCount: Number(c.participants_count ?? 0),
    };
    return { configured: true, ok: true, username, metrics };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      username,
      metrics: null,
      reason: e instanceof Error ? e.message : "telegram fetch failed",
    };
  }
}
