// Bad actor registry — tracks funder → [funded wallets] relationships.
// In-memory only for now; extend to DB when Phase B.3 lands.
//
// Usage:
//   recordFunding(funder, funded)   when a funder→funded funding link is detected
//   flagCopycat(wallet)             when a copycat is confirmed for a wallet
//   getRegistrySnapshot()           for monitoring / debug

export interface FunderEntry {
  funder: string;
  fundedWallets: Set<string>;
  copycatCount: number; // how many of their funded wallets are flagged copycats
  firstSeen: number;
  lastSeen: number;
}

export interface BadActorReport {
  funder: string;
  fundedCount: number;
  copycatCount: number;
  funded: string[]; // up to 25 most recent
  flagged: boolean; // true when copycatCount >= FLAG_THRESHOLD
}

const FLAG_THRESHOLD = 3; // funded ≥3 confirmed copycats = flagged

const funders = new Map<string, FunderEntry>();
const knownCopycats = new Set<string>();
// reverse index: wallet -> funder (most recent recorded)
const walletToFunder = new Map<string, string>();

export function recordFunding(funder: string, funded: string): void {
  if (!funder || !funded || funder === funded) return;
  const now = Date.now();
  let entry = funders.get(funder);
  if (!entry) {
    entry = {
      funder,
      fundedWallets: new Set(),
      copycatCount: 0,
      firstSeen: now,
      lastSeen: now,
    };
    funders.set(funder, entry);
  }
  if (!entry.fundedWallets.has(funded)) {
    entry.fundedWallets.add(funded);
    // If this funded wallet was already flagged as copycat, bump count
    if (knownCopycats.has(funded)) entry.copycatCount += 1;
  }
  entry.lastSeen = now;
  walletToFunder.set(funded, funder);
}

export function flagCopycat(wallet: string): void {
  if (!wallet) return;
  if (knownCopycats.has(wallet)) return;
  knownCopycats.add(wallet);
  // Bump funder's copycat count if we know who funded them
  const funder = walletToFunder.get(wallet);
  if (funder) {
    const entry = funders.get(funder);
    if (entry && entry.fundedWallets.has(wallet)) {
      entry.copycatCount += 1;
    }
  }
}

export function getFunderOf(wallet: string): string | null {
  return walletToFunder.get(wallet) ?? null;
}

export function getFunderReport(funder: string): BadActorReport | null {
  const entry = funders.get(funder);
  if (!entry) return null;
  return {
    funder,
    fundedCount: entry.fundedWallets.size,
    copycatCount: entry.copycatCount,
    funded: Array.from(entry.fundedWallets).slice(-25).reverse(),
    flagged: entry.copycatCount >= FLAG_THRESHOLD,
  };
}

export function getAllFlaggedActors(): BadActorReport[] {
  const out: BadActorReport[] = [];
  for (const entry of Array.from(funders.values())) {
    if (entry.copycatCount >= FLAG_THRESHOLD) {
      out.push({
        funder: entry.funder,
        fundedCount: entry.fundedWallets.size,
        copycatCount: entry.copycatCount,
        funded: Array.from(entry.fundedWallets).slice(-25).reverse(),
        flagged: true,
      });
    }
  }
  return out.sort((a, b) => b.copycatCount - a.copycatCount);
}

export function getRegistrySnapshot() {
  return {
    totalFunders: funders.size,
    totalCopycats: knownCopycats.size,
    flaggedFunders: Array.from(funders.values()).filter(
      (e) => e.copycatCount >= FLAG_THRESHOLD,
    ).length,
    flagThreshold: FLAG_THRESHOLD,
  };
}
