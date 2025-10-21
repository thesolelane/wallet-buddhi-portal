import { 
  type User, 
  type InsertUser,
  type WalletAccount,
  type InsertWalletAccount,
  type PaymentTransaction,
  type InsertPaymentTransaction
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private walletAccounts: Map<string, WalletAccount>;
  private paymentTransactions: Map<string, PaymentTransaction>;

  constructor() {
    this.users = new Map();
    this.walletAccounts = new Map();
    this.paymentTransactions = new Map();
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
}

export const storage = new MemStorage();
