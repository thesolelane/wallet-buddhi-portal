import { 
  type User, 
  type InsertUser,
  type WalletAccount,
  type InsertWalletAccount,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type VerificationCode,
  type InsertVerificationCode
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getWalletAccount(walletAddress: string): Promise<WalletAccount | undefined>;
  createWalletAccount(account: InsertWalletAccount): Promise<WalletAccount>;
  updateWalletTier(walletAddress: string, tier: string): Promise<WalletAccount | undefined>;
  
  getPaymentTransaction(referenceKey: string): Promise<PaymentTransaction | undefined>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(
    referenceKey: string, 
    updates: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction | undefined>;
  
  getVerificationCode(code: string): Promise<VerificationCode | undefined>;
  getVerificationCodesByWallet(walletAddress: string): Promise<VerificationCode[]>;
  createVerificationCode(verificationCode: InsertVerificationCode): Promise<VerificationCode>;
  updateVerificationCode(
    code: string,
    updates: Partial<VerificationCode>
  ): Promise<VerificationCode | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private walletAccounts: Map<string, WalletAccount>;
  private paymentTransactions: Map<string, PaymentTransaction>;
  private verificationCodes: Map<string, VerificationCode>;

  constructor() {
    this.users = new Map();
    this.walletAccounts = new Map();
    this.paymentTransactions = new Map();
    this.verificationCodes = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWalletAccount(walletAddress: string): Promise<WalletAccount | undefined> {
    return this.walletAccounts.get(walletAddress);
  }

  async createWalletAccount(insertAccount: InsertWalletAccount): Promise<WalletAccount> {
    const id = randomUUID();
    const account: WalletAccount = { 
      ...insertAccount, 
      id,
      tier: insertAccount.tier || "basic"
    };
    this.walletAccounts.set(insertAccount.walletAddress, account);
    return account;
  }

  async updateWalletTier(walletAddress: string, tier: string): Promise<WalletAccount | undefined> {
    const account = this.walletAccounts.get(walletAddress);
    if (!account) return undefined;
    
    account.tier = tier;
    this.walletAccounts.set(walletAddress, account);
    return account;
  }

  async getPaymentTransaction(referenceKey: string): Promise<PaymentTransaction | undefined> {
    return this.paymentTransactions.get(referenceKey);
  }

  async createPaymentTransaction(insertTransaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const id = randomUUID();
    const transaction: PaymentTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
      confirmedAt: null,
      transactionSignature: null,
      status: insertTransaction.status || "pending"
    };
    this.paymentTransactions.set(insertTransaction.referenceKey, transaction);
    return transaction;
  }

  async updatePaymentTransaction(
    referenceKey: string,
    updates: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction | undefined> {
    const transaction = this.paymentTransactions.get(referenceKey);
    if (!transaction) return undefined;

    const updated = { ...transaction, ...updates };
    this.paymentTransactions.set(referenceKey, updated);
    return updated;
  }

  async getVerificationCode(code: string): Promise<VerificationCode | undefined> {
    return this.verificationCodes.get(code);
  }

  async getVerificationCodesByWallet(walletAddress: string): Promise<VerificationCode[]> {
    return Array.from(this.verificationCodes.values()).filter(
      (vc) => vc.walletAddress === walletAddress
    );
  }

  async createVerificationCode(insertCode: InsertVerificationCode): Promise<VerificationCode> {
    const id = randomUUID();
    const verificationCode: VerificationCode = {
      ...insertCode,
      id,
      createdAt: new Date(),
      usedAt: null,
      status: insertCode.status || "pending"
    };
    this.verificationCodes.set(insertCode.code, verificationCode);
    return verificationCode;
  }

  async updateVerificationCode(
    code: string,
    updates: Partial<VerificationCode>
  ): Promise<VerificationCode | undefined> {
    const verificationCode = this.verificationCodes.get(code);
    if (!verificationCode) return undefined;

    const updated = { ...verificationCode, ...updates };
    this.verificationCodes.set(code, updated);
    return updated;
  }
}

export const storage = new MemStorage();
