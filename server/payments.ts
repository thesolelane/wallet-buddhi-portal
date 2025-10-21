import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { encodeURL, findReference, FindReferenceError, validateTransfer } from "@solana/pay";
import BigNumber from "bignumber.js";
import { randomBytes } from "crypto";

const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "devnet";
const MERCHANT_WALLET = process.env.MERCHANT_WALLET || "EXAMPLEwallet1234567890ABCDEFGHabcdefgh";

const CATH_TOKEN_MINT = "CATHtokenMint123456789012345678901234567";

const TIER_PRICES = {
  pro: {
    sol: "0.1",
    cath: "10"
  },
  "pro+": {
    sol: "0.25",
    cath: "25"
  }
};

export class SolanaPaymentService {
  private connection: Connection;
  
  constructor() {
    const endpoint = SOLANA_NETWORK === "mainnet-beta" 
      ? process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta")
      : clusterApiUrl("devnet");
    
    this.connection = new Connection(endpoint, "confirmed");
  }

  generateReferenceKey(): PublicKey {
    const referenceBytes = randomBytes(32);
    return new PublicKey(referenceBytes);
  }

  async createPaymentRequest(
    tier: "pro" | "pro+",
    currency: "sol" | "cath"
  ): Promise<{
    url: string;
    referenceKey: string;
    amount: string;
  }> {
    const amount = new BigNumber(TIER_PRICES[tier][currency]);
    const reference = this.generateReferenceKey();
    const recipient = new PublicKey(MERCHANT_WALLET);

    const urlParams: any = {
      recipient,
      amount,
      reference,
      label: "Wallet Buddhi",
      message: `Upgrade to ${tier.toUpperCase()} tier`,
      memo: `TIER_UPGRADE_${tier.toUpperCase()}_${reference.toBase58().slice(0, 8)}`,
    };

    if (currency === "cath") {
      urlParams.splToken = new PublicKey(CATH_TOKEN_MINT);
    }

    const url = encodeURL(urlParams);

    return {
      url: url.toString(),
      referenceKey: reference.toBase58(),
      amount: amount.toString(),
    };
  }

  async verifyTransaction(
    referenceKey: string,
    expectedAmount: string,
    currency: "sol" | "cath"
  ): Promise<{
    confirmed: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      const reference = new PublicKey(referenceKey);
      const recipient = new PublicKey(MERCHANT_WALLET);
      
      const signatureInfo = await findReference(this.connection, reference, {
        finality: "confirmed",
      });

      const amount = new BigNumber(expectedAmount);
      
      let splToken: PublicKey | undefined;
      if (currency === "cath") {
        splToken = new PublicKey(CATH_TOKEN_MINT);
      }

      await validateTransfer(
        this.connection,
        signatureInfo.signature,
        {
          recipient,
          amount,
          splToken,
          reference,
        },
        {
          commitment: "confirmed"
        }
      );

      return {
        confirmed: true,
        signature: signatureInfo.signature,
      };
    } catch (error) {
      if (error instanceof FindReferenceError) {
        return {
          confirmed: false,
          error: "Transaction not found yet. Please wait for confirmation.",
        };
      }

      return {
        confirmed: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    slot?: number;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      return {
        confirmed: status.value?.confirmationStatus === "confirmed" || 
                   status.value?.confirmationStatus === "finalized",
        slot: status.value?.slot,
      };
    } catch (error) {
      return { confirmed: false };
    }
  }
}

export const solanaPaymentService = new SolanaPaymentService();
