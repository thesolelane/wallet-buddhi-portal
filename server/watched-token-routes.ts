import type { Express } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  TOKEN_WATCH_CAPS,
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
});

function capForTier(tier: string | undefined) {
  if (!tier) return TOKEN_WATCH_CAPS.basic;
  return TOKEN_WATCH_CAPS[tier] ?? TOKEN_WATCH_CAPS.basic;
}

export function registerWatchedTokenRoutes(app: Express) {
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
      const existingRows = await db
        .select()
        .from(watchedTokens)
        .where(and(eq(watchedTokens.ownerPubkey, owner), eq(watchedTokens.mint, data.mint)))
        .limit(1);
      if (existingRows[0]) {
        return res.json(existingRows[0]);
      }
      const account = await storage.getWalletAccount(owner);
      const cap = capForTier(account?.tier);
      const all = await db
        .select()
        .from(watchedTokens)
        .where(eq(watchedTokens.ownerPubkey, owner));
      if (all.length >= cap) {
        return res.status(403).json({
          error: `Watch limit reached (${cap}). Upgrade for more tokens.`,
          cap,
        });
      }
      const rows = await db
        .insert(watchedTokens)
        .values({
          ownerPubkey: owner,
          mint: data.mint,
          symbol: data.symbol ?? null,
          name: data.name ?? null,
        })
        .returning();
      return res.status(201).json(rows[0]);
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
