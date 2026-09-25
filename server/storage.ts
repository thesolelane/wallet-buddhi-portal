import {
  type User,
  type InsertUser,
  type WalletAccount,
  type InsertWalletAccount,
  type PaymentTransaction,
  type InsertPaymentTransaction,
  type VerificationCode,
  type InsertVerificationCode,
  type WatchedWallet,
  type InsertWatchedWallet,
  type PurchasedToken,
  type InsertPurchasedToken,
  type Alert,
  type InsertAlert,
  type Signal,
  type TokenMetadata,
  users,
  walletAccounts,
  paymentTransactions,
  verificationCodes,
  watchedWallets,
  purchasedTokens,
  alerts,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Wallet accounts (tier)
  getWalletAccount(walletAddress: string): Promise<WalletAccount | undefined>;
  createWalletAccount(account: InsertWalletAccount): Promise<WalletAccount>;
  updateWalletTier(walletAddress: string, tier: string): Promise<WalletAccount | undefined>;

  // Payments
  getPaymentTransaction(referenceKey: string): Promise<PaymentTransaction | undefined>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(
    referenceKey: string,
    updates: Partial<PaymentTransaction>,
  ): Promise<PaymentTransaction | undefined>;

  // Verification codes
  getVerificationCode(code: string): Promise<VerificationCode | undefined>;
  getVerificationCodesByWallet(walletAddress: string): Promise<VerificationCode[]>;
  createVerificationCode(verificationCode: InsertVerificationCode): Promise<VerificationCode>;
  updateVerificationCode(
    code: string,
    updates: Partial<VerificationCode>,
  ): Promise<VerificationCode | undefined>;

  // ===== Core monitoring (MVP) =====
  listWatchedWallets(ownerPubkey?: string): Promise<WatchedWallet[]>;
  getWatchedWallet(id: string): Promise<WatchedWallet | undefined>;
  getWatchedWalletByPubkey(ownerPubkey: string, pubkey: string): Promise<WatchedWallet | undefined>;
  createWatchedWalletWithinLimit(data: InsertWatchedWallet, limit: number): Promise<WatchedWallet | undefined>;
  deleteWatchedWallet(id: string): Promise<boolean>;

  listTokens(watchedWalletId: string): Promise<PurchasedToken[]>;
  findToken(watchedWalletId: string, mint: string): Promise<PurchasedToken | undefined>;
  recordPurchase(watchedWalletId: string, meta: TokenMetadata): Promise<PurchasedToken>;

  listAlerts(watchedWalletId?: string): Promise<Alert[]>;
  createAlert(data: InsertAlert): Promise<Alert>;
  dismissAlert(id: string): Promise<Alert | undefined>;
}

// ============================================================
// In-memory implementation (kept for local/dev compatibility)
// ============================================================

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private walletAccounts = new Map<string, WalletAccount>();
  private paymentTransactions = new Map<string, PaymentTransaction>();
  private verificationCodes = new Map<string, VerificationCode>();
  private watchedWalletsMap = new Map<string, WatchedWallet>();
  private purchasedTokensMap = new Map<string, PurchasedToken>();
  private alertsMap = new Map<string, Alert>();

  // --- Users ---
  async getUser(id: string) {
    return this.users.get(id);
  }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }
  async createUser(insertUser: InsertUser) {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // --- Wallet accounts ---
  async getWalletAccount(walletAddress: string) {
    return this.walletAccounts.get(walletAddress);
  }
  async createWalletAccount(insertAccount: InsertWalletAccount) {
    const id = randomUUID();
    const account: WalletAccount = {
      ...insertAccount,
      id,
      tier: insertAccount.tier || "basic",
    };
    this.walletAccounts.set(insertAccount.walletAddress, account);
    return account;
  }
  async updateWalletTier(walletAddress: string, tier: string) {
    const account = this.walletAccounts.get(walletAddress);
    if (!account) return undefined;
    account.tier = tier;
    this.walletAccounts.set(walletAddress, account);
    return account;
  }

  // --- Payments ---
  async getPaymentTransaction(referenceKey: string) {
    return this.paymentTransactions.get(referenceKey);
  }
  async createPaymentTransaction(insertTransaction: InsertPaymentTransaction) {
    const id = randomUUID();
    const transaction: PaymentTransaction = {
      ...insertTransaction,
      id,
      createdAt: new Date(),
      confirmedAt: null,
      transactionSignature: null,
      status: insertTransaction.status || "pending",
    };
    this.paymentTransactions.set(insertTransaction.referenceKey, transaction);
    return transaction;
  }
  async updatePaymentTransaction(referenceKey: string, updates: Partial<PaymentTransaction>) {
    const transaction = this.paymentTransactions.get(referenceKey);
    if (!transaction) return undefined;
    const updated = { ...transaction, ...updates };
    this.paymentTransactions.set(referenceKey, updated);
    return updated;
  }

  // --- Verification codes ---
  async getVerificationCode(code: string) {
    return this.verificationCodes.get(code);
  }
  async getVerificationCodesByWallet(walletAddress: string) {
    return Array.from(this.verificationCodes.values()).filter(
      (vc) => vc.walletAddress === walletAddress,
    );
  }
  async createVerificationCode(insertCode: InsertVerificationCode) {
    const id = randomUUID();
    const verificationCode: VerificationCode = {
      ...insertCode,
      id,
      createdAt: new Date(),
      usedAt: null,
      assignedSubdomain: insertCode.assignedSubdomain ?? null,
      status: insertCode.status || "pending",
    };
    this.verificationCodes.set(insertCode.code, verificationCode);
    return verificationCode;
  }
  async updateVerificationCode(code: string, updates: Partial<VerificationCode>) {
    const verificationCode = this.verificationCodes.get(code);
    if (!verificationCode) return undefined;
    const updated = { ...verificationCode, ...updates };
    this.verificationCodes.set(code, updated);
    return updated;
  }

  // --- Watched wallets ---
  async listWatchedWallets(ownerPubkey?: string) {
    const all = Array.from(this.watchedWalletsMap.values());
    if (!ownerPubkey) return all;
    return all.filter((w) => w.ownerPubkey === ownerPubkey);
  }
  async getWatchedWallet(id: string) {
    return this.watchedWalletsMap.get(id);
  }
  async getWatchedWalletByPubkey(ownerPubkey: string, pubkey: string) {
    return Array.from(this.watchedWalletsMap.values()).find(
      (w) => w.ownerPubkey === ownerPubkey && w.pubkey === pubkey,
    );
  }
  async createWatchedWalletWithinLimit(data: InsertWatchedWallet, limit: number) {
    // No await between counting and inserting: keep the in-memory operation atomic.
    const owned = Array.from(this.watchedWalletsMap.values()).filter(
      (wallet) => wallet.ownerPubkey === data.ownerPubkey,
    );
    if (owned.length >= limit) return undefined;
    const existing = owned.find((wallet) => wallet.pubkey === data.pubkey);
    if (existing) return existing;
    const id = randomUUID();
    const wallet: WatchedWallet = {
      id,
      ownerPubkey: data.ownerPubkey,
      pubkey: data.pubkey,
      label: data.label ?? null,
      addedAt: new Date(),
    };
    this.watchedWalletsMap.set(id, wallet);
    return wallet;
  }
  async deleteWatchedWallet(id: string) {
    return this.watchedWalletsMap.delete(id);
  }

  // --- Purchased tokens ---
  async listTokens(watchedWalletId: string) {
    return Array.from(this.purchasedTokensMap.values()).filter(
      (t) => t.watchedWalletId === watchedWalletId,
    );
  }
  async findToken(watchedWalletId: string, mint: string) {
    return Array.from(this.purchasedTokensMap.values()).find(
      (t) => t.watchedWalletId === watchedWalletId && t.mint === mint,
    );
  }
  async recordPurchase(watchedWalletId: string, meta: TokenMetadata) {
    const existing = await this.findToken(watchedWalletId, meta.mint);
    if (existing) return existing;
    const id = randomUUID();
    const token: PurchasedToken = {
      id,
      watchedWalletId,
      mint: meta.mint,
      symbol: meta.symbol,
      name: meta.name,
      marketCapUsd: meta.marketCapUsd,
      priceUsd: meta.priceUsd,
      website: meta.website,
      twitter: meta.twitter,
      telegram: meta.telegram,
      discord: meta.discord,
      imageUrl: meta.imageUrl,
      creator: meta.creator,
      updateAuthority: meta.updateAuthority,
      isPumpFun: meta.isPumpFun ?? false,
      sources: meta.sources ?? [],
      purchasedAt: new Date(),
    };
    this.purchasedTokensMap.set(id, token);
    return token;
  }

  // --- Alerts ---
  async listAlerts(watchedWalletId?: string) {
    const all = Array.from(this.alertsMap.values());
    if (!watchedWalletId) return all;
    return all.filter((a) => a.watchedWalletId === watchedWalletId);
  }
  async createAlert(data: InsertAlert) {
    const id = randomUUID();
    const signals = (data.signals ?? []) as Signal[];
    const alert: Alert = {
      id,
      watchedWalletId: data.watchedWalletId,
      newMint: data.newMint,
      newSymbol: data.newSymbol ?? null,
      newName: data.newName ?? null,
      matchedTokenId: data.matchedTokenId ?? null,
      matchedMint: data.matchedMint ?? null,
      matchedSymbol: data.matchedSymbol ?? null,
      matchedName: data.matchedName ?? null,
      signals,
      verdict: data.verdict,
      createdAt: new Date(),
      dismissedAt: null,
    };
    this.alertsMap.set(id, alert);
    return alert;
  }
  async dismissAlert(id: string) {
    const alert = this.alertsMap.get(id);
    if (!alert) return undefined;
    alert.dismissedAt = new Date();
    this.alertsMap.set(id, alert);
    return alert;
  }
}

// ============================================================
// Postgres implementation (production)
// ============================================================

export class DbStorage implements IStorage {
  // --- Users ---
  async getUser(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }
  async getUserByUsername(username: string) {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }
  async createUser(insertUser: InsertUser) {
    const rows = await db.insert(users).values(insertUser).returning();
    return rows[0];
  }

  // --- Wallet accounts ---
  async getWalletAccount(walletAddress: string) {
    const rows = await db
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.walletAddress, walletAddress))
      .limit(1);
    return rows[0];
  }
  async createWalletAccount(insertAccount: InsertWalletAccount) {
    const rows = await db
      .insert(walletAccounts)
      .values({ ...insertAccount, tier: insertAccount.tier || "basic" })
      .returning();
    return rows[0];
  }
  async updateWalletTier(walletAddress: string, tier: string) {
    const rows = await db
      .update(walletAccounts)
      .set({ tier })
      .where(eq(walletAccounts.walletAddress, walletAddress))
      .returning();
    return rows[0];
  }

  // --- Payments ---
  async getPaymentTransaction(referenceKey: string) {
    const rows = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.referenceKey, referenceKey))
      .limit(1);
    return rows[0];
  }
  async createPaymentTransaction(insertTransaction: InsertPaymentTransaction) {
    const rows = await db
      .insert(paymentTransactions)
      .values({ ...insertTransaction, status: insertTransaction.status || "pending" })
      .returning();
    return rows[0];
  }
  async updatePaymentTransaction(referenceKey: string, updates: Partial<PaymentTransaction>) {
    const { id, createdAt, ...safe } = updates as any;
    const rows = await db
      .update(paymentTransactions)
      .set(safe)
      .where(eq(paymentTransactions.referenceKey, referenceKey))
      .returning();
    return rows[0];
  }

  // --- Verification codes ---
  async getVerificationCode(code: string) {
    const rows = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.code, code))
      .limit(1);
    return rows[0];
  }
  async getVerificationCodesByWallet(walletAddress: string) {
    return db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.walletAddress, walletAddress));
  }
  async createVerificationCode(insertCode: InsertVerificationCode) {
    const rows = await db
      .insert(verificationCodes)
      .values({
        ...insertCode,
        status: insertCode.status || "pending",
        assignedSubdomain: insertCode.assignedSubdomain ?? null,
      })
      .returning();
    return rows[0];
  }
  async updateVerificationCode(code: string, updates: Partial<VerificationCode>) {
    const { id, createdAt, ...safe } = updates as any;
    const rows = await db
      .update(verificationCodes)
      .set(safe)
      .where(eq(verificationCodes.code, code))
      .returning();
    return rows[0];
  }

  // --- Watched wallets ---
  async listWatchedWallets(ownerPubkey?: string) {
    if (ownerPubkey) {
      return db
        .select()
        .from(watchedWallets)
        .where(eq(watchedWallets.ownerPubkey, ownerPubkey))
        .orderBy(desc(watchedWallets.addedAt));
    }
    return db.select().from(watchedWallets).orderBy(desc(watchedWallets.addedAt));
  }
  async getWatchedWallet(id: string) {
    const rows = await db
      .select()
      .from(watchedWallets)
      .where(eq(watchedWallets.id, id))
      .limit(1);
    return rows[0];
  }
  async getWatchedWalletByPubkey(ownerPubkey: string, pubkey: string) {
    const rows = await db
      .select()
      .from(watchedWallets)
      .where(and(eq(watchedWallets.ownerPubkey, ownerPubkey), eq(watchedWallets.pubkey, pubkey)))
      .limit(1);
    return rows[0];
  }
  async createWatchedWalletWithinLimit(data: InsertWatchedWallet, limit: number) {
    return db.transaction(async (tx) => {
      // Lock the owner rather than existing rows, since a new owner has none.
      // A transaction lock serializes additions across server instances too.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"watched-wallet:" + data.ownerPubkey}, 0))`);
      const owned = await tx.select().from(watchedWallets)
        .where(eq(watchedWallets.ownerPubkey, data.ownerPubkey));
      if (owned.length >= limit) return undefined;
      const existing = owned.find((wallet) => wallet.pubkey === data.pubkey);
      if (existing) return existing;
      const rows = await tx.insert(watchedWallets)
        .values({
          ownerPubkey: data.ownerPubkey,
          pubkey: data.pubkey,
          label: data.label ?? null,
        })
        .onConflictDoNothing()
        .returning();
      if (rows[0]) return rows[0];
      const duplicate = await tx.select().from(watchedWallets)
        .where(and(eq(watchedWallets.ownerPubkey, data.ownerPubkey), eq(watchedWallets.pubkey, data.pubkey)))
        .limit(1);
      return duplicate[0];
    });
  }
  async deleteWatchedWallet(id: string) {
    const rows = await db
      .delete(watchedWallets)
      .where(eq(watchedWallets.id, id))
      .returning();
    return rows.length > 0;
  }

  // --- Purchased tokens ---
  async listTokens(watchedWalletId: string) {
    return db
      .select()
      .from(purchasedTokens)
      .where(eq(purchasedTokens.watchedWalletId, watchedWalletId))
      .orderBy(desc(purchasedTokens.purchasedAt));
  }
  async findToken(watchedWalletId: string, mint: string) {
    const rows = await db
      .select()
      .from(purchasedTokens)
      .where(
        and(
          eq(purchasedTokens.watchedWalletId, watchedWalletId),
          eq(purchasedTokens.mint, mint),
        ),
      )
      .limit(1);
    return rows[0];
  }
  async recordPurchase(watchedWalletId: string, meta: TokenMetadata) {
    const existing = await this.findToken(watchedWalletId, meta.mint);
    if (existing) return existing;
    const rows = await db
      .insert(purchasedTokens)
      .values({
        watchedWalletId,
        mint: meta.mint,
        symbol: meta.symbol,
        name: meta.name,
        marketCapUsd: meta.marketCapUsd,
        priceUsd: meta.priceUsd,
        website: meta.website,
        twitter: meta.twitter,
        telegram: meta.telegram,
        discord: meta.discord,
        imageUrl: meta.imageUrl,
        creator: meta.creator,
        updateAuthority: meta.updateAuthority,
        isPumpFun: meta.isPumpFun ?? false,
        sources: meta.sources ?? [],
      })
      .returning();
    return rows[0];
  }

  // --- Alerts ---
  async listAlerts(watchedWalletId?: string) {
    if (watchedWalletId) {
      return db
        .select()
        .from(alerts)
        .where(eq(alerts.watchedWalletId, watchedWalletId))
        .orderBy(desc(alerts.createdAt));
    }
    return db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }
  async createAlert(data: InsertAlert) {
    const signals = (data.signals ?? []) as Signal[];
    const rows = await db
      .insert(alerts)
      .values({
        ...data,
        signals,
      })
      .returning();
    return rows[0];
  }
  async dismissAlert(id: string) {
    const rows = await db
      .update(alerts)
      .set({ dismissedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return rows[0];
  }
}

export const storage = new DbStorage();
