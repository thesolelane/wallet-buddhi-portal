// Watchlist — localStorage-backed list of token CAs the user cares about.
// No server persistence in this phase; survives page reload but is per-device.

const KEY = "wbuddhi.watchlist.v1";

export interface WatchEntry {
  ca: string;
  addedAt: number;
  note?: string;
}

function safeRead(): WatchEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(list: WatchEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota or disabled — swallow
  }
}

export function getWatchlist(): WatchEntry[] {
  return safeRead();
}

export function isWatched(ca: string): boolean {
  return safeRead().some((w) => w.ca === ca);
}

export function addToWatchlist(ca: string, note?: string) {
  const list = safeRead();
  if (list.some((w) => w.ca === ca)) return;
  list.unshift({ ca, addedAt: Date.now(), note });
  safeWrite(list);
  window.dispatchEvent(new Event("wbuddhi:watchlist-changed"));
}

export function removeFromWatchlist(ca: string) {
  const list = safeRead().filter((w) => w.ca !== ca);
  safeWrite(list);
  window.dispatchEvent(new Event("wbuddhi:watchlist-changed"));
}
