// Watchlist — localStorage-backed list of tokens AND wallets the user cares about.
// No server persistence in this phase; survives page reload but is per-device.

const KEY = "wbuddhi.watchlist.v1";
const WALLET_KEY = "wbuddhi.watchlist-wallets.v1";

export interface WatchEntry {
  ca: string;
  addedAt: number;
  note?: string;
}

export interface WatchWalletEntry {
  address: string;
  addedAt: number;
  label?: string; // user-defined (e.g. "smart money")
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

// --- Wallet watchlist ---

function safeReadWallets(): WatchWalletEntry[] {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteWallets(list: WatchWalletEntry[]) {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getWalletWatchlist(): WatchWalletEntry[] {
  return safeReadWallets();
}

export function isWalletWatched(address: string): boolean {
  return safeReadWallets().some((w) => w.address === address);
}

export function addWalletToWatchlist(address: string, label?: string) {
  const list = safeReadWallets();
  if (list.some((w) => w.address === address)) return;
  list.unshift({ address, addedAt: Date.now(), label });
  safeWriteWallets(list);
  window.dispatchEvent(new Event("wbuddhi:watchlist-changed"));
}

export function removeWalletFromWatchlist(address: string) {
  const list = safeReadWallets().filter((w) => w.address !== address);
  safeWriteWallets(list);
  window.dispatchEvent(new Event("wbuddhi:watchlist-changed"));
}
