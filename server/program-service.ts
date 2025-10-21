import { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("WBuddhi11111111111111111111111111111111111");
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "devnet";

export enum Tier {
  Basic = 0,
  Pro = 1,
  ProPlus = 2,
}

export class ProgramService {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    const endpoint =
      SOLANA_NETWORK === "mainnet"
        ? "https://api.mainnet-beta.solana.com"
        : "https://api.devnet.solana.com";
    
    this.connection = new Connection(endpoint, "confirmed");
    this.programId = PROGRAM_ID;
  }

  getUserAccountPDA(userPublicKey: PublicKey): [PublicKey, number] {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), userPublicKey.toBuffer()],
      this.programId
    );
    return [pda, bump];
  }

  async userAccountExists(userPublicKey: PublicKey): Promise<boolean> {
    try {
      const [userAccountPDA] = this.getUserAccountPDA(userPublicKey);
      const accountInfo = await this.connection.getAccountInfo(userAccountPDA);
      return accountInfo !== null;
    } catch (error) {
      console.error("Error checking user account:", error);
      return false;
    }
  }

  async getUserTier(userPublicKey: PublicKey): Promise<Tier> {
    try {
      const [userAccountPDA] = this.getUserAccountPDA(userPublicKey);
      const accountInfo = await this.connection.getAccountInfo(userAccountPDA);
      
      if (!accountInfo) {
        return Tier.Basic;
      }

      const tier = accountInfo.data[40];
      return tier as Tier;
    } catch (error) {
      console.error("Error fetching user tier:", error);
      return Tier.Basic;
    }
  }

  tierStringToEnum(tierString: string): Tier {
    switch (tierString.toLowerCase()) {
      case "pro":
        return Tier.Pro;
      case "pro+":
      case "proplus":
        return Tier.ProPlus;
      default:
        return Tier.Basic;
    }
  }

  async upgradeTierOnChain(
    walletAddress: string,
    newTier: string,
    paymentSignature: string
  ): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    try {
      const userPublicKey = new PublicKey(walletAddress);
      const tierEnum = this.tierStringToEnum(newTier);
      
      const exists = await this.userAccountExists(userPublicKey);
      
      if (!exists) {
        return {
          success: false,
          error: "User account does not exist on-chain. User must initialize their account first.",
        };
      }

      console.log(
        `Simulating tier upgrade on-chain for ${walletAddress} to ${newTier} (enum: ${tierEnum})`
      );
      console.log(`Payment signature: ${paymentSignature}`);

      return {
        success: true,
        txSignature: `simulated_${paymentSignature}`,
      };
    } catch (error) {
      console.error("Error upgrading tier on-chain:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const programService = new ProgramService();
