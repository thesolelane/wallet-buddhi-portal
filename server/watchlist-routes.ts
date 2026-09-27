import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import { watchedWallets } from "@shared/schema";
import {
  SOLANA_ADDRESS_RE,
  createChallenge,
  verifyChallenge,
  requireWalletAuth,
  sessionWallet,
  getAuthDomain,
} from "./siws-auth";
import { scanOwnerWatchlist, scanWatchedWallet } from "./watchlist-monitor";
import { registerWatchedTokenRoutes } from "./watched-token-routes";
import { getWalletHoldings } from "./wallet-holdings";
import { getRugCheckSummary } from "./rugcheck-service";
import { getTokenQuotes } from "./token-quotes";
import { listOllamaModels } from "./ollama-models";
import { getFounderPack } from "./founder-pack";
import { formatWatchLabel, parseDisplayLabel, parsePurpose } from "./wallet-purpose";

const challengeSchema = z.object({ address: z.string().regex(SOLANA_ADDRESS_RE) });
const verifySchema = z.object({
  address: z.string().regex(SOLANA_ADDRESS_RE),
  nonce: z.string().min(8).max(64),
  signature: z.string().min(64).max(256),
  message: z.string().max(4000).optional(),
});
const addWatchedWalletSchema = z.object({
  pubkey: z.string().regex(SOLANA_ADDRESS_RE),
  label: z.string().max(64).optional(),
  purpose: z.enum(["mine", "research"]).default("research"),
});
const patchWatchedWalletSchema = z.object({
  label: z.string().max(64).optional(),
  purpose: z.enum(["mine", "research"]).optional(),
});

async function assertOwnsWatch(req: Request, res: Response, watchId: string) {
  const owner = sessionWallet(req);
  const wallet = await storage.getWatchedWallet(watchId);
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return null; }
  if (!owner || wallet.ownerPubkey !== owner) { res.status(403).json({ error: "Forbidden" }); return null; }
  return wallet;
}

function bindPaymentToSession(req: Request, res: Response, next: NextFunction) {
  const owner = sessionWallet(req);
  if (!owner) return res.status(401).json({ error: "Sign in required" });
  const claimed = typeof req.body?.walletAddress === "string" ? req.body.walletAddress : "";
  if (claimed && claimed !== owner) return res.status(403).json({ error: "Payment wallet must match the signed-in wallet" });
  req.body = { ...req.body, walletAddress: owner };
  next();
}

function presentWallet(wallet: { label?: string | null } & Record<string, unknown>) {
  return { ...wallet, purpose: parsePurpose(wallet.label), displayLabel: parseDisplayLabel(wallet.label) };
}

export function registerWatchlistRoutes(app: Express) {
  registerWatchedTokenRoutes(app);
  app.post("/api/payments/create", requireWalletAuth, bindPaymentToSession);
  app.post("/api/payments/verify", requireWalletAuth, async (req, res, next) => {
    try {
      const owner = sessionWallet(req);
      const referenceKey = typeof req.body?.referenceKey === "string" ? req.body.referenceKey : "";
      if (!referenceKey) return res.status(400).json({ error: "referenceKey required" });
      const transaction = await storage.getPaymentTransaction(referenceKey);
      if (!transaction) return res.status(404).json({ error: "Payment transaction not found" });
      if (transaction.walletAddress !== owner) return res.status(403).json({ error: "Payment does not belong to this wallet" });
      next();
    } catch { return res.status(500).json({ error: "Failed to authorize payment" }); }
  });
  app.get("/api/payments/status/:referenceKey", requireWalletAuth, async (req, res, next) => {
    try {
      const owner = sessionWallet(req);
      const transaction = await storage.getPaymentTransaction(req.params.referenceKey);
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      if (transaction.walletAddress !== owner) return res.status(403).json({ error: "Payment does not belong to this wallet" });
      next();
    } catch { return res.status(500).json({ error: "Failed to authorize payment" }); }
  });
  app.get("/api/health/data-sources", (_req, res) => {
    return res.json({ helius: Boolean(process.env.HELIUS_API_KEY), dexscreener: true, rugcheck: true });
  });
  app.get("/api/analyst/models", async (_req, res) => {
    return res.json(await listOllamaModels());
  });
  app.get("/api/token/:ca/founder-pack", async (req, res) => {
    try {
      if (!SOLANA_ADDRESS_RE.test(req.params.ca)) return res.status(400).json({ error: "Invalid Solana address" });
      return res.json(await getFounderPack(req.params.ca));
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "founder pack failed" });
    }
  });
  app.get("/api/tokens/quotes", async (req, res) => {
    try {
      const mints = String(req.query.mints || "")
        .split(",")
        .map((m) => m.trim())
        .filter((m) => SOLANA_ADDRESS_RE.test(m))
        .slice(0, 8);
      const quotes = await getTokenQuotes(mints);
      return res.json({ quotes });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "quotes failed" });
    }
  });
  app.get("/api/token/:ca/rugcheck", async (req, res) => {
    try {
      if (!SOLANA_ADDRESS_RE.test(req.params.ca)) return res.status(400).json({ error: "Invalid Solana address" });
      return res.json(await getRugCheckSummary(req.params.ca));
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "RugCheck failed" });
    }
  });
  app.post("/api/auth/challenge", async (req, res) => {
    try {
      const { address } = challengeSchema.parse(req.body);
      return res.json(await createChallenge(address, getAuthDomain(req)));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid request data" });
      const message = error instanceof Error ? error.message : "Failed to create challenge";
      return res.status(message.includes("Too many") ? 429 : 400).json({ error: message });
    }
  });
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const data = verifySchema.parse(req.body);
      const result = await verifyChallenge(data);
      if (!result.ok) return res.status(401).json({ error: result.error });
      req.session.walletAddress = data.address;
      req.session.authenticatedAt = Date.now();
      return res.json({ ok: true, address: data.address });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid request data" });
      return res.status(500).json({ error: "Failed to verify signature" });
    }
  });
  app.get("/api/auth/me", requireWalletAuth, (req, res) => res.json({ address: sessionWallet(req) }));
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => { res.clearCookie("wb.sid"); res.json({ ok: true }); });
  });
  app.get("/api/wallets", requireWalletAuth, async (req, res) => {
    try {
      const wallets = await storage.listWatchedWallets(sessionWallet(req)!);
      return res.json({ wallets: wallets.map(presentWallet) });
    } catch { return res.status(500).json({ error: "Failed to list wallets" }); }
  });
  app.post("/api/wallets", requireWalletAuth, async (req, res) => {
    try {
      const data = addWatchedWalletSchema.parse(req.body);
      const wallet = await storage.createWatchedWalletWithinLimit({
        ownerPubkey: sessionWallet(req)!,
        pubkey: data.pubkey,
        label: formatWatchLabel(data.purpose, data.label),
      }, 5);
      if (!wallet) return res.status(403).json({ error: "Watch limit reached (5). Upgrade for more capacity." });
      return res.status(201).json(presentWallet(wallet));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid request data" });
      return res.status(500).json({ error: "Failed to add wallet" });
    }
  });
  app.patch("/api/wallets/:id", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      const data = patchWatchedWalletSchema.parse(req.body);
      const purpose = data.purpose ?? parsePurpose(wallet.label);
      const label = formatWatchLabel(purpose, data.label ?? wallet.label);
      const rows = await db.update(watchedWallets).set({ label }).where(eq(watchedWallets.id, wallet.id)).returning();
      return res.json(presentWallet(rows[0] || wallet));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid request data" });
      return res.status(500).json({ error: "Failed to update wallet" });
    }
  });
  app.post("/api/wallets/scan", requireWalletAuth, async (req, res) => {
    try { return res.json(await scanOwnerWatchlist(sessionWallet(req)!)); }
    catch { return res.status(500).json({ error: "Failed to scan watchlist" }); }
  });
  app.get("/api/wallets/:id", requireWalletAuth, async (req, res) => {
    const wallet = await assertOwnsWatch(req, res, req.params.id);
    if (!wallet) return;
    return res.json(presentWallet(wallet));
  });
  app.post("/api/wallets/:id/scan", requireWalletAuth, async (req, res) => {
    const wallet = await assertOwnsWatch(req, res, req.params.id);
    if (!wallet) return;
    return res.json(await scanWatchedWallet(wallet));
  });
  app.delete("/api/wallets/:id", requireWalletAuth, async (req, res) => {
    const wallet = await assertOwnsWatch(req, res, req.params.id);
    if (!wallet) return;
    return res.json({ removed: await storage.deleteWatchedWallet(wallet.id) });
  });
  app.get("/api/wallets/:id/tokens", requireWalletAuth, async (req, res) => {
    const wallet = await assertOwnsWatch(req, res, req.params.id);
    if (!wallet) return;
    return res.json({ tokens: await storage.listTokens(wallet.id) });
  });
  app.get("/api/wallets/:id/holdings", requireWalletAuth, async (req, res) => {
    const wallet = await assertOwnsWatch(req, res, req.params.id);
    if (!wallet) return;
    return res.json(await getWalletHoldings(wallet.pubkey));
  });
  app.get("/api/wallets/:id/alerts", requireWalletAuth, async (req, res) => {
    const wallet = await assertOwnsWatch(req, res, req.params.id);
    if (!wallet) return;
    return res.json({ alerts: await storage.listAlerts(wallet.id) });
  });
  app.post("/api/alerts/:id/dismiss", requireWalletAuth, async (req, res) => {
    const owner = sessionWallet(req)!;
    const target = (await storage.listAlerts()).find((a) => a.id === req.params.id);
    if (!target) return res.status(404).json({ error: "Alert not found" });
    const watch = await storage.getWatchedWallet(target.watchedWalletId);
    if (!watch || watch.ownerPubkey !== owner) return res.status(403).json({ error: "Forbidden" });
    return res.json(await storage.dismissAlert(target.id));
  });
}
