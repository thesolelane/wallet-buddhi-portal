import type { Express, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  TOKEN_WATCH_CAPS,
  walletAccounts,
  watchedTokens,
} from "@shared/schema";
import {
  SOLANA_ADDRESS_RE,
  requireWalletAuth,
  sessionWallet,
} from "./siws-auth";

const addSchema = z.object({
  mint: z.string().regex(SOLANA_ADDRESS_RE),
  symbol: z.string().max(32).optional(),
  name: z.string().max(64).optional(),
  replaceMint: z.string().regex(SOLANA_ADDRESS_RE).optional(),
});

const GUEST_CAP = 2;
const GUEST_COOKIE = "wb.vid";

const MERGE_NOTICE_COOKIE = "wb.watch-merge";
const VID_RE = /^[a-f0-9]{32}$/i;

const guestCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  maxAge: 365 * 24 * 60 * 60 * 1000,
  path: "/",
};
function capForTier(tier: string | undefined) {
  if (!tier) return TOKEN_WATCH_CAPS.basic;
  return TOKEN_WATCH_CAPS[tier] ?? TOKEN_WATCH_CAPS.basic;
}

function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function guestOwner(req: Request, res: Response) {
  const headerVid = String(req.headers["x-wb-vid"] || "");
  const cookieVid = readCookie(req, GUEST_COOKIE);
  let vid = VID_RE.test(headerVid) ? headerVid : cookieVid;
  if (!VID_RE.test(vid)) {
    vid = crypto.randomBytes(16).toString("hex");
  }
  vid = vid.toLowerCase();
  let trimmed = false;

  // Older versions could save watches under the cookie ID before the client
  // supplied its stable local ID. Reconcile both identities so those rows do
  // not disappear after a refresh or an app update.
  if (
    VID_RE.test(headerVid) &&
    VID_RE.test(cookieVid) &&
    headerVid.toLowerCase() !== cookieVid.toLowerCase()
  ) {
    const canonicalOwner = `guest:${headerVid.toLowerCase()}`;
    const legacyOwner = `guest:${cookieVid.toLowerCase()}`;
    trimmed = await db.transaction(async (tx) => {
      // Serialize reconciliation with saves to either guest identity. Lock in
      // a consistent order so opposite-direction merges cannot deadlock.
      for (const owner of [canonicalOwner, legacyOwner].sort()) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner}, 0))`);
      }
      const canonicalTokens = await tx
        .select()
        .from(watchedTokens)
        .where(eq(watchedTokens.ownerPubkey, canonicalOwner))
        .orderBy(desc(watchedTokens.addedAt), asc(watchedTokens.mint));
      const legacyTokens = await tx
        .select()
        .from(watchedTokens)
        .where(eq(watchedTokens.ownerPubkey, legacyOwner))
        .orderBy(desc(watchedTokens.addedAt), asc(watchedTokens.mint));

      // Retain canonical watches first (newest first), then fill remaining
      // slots with the newest distinct legacy watches. Mint breaks date ties.
      const retainedCanonical = canonicalTokens.slice(0, GUEST_CAP);
      const excessCanonical = canonicalTokens.slice(GUEST_CAP);
      if (excessCanonical.length) {
        await tx.delete(watchedTokens).where(inArray(watchedTokens.id, excessCanonical.map((token) => token.id)));
      }
      const retainedMints = new Set(retainedCanonical.map((token) => token.mint));
      for (const token of legacyTokens) {
        if (retainedMints.has(token.mint) || retainedMints.size >= GUEST_CAP) continue;
        await tx
          .insert(watchedTokens)
          .values({
            ownerPubkey: canonicalOwner,
            mint: token.mint,
            symbol: token.symbol,
            name: token.name,
            addedAt: token.addedAt,
          })
          .onConflictDoNothing();
        retainedMints.add(token.mint);
      }

      if (legacyTokens.length > 0) {
        await tx.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, legacyOwner));
      }
      // Duplicates shared by both identities were not lost.
      return [...canonicalTokens, ...legacyTokens].some((token) => !retainedMints.has(token.mint));
    });
    if (trimmed) res.cookie(MERGE_NOTICE_COOKIE, vid, guestCookieOptions);
  }

  res.cookie(GUEST_COOKIE, vid, guestCookieOptions);
  return { owner: `guest:${vid}`, trimmed };
}

export function registerWatchedTokenRoutes(app: Express) {
  app.get("/api/tokens/watched-guest", async (req, res) => {
    try {
      const { owner, trimmed } = await guestOwner(req, res);
      const tokens = await db
        .select()
        .from(watchedTokens)
        .where(eq(watchedTokens.ownerPubkey, owner))
        .orderBy(desc(watchedTokens.addedAt));
      return res.json({
        tokens, cap: GUEST_CAP, count: tokens.length, tier: "basic",
        mergeTrimmed: trimmed || readCookie(req, MERGE_NOTICE_COOKIE) === owner.slice("guest:".length),
      });
    } catch (error) {
      console.error("Error listing guest tokens:", error);
      return res.status(500).json({ error: "Failed to list watched tokens" });
    }
  });

  app.post("/api/tokens/watched-guest/ack-merge", (req, res) => {
    res.clearCookie(MERGE_NOTICE_COOKIE, { path: "/" });
    return res.json({ acknowledged: true });
  });

  app.delete("/api/tokens/watched-guest", async (req, res) => {
    try {
      const { owner } = await guestOwner(req, res);
      const rows = await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, owner)).returning();
      return res.json({ removed: rows.length });
    } catch (error) {
      console.error("Error clearing guest tokens:", error);
      return res.status(500).json({ error: "Failed to clear watched tokens" });
    }
  });

  app.post("/api/tokens/watched-guest", async (req, res) => {
    try {
      const data = addSchema.parse(req.body);
      const { owner } = await guestOwner(req, res);
      const result = await db.transaction(async (tx) => {
        // Lock the guest identity, not its rows: a new guest has no rows to lock.
        // The transaction-scoped lock also works across server instances.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner}, 0))`);
        const existingRows = await tx
          .select()
          .from(watchedTokens)
          .where(and(eq(watchedTokens.ownerPubkey, owner), eq(watchedTokens.mint, data.mint)))
          .limit(1);
        if (existingRows[0]) return { status: 200, body: existingRows[0] };
        let all = await tx.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, owner));
        if (all.length >= GUEST_CAP && data.replaceMint) {
          await tx
            .delete(watchedTokens)
            .where(and(eq(watchedTokens.ownerPubkey, owner), eq(watchedTokens.mint, data.replaceMint)));
          all = await tx.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, owner));
        }
        if (all.length >= GUEST_CAP) {
          return {
            status: 409,
            body: {
              error: "Free plan allows 2 watched tokens. Choose one to replace.",
              cap: GUEST_CAP,
              tokens: all,
            },
          };
        }
        const rows = await tx
          .insert(watchedTokens)
          .values({
            ownerPubkey: owner,
            mint: data.mint,
            symbol: data.symbol ?? null,
            name: data.name ?? null,
          })
          .returning();
        return { status: 201, body: rows[0] };
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data" });
      }
      console.error("Error watching guest token:", error);
      return res.status(500).json({ error: "Failed to watch token" });
    }
  });

  app.delete("/api/tokens/watched-guest/:mint", async (req, res) => {
    try {
      const mint = req.params.mint;
      if (!SOLANA_ADDRESS_RE.test(mint)) {
        return res.status(400).json({ error: "Invalid mint" });
      }
      const { owner } = await guestOwner(req, res);
      const rows = await db
        .delete(watchedTokens)
        .where(and(eq(watchedTokens.ownerPubkey, owner), eq(watchedTokens.mint, mint)))
        .returning();
      return res.json({ removed: rows.length > 0 });
    } catch (error) {
      console.error("Error unwatching guest token:", error);
      return res.status(500).json({ error: "Failed to unwatch token" });
    }
  });

  app.get("/api/tokens/watched", requireWalletAuth, async (req, res) => {
    try {
      const owner = sessionWallet(req)!;
      const account = await storage.getWalletAccount(owner);
      const cap = capForTier(account?.tier);
      const tokens = await db
        .select()
        .from(watchedTokens)
        .where(eq(watchedTokens.ownerPubkey, owner))
        .orderBy(desc(watchedTokens.addedAt));
      return res.json({ tokens, cap, count: tokens.length, tier: account?.tier ?? "basic" });
    } catch (error) {
      console.error("Error listing watched tokens:", error);
      return res.status(500).json({ error: "Failed to list watched tokens" });
    }
  });

  app.post("/api/tokens/watched", requireWalletAuth, async (req, res) => {
    try {
      const data = addSchema.parse(req.body);
      const owner = sessionWallet(req)!;
      const result = await db.transaction(async (tx) => {
        // Serialize the whole check and insert for this owner, including when
        // the wallet has no watched rows yet. This also spans server instances.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${owner}, 0))`);
        const existingRows = await tx
          .select()
          .from(watchedTokens)
          .where(and(eq(watchedTokens.ownerPubkey, owner), eq(watchedTokens.mint, data.mint)))
          .limit(1);
        if (existingRows[0]) return { status: 200, body: existingRows[0] };
        const account = await tx
          .select()
          .from(walletAccounts)
          .where(eq(walletAccounts.walletAddress, owner))
          .limit(1);
        const cap = capForTier(account[0]?.tier);
        const all = await tx
          .select()
          .from(watchedTokens)
          .where(eq(watchedTokens.ownerPubkey, owner));
        if (all.length >= cap) {
          return {
            status: 403,
            body: { error: `Watch limit reached (${cap}). Upgrade for more tokens.`, cap },
          };
        }
        const rows = await tx
          .insert(watchedTokens)
          .values({
            ownerPubkey: owner,
            mint: data.mint,
            symbol: data.symbol ?? null,
            name: data.name ?? null,
          })
          .returning();
        return { status: 201, body: rows[0] };
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data" });
      }
      console.error("Error watching token:", error);
      return res.status(500).json({ error: "Failed to watch token" });
    }
  });

  app.delete("/api/tokens/watched/:mint", requireWalletAuth, async (req, res) => {
    try {
      const mint = req.params.mint;
      if (!SOLANA_ADDRESS_RE.test(mint)) {
        return res.status(400).json({ error: "Invalid mint" });
      }
      const owner = sessionWallet(req)!;
      const rows = await db
        .delete(watchedTokens)
        .where(and(eq(watchedTokens.ownerPubkey, owner), eq(watchedTokens.mint, mint)))
        .returning();
      return res.json({ removed: rows.length > 0 });
    } catch (error) {
      console.error("Error unwatching token:", error);
      return res.status(500).json({ error: "Failed to unwatch token" });
    }
  });
}
