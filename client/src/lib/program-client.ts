import { BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("WBuddhi11111111111111111111111111111111111");

export enum Tier {
  Basic = 0,
  Pro = 1,
  ProPlus = 2,
}

export interface UserAccount {
  owner: PublicKey;
  tier: Tier;
  createdAt: BN;
  updatedAt: BN;
  lastPaymentSignature: string | null;
  bump: number;
}

export class WalletBuddhiClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(endpoint: string = "https://api.devnet.solana.com") {
    this.connection = new Connection(endpoint, "confirmed");
    this.programId = PROGRAM_ID;
  }

  getUserAccountPDA(userPublicKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("user"), userPublicKey.toBuffer()],
      this.programId
    );
  }

  async getUserAccount(userPublicKey: PublicKey): Promise<UserAccount | null> {
    try {
      const [userAccountPDA] = this.getUserAccountPDA(userPublicKey);
      const accountInfo = await this.connection.getAccountInfo(userAccountPDA);
      
      if (!accountInfo) {
        return null;
      }

      return this.deserializeUserAccount(accountInfo.data);
    } catch (error) {
      console.error("Error fetching user account:", error);
      return null;
    }
  }

  async getUserTier(userPublicKey: PublicKey): Promise<Tier> {
    const account = await this.getUserAccount(userPublicKey);
    return account?.tier ?? Tier.Basic;
  }

  async initializeUser(wallet: any): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    const [userAccountPDA] = this.getUserAccountPDA(wallet.publicKey);

    const instruction = await this.createInitializeUserInstruction(
      wallet.publicKey,
      userAccountPDA
    );

    const transaction = {
      feePayer: wallet.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [instruction],
    };

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature, "confirmed");

    return signature;
  }

  async upgradeTier(
    wallet: any,
    newTier: Tier,
    paymentSignature: string
  ): Promise<string> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    const [userAccountPDA] = this.getUserAccountPDA(wallet.publicKey);

    const instruction = await this.createUpgradeTierInstruction(
      wallet.publicKey,
      userAccountPDA,
      newTier,
      paymentSignature
    );

    const transaction = {
      feePayer: wallet.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      instructions: [instruction],
    };

    const signed = await wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature, "confirmed");

    return signature;
  }

  private async createInitializeUserInstruction(
    user: PublicKey,
    userAccountPDA: PublicKey
  ) {
    const data = Buffer.from([0]);

    return {
      keys: [
        { pubkey: userAccountPDA, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    };
  }

  private async createUpgradeTierInstruction(
    user: PublicKey,
    userAccountPDA: PublicKey,
    newTier: Tier,
    paymentSignature: string
  ) {
    const tierByte = Buffer.from([newTier]);
    const sigLength = Buffer.alloc(4);
    sigLength.writeUInt32LE(paymentSignature.length, 0);
    const sigBytes = Buffer.from(paymentSignature, "utf-8");
    
    const data = Buffer.concat([
      Buffer.from([1]),
      tierByte,
      sigLength,
      sigBytes,
    ]);

    const userAccount = await this.getUserAccount(user);
    
    return {
      keys: [
        { pubkey: userAccountPDA, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: userAccount?.owner || user, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    };
  }

  private deserializeUserAccount(data: Buffer): UserAccount {
    let offset = 8;

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const tier = data[offset] as Tier;
    offset += 1;

    const createdAt = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const updatedAt = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const hasSignature = data[offset];
    offset += 1;

    let lastPaymentSignature: string | null = null;
    if (hasSignature) {
      const sigLength = data.readUInt32LE(offset);
      offset += 4;
      lastPaymentSignature = data.slice(offset, offset + sigLength).toString("utf-8");
      offset += sigLength;
    } else {
      offset += 4;
    }

    const bump = data[offset];

    return {
      owner,
      tier,
      createdAt,
      updatedAt,
      lastPaymentSignature,
      bump,
    };
  }
}

export const walletBuddhiClient = new WalletBuddhiClient(
  process.env.SOLANA_NETWORK === "mainnet"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com"
);
