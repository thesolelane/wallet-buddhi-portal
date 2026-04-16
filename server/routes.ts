import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { solanaPaymentService } from "./payments";
import { programService } from "./program-service";
import { getTokenMetadata } from "./token-service";
import { getTopHolders } from "./holders-service";
import { getFirstBuyers, classifyCohort } from "./buyers-service";
import { detectBumpBots } from "./bump-detector";
import { runAnalyst } from "./analyst-service";
import { getSocialReport } from "./social";
import { getWalletActivity } from "./wallet-service";
import { ollamaProvider } from "./llm/ollama-client";
import { z } from "zod";

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const createPaymentRequestSchema = z.object({
  walletAddress: z.string(),
  tier: z.enum(["pro", "pro+"]),
  currency: z.enum(["sol", "cath"]),
});

const verifyPaymentSchema = z.object({
  referenceKey: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.get("/api/wallet/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      let account = await storage.getWalletAccount(address);
      
      if (!account) {
        account = await storage.createWalletAccount({
          walletAddress: address,
          tier: "basic",
        });
      }

      const onChainTier = await programService.getUserTier(
        new (await import("@solana/web3.js")).PublicKey(address)
      );
      
      const tierMapping = ["basic", "pro", "pro+"];
      const onChainTierString = tierMapping[onChainTier] || "basic";

      return res.json({
        ...account,
        onChainTier: onChainTierString,
      });
    } catch (error) {
      console.error("Error fetching wallet account:", error);
      return res.status(500).json({ 
        error: "Failed to fetch wallet account" 
      });
    }
  });

  app.get("/api/wallet/:address/tier", async (req, res) => {
    try {
      const { address } = req.params;
      
      const onChainTier = await programService.getUserTier(
        new (await import("@solana/web3.js")).PublicKey(address)
      );
      
      const tierMapping = ["basic", "pro", "pro+"];
      const tierString = tierMapping[onChainTier] || "basic";
      
      return res.json({
        tier: tierString,
        tierEnum: onChainTier,
      });
    } catch (error) {
      console.error("Error fetching on-chain tier:", error);
      return res.status(500).json({ 
        error: "Failed to fetch tier from blockchain" 
      });
    }
  });

  app.post("/api/payments/create", async (req, res) => {
    try {
      const validated = createPaymentRequestSchema.parse(req.body);
      const { walletAddress, tier, currency } = validated;

      const paymentRequest = await solanaPaymentService.createPaymentRequest(
        tier,
        currency
      );

      const transaction = await storage.createPaymentTransaction({
        walletAddress,
        tier,
        amount: paymentRequest.amount,
        currency,
        referenceKey: paymentRequest.referenceKey,
        status: "pending",
        transactionSignature: null,
      });

      return res.json({
        paymentUrl: paymentRequest.url,
        referenceKey: paymentRequest.referenceKey,
        amount: paymentRequest.amount,
        currency,
        transactionId: transaction.id,
      });
    } catch (error) {
      console.error("Error creating payment request:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: error.errors
        });
      }
      
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create payment request" 
      });
    }
  });

  app.post("/api/payments/verify", async (req, res) => {
    try {
      const validated = verifyPaymentSchema.parse(req.body);
      const { referenceKey } = validated;

      const transaction = await storage.getPaymentTransaction(referenceKey);
      
      if (!transaction) {
        return res.status(404).json({ error: "Payment transaction not found" });
      }

      if (transaction.status === "confirmed") {
        return res.json({
          status: "confirmed",
          tier: transaction.tier,
          signature: transaction.transactionSignature,
        });
      }

      const verification = await solanaPaymentService.verifyTransaction(
        referenceKey,
        transaction.amount,
        transaction.currency as "sol" | "cath"
      );

      if (verification.confirmed && verification.signature) {
        await storage.updatePaymentTransaction(referenceKey, {
          status: "confirmed",
          transactionSignature: verification.signature,
          confirmedAt: new Date(),
        });

        const onChainUpgrade = await programService.upgradeTierOnChain(
          transaction.walletAddress,
          transaction.tier,
          verification.signature
        );

        if (onChainUpgrade.success) {
          console.log("Tier upgraded on-chain:", onChainUpgrade.txSignature);
        } else {
          console.warn("Failed to upgrade tier on-chain:", onChainUpgrade.error);
        }

        await storage.updateWalletTier(transaction.walletAddress, transaction.tier);

        return res.json({
          status: "confirmed",
          tier: transaction.tier,
          signature: verification.signature,
          onChainSignature: onChainUpgrade.txSignature,
        });
      }

      return res.json({
        status: "pending",
        message: verification.error || "Transaction not confirmed yet",
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to verify payment" 
      });
    }
  });

  app.get("/api/payments/status/:referenceKey", async (req, res) => {
    try {
      const { referenceKey } = req.params;
      
      const transaction = await storage.getPaymentTransaction(referenceKey);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      return res.json({
        status: transaction.status,
        tier: transaction.tier,
        amount: transaction.amount,
        currency: transaction.currency,
        signature: transaction.transactionSignature,
        createdAt: transaction.createdAt,
        confirmedAt: transaction.confirmedAt,
      });
    } catch (error) {
      console.error("Error fetching payment status:", error);
      return res.status(500).json({ 
        error: "Failed to fetch payment status" 
      });
    }
  });

  // --- Phase G: LLM (Ollama) ---
  app.get("/api/llm/ollama/health", async (_req, res) => {
    const h = await ollamaProvider.health();
    return res.json(h);
  });

  app.post("/api/llm/ollama/complete", async (req, res) => {
    try {
      const { model, messages, temperature, maxTokens, json } = req.body ?? {};
      if (!model || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "model and messages are required" });
      }
      const result = await ollamaProvider.complete({
        model,
        messages,
        temperature,
        maxTokens,
        json,
      });
      return res.json(result);
    } catch (error) {
      console.error("Ollama complete error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "LLM call failed",
      });
    }
  });

  // --- Wallet activity (companion core) ---
  app.get("/api/wallet/:address/activity", async (req, res) => {
    try {
      const { address } = req.params;
      if (!SOLANA_ADDRESS_RE.test(address)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 300);
      const result = await getWalletActivity(address, limit);
      return res.json(result);
    } catch (error) {
      console.error("Wallet activity error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch wallet activity",
      });
    }
  });

  // --- Phase F: social layer (Twitter + Telegram metrics) ---
  app.get("/api/token/:ca/social", async (req, res) => {
    try {
      const { ca } = req.params;
      if (!SOLANA_ADDRESS_RE.test(ca)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const result = await getSocialReport(ca);
      return res.json(result);
    } catch (error) {
      console.error("Social report error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch social report",
      });
    }
  });

  // --- AI Analyst (Ollama-powered) ---
  app.post("/api/token/:ca/analyze", async (req, res) => {
    try {
      const { ca } = req.params;
      if (!SOLANA_ADDRESS_RE.test(ca)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const model = typeof req.body?.model === "string" ? req.body.model : "llama3.1:8b";
      const result = await runAnalyst(ca, model);
      return res.json(result);
    } catch (error) {
      console.error("Analyst error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Analyst failed",
      });
    }
  });

  // --- Phase E: bump-bot detector ---
  app.get("/api/token/:ca/bump-report", async (req, res) => {
    try {
      const { ca } = req.params;
      if (!SOLANA_ADDRESS_RE.test(ca)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const result = await detectBumpBots(ca);
      return res.json(result);
    } catch (error) {
      console.error("Error detecting bump bots:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to detect bump bots",
      });
    }
  });

  // --- Phase B.2: first-200 buyers cohort (on-demand, cached 10min) ---
  app.get("/api/token/:ca/buyers", async (req, res) => {
    try {
      const { ca } = req.params;
      if (!SOLANA_ADDRESS_RE.test(ca)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const limit = Math.min(parseInt(String(req.query.limit ?? "200"), 10) || 200, 500);

      // Fetch buyers + current holders in parallel so we can overlay cohort state
      const [buyersResult, holdersResult] = await Promise.all([
        getFirstBuyers(ca, limit),
        getTopHolders(ca, 10_000),
      ]);

      const holderSet = new Set(holdersResult.holders.map((h) => h.owner));
      const cohort = classifyCohort(buyersResult.buyers, holderSet);

      return res.json({
        ...buyersResult,
        buyers: cohort,
        stats: {
          total: cohort.length,
          stillHolding: cohort.filter((c) => c.state === "holding").length,
          exited: cohort.filter((c) => c.state === "exited").length,
          snipers: cohort.filter((c) => c.isSniper).length,
          snipersHolding: cohort.filter((c) => c.isSniper && c.state === "holding").length,
          totalJitoTipSol: cohort.reduce((s, c) => s + c.jitoTipSol, 0),
        },
      });
    } catch (error) {
      console.error("Error fetching buyers:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch buyers",
      });
    }
  });

  // --- Phase B.1: top holders ---
  app.get("/api/token/:ca/holders", async (req, res) => {
    try {
      const { ca } = req.params;
      if (!SOLANA_ADDRESS_RE.test(ca)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const topN = Math.min(parseInt(String(req.query.top ?? "50"), 10) || 50, 200);
      const result = await getTopHolders(ca, topN);
      return res.json(result);
    } catch (error) {
      console.error("Error fetching holders:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch holders",
      });
    }
  });

  // --- Phase A: token metadata ---
  app.get("/api/token/:ca", async (req, res) => {
    try {
      const { ca } = req.params;
      if (!SOLANA_ADDRESS_RE.test(ca)) {
        return res.status(400).json({ error: "Invalid Solana address" });
      }
      const meta = await getTokenMetadata(ca);
      return res.json(meta);
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch token metadata",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
