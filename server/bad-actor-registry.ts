import { eq } from "drizzle-orm";
import { db } from "./db";
import { badActorState } from "@shared/schema";

export interface FunderEntry {
  funder: string;
  fundedWallets: Set<string>;
  copycatCount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface BadActorReport {
  funder: string;
  fundedCount: number;
  copycatCount: number;
  funded: string[];
  flagged: boolean;
}

const FLAG_THRESHOLD = 3;
const STATE_ID = "default";

const funders = new Map<string, FunderEntry>();
const knownCopycats = new Set<string>();
const walletToFunder = new Map<string, string>();
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistState();
  }, 500);
}

async function persistState() {
  try {
    const payload = {
      funders: Array.from(funders.values()).map((e) => ({
        funder: e.funder,
        fundedWallets: Array.from(e.fundedWallets),
        copycatCount: e.copycatCount,
        firstSeen: e.firstSeen,
        lastSeen: e.lastSeen,
      })),
      copycats: Array.from(knownCopycats),
      walletToFunder: Array.from(walletToFunder.entries()),
    };
    await db
      .insert(badActorState)
      .values({ id: STATE_ID, payload, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: badActorState.id,
        set: { payload, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("Failed to persist bad-actor state:", error);
  }
}

export async function hydrateBadActorRegistry() {
  if (hydrated) return;
  hydrated = true;
  try {
    const rows = await db.select().from(badActorState).where(eq(badActorState.id, STATE_ID)).limit(1);
    const payload = rows[0]?.payload as
      | {
          funders?: Array<{
            funder: string;
            fundedWallets: string[];
            copycatCount: number;
            firstSeen: number;
            lastSeen: number;
          }>;
          copycats?: string[];
          walletToFunder?: [string, string][];
        }
      | undefined;
    if (!payload) return;
    for (const e of payload.funders || []) {
      funders.set(e.funder, {
        funder: e.funder,
        fundedWallets: new Set(e.fundedWallets || []),
        copycatCount: e.copycatCount || 0,
        firstSeen: e.firstSeen || Date.now(),
        lastSeen: e.lastSeen || Date.now(),
      });
    }
    for (const w of payload.copycats || []) knownCopycats.add(w);
    for (const [wallet, funder] of payload.walletToFunder || []) {
      walletToFunder.set(wallet, funder);
    }
  } catch (error) {
    console.error("Failed to hydrate bad-actor state:", error);
  }
}

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
    if (knownCopycats.has(funded)) entry.copycatCount += 1;
  }
  entry.lastSeen = now;
  walletToFunder.set(funded, funder);
  schedulePersist();
}

export function flagCopycat(wallet: string): void {
  if (!wallet) return;
  if (knownCopycats.has(wallet)) return;
  knownCopycats.add(wallet);
  const funder = walletToFunder.get(wallet);
  if (funder) {
    const entry = funders.get(funder);
    if (entry && entry.fundedWallets.has(wallet)) {
      entry.copycatCount += 1;
    }
  }
  schedulePersist();
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
