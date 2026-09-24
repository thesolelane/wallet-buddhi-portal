import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
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

const challengeSchema = z.object({
  address: z.string().regex(SOLANA_ADDRESS_RE),
});

const verifySchema = z.object({
  address: z.string().regex(SOLANA_ADDRESS_RE),
  nonce: z.string().min(8).max(64),
  signature: z.string().min(64).max(256),
  message: z.string().max(4000).optional(),
});

const addWatchedWalletSchema = z.object({
  pubkey: z.string().regex(SOLANA_ADDRESS_RE),
  label: z.string().max(64).optional(),
});

async function assertOwnsWatch(req: Request, res: Response, watchId: string) {
  const owner = sessionWallet(req);
  const wallet = await storage.getWatchedWallet(watchId);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return null;
  }
  if (!owner || wallet.ownerPubkey !== owner) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return wallet;
}

export function registerWatchlistRoutes(app: Express) {
  registerWatchedTokenRoutes(app);

  app.get("/api/health/data-sources", (_req, res) => {
    return res.json({
      helius: Boolean(process.env.HELIUS_API_KEY),
      dexscreener: true,
    });
  });

  app.post("/api/auth/challenge", (req, res) => {
    try {
      const { address } = challengeSchema.parse(req.body);
      const domain = getAuthDomain(req);
      const challenge = createChallenge(address, domain);
      return res.json(challenge);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data" });
      }
      const message = error instanceof Error ? error.message : "Failed to create challenge";
      const status = message.includes("Too many") ? 429 : 400;
      return res.status(status).json({ error: message });
    }
  });

  app.post("/api/auth/verify", (req, res) => {
    try {
      const data = verifySchema.parse(req.body);
      const result = verifyChallenge(data);
      if (!result.ok) {
        return res.status(401).json({ error: result.error });
      }
      req.session.walletAddress = data.address;
      req.session.authenticatedAt = Date.now();
      return res.json({ ok: true, address: data.address });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data" });
      }
      return res.status(500).json({ error: "Failed to verify signature" });
    }
  });

  app.get("/api/auth/me", requireWalletAuth, (req, res) => {
    return res.json({ address: sessionWallet(req) });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("wb.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/wallets", requireWalletAuth, async (req, res) => {
    try {
      const owner = sessionWallet(req)!;
      const wallets = await storage.listWatchedWallets(owner);
      return res.json({ wallets });
    } catch (error) {
      console.error("Error listing watched wallets:", error);
      return res.status(500).json({ error: "Failed to list wallets" });
    }
  });

  app.post("/api/wallets", requireWalletAuth, async (req, res) => {
    try {
      const data = addWatchedWalletSchema.parse(req.body);
      const owner = sessionWallet(req)!;
      const existing = await storage.listWatchedWallets(owner);
      if (existing.length >= 5) {
        return res.status(403).json({
          error: "Watch limit reached (5). Upgrade for more capacity.",
        });
      }
      const wallet = await storage.createWatchedWallet({
        ownerPubkey: owner,
        pubkey: data.pubkey,
        label: data.label,
      });
      return res.status(201).json(wallet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data" });
      }
      console.error("Error adding watched wallet:", error);
      return res.status(500).json({ error: "Failed to add wallet" });
    }
  });

  app.post("/api/wallets/scan", requireWalletAuth, async (req, res) => {
    try {
      const owner = sessionWallet(req)!;
      const summary = await scanOwnerWatchlist(owner);
      return res.json(summary);
    } catch (error) {
      console.error("Error scanning watchlist:", error);
      return res.status(500).json({ error: "Failed to scan watchlist" });
    }
  });

  app.get("/api/wallets/:id", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      return res.json(wallet);
    } catch (error) {
      console.error("Error fetching watched wallet:", error);
      return res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  app.post("/api/wallets/:id/scan", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      const result = await scanWatchedWallet(wallet);
      return res.json(result);
    } catch (error) {
      console.error("Error scanning wallet:", error);
      return res.status(500).json({ error: "Failed to scan wallet" });
    }
  });

  app.delete("/api/wallets/:id", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      const removed = await storage.deleteWatchedWallet(wallet.id);
      return res.json({ removed });
    } catch (error) {
      console.error("Error deleting watched wallet:", error);
      return res.status(500).json({ error: "Failed to delete wallet" });
    }
  });

  app.get("/api/wallets/:id/tokens", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      const tokens = await storage.listTokens(wallet.id);
      return res.json({ tokens });
    } catch (error) {
      console.error("Error listing tokens:", error);
      return res.status(500).json({ error: "Failed to list tokens" });
    }
  });

  app.get("/api/wallets/:id/holdings", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      const result = await getWalletHoldings(wallet.pubkey);
      return res.json(result);
    } catch (error) {
      console.error("Error listing holdings:", error);
      return res.status(500).json({ error: "Failed to list holdings" });
    }
  });

  app.get("/api/wallets/:id/alerts", requireWalletAuth, async (req, res) => {
    try {
      const wallet = await assertOwnsWatch(req, res, req.params.id);
      if (!wallet) return;
      const alertsList = await storage.listAlerts(wallet.id);
      return res.json({ alerts: alertsList });
    } catch (error) {
      console.error("Error listing alerts:", error);
      return res.status(500).json({ error: "Failed to list alerts" });
    }
  });

  app.post("/api/alerts/:id/dismiss", requireWalletAuth, async (req, res) => {
    try {
      const owner = sessionWallet(req)!;
      const all = await storage.listAlerts();
      const target = all.find((a) => a.id === req.params.id);
      if (!target) return res.status(404).json({ error: "Alert not found" });
      const watch = await storage.getWatchedWallet(target.watchedWalletId);
      if (!watch || watch.ownerPubkey !== owner) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const alert = await storage.dismissAlert(target.id);
      return res.json(alert);
    } catch (error) {
      console.error("Error dismissing alert:", error);
      return res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });
}
