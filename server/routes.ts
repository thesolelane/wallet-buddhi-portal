import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { solanaPaymentService } from "./payments";
import { programService } from "./program-service";
import { z } from "zod";

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

  const httpServer = createServer(app);

  return httpServer;
}
