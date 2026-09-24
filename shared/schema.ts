import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  boolean,
  doublePrecision,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const walletAccounts = pgTable("wallet_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  tier: text("tier").notNull().default("basic"),
});

export const insertWalletAccountSchema = createInsertSchema(walletAccounts).omit({
  id: true,
});

export type InsertWalletAccount = z.infer<typeof insertWalletAccountSchema>;
export type WalletAccount = typeof walletAccounts.$inferSelect;

export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  tier: text("tier").notNull(),
  amount: decimal("amount", { precision: 18, scale: 9 }).notNull(),
  currency: text("currency").notNull(),
  referenceKey: text("reference_key").notNull().unique(),
  status: text("status").notNull().default("pending"),
  transactionSignature: text("transaction_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  walletAddress: text("wallet_address").notNull(),
  assignedSubdomain: text("assigned_subdomain"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;

export const watchedWallets = pgTable(
  "watched_wallets",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerPubkey: text("owner_pubkey").notNull(),
    pubkey: text("pubkey").notNull(),
    label: text("label"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerTargetUnique: uniqueIndex("watched_wallets_owner_pubkey_unique").on(
      table.ownerPubkey,
      table.pubkey,
    ),
  }),
);

export const insertWatchedWalletSchema = createInsertSchema(watchedWallets).omit({
  id: true,
  addedAt: true,
});

export type InsertWatchedWallet = z.infer<typeof insertWatchedWalletSchema>;
export type WatchedWallet = typeof watchedWallets.$inferSelect;

export const watchedTokens = pgTable(
  "watched_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerPubkey: text("owner_pubkey").notNull(),
    mint: text("mint").notNull(),
    symbol: text("symbol"),
    name: text("name"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerMintUnique: uniqueIndex("watched_tokens_owner_mint_unique").on(
      table.ownerPubkey,
      table.mint,
    ),
  }),
);

export const insertWatchedTokenSchema = createInsertSchema(watchedTokens).omit({
  id: true,
  addedAt: true,
});

export type InsertWatchedToken = z.infer<typeof insertWatchedTokenSchema>;
export type WatchedToken = typeof watchedTokens.$inferSelect;

export const TOKEN_WATCH_CAPS: Record<string, number> = {
  basic: 2,
  pro: 15,
  pro_plus: 50,
};

export const purchasedTokens = pgTable("purchased_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  watchedWalletId: varchar("watched_wallet_id")
    .notNull()
    .references(() => watchedWallets.id, { onDelete: "cascade" }),
  mint: text("mint").notNull(),
  symbol: text("symbol"),
  name: text("name"),
  marketCapUsd: doublePrecision("market_cap_usd"),
  priceUsd: doublePrecision("price_usd"),
  website: text("website"),
  twitter: text("twitter"),
  telegram: text("telegram"),
  discord: text("discord"),
  imageUrl: text("image_url"),
  creator: text("creator"),
  updateAuthority: text("update_authority"),
  isPumpFun: boolean("is_pump_fun").notNull().default(false),
  sources: jsonb("sources").$type<string[]>().default([]),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export const insertPurchasedTokenSchema = createInsertSchema(purchasedTokens).omit({
  id: true,
  purchasedAt: true,
});

export type InsertPurchasedToken = z.infer<typeof insertPurchasedTokenSchema>;
export type PurchasedToken = typeof purchasedTokens.$inferSelect;

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  watchedWalletId: varchar("watched_wallet_id")
    .notNull()
    .references(() => watchedWallets.id, { onDelete: "cascade" }),
  newMint: text("new_mint").notNull(),
  newSymbol: text("new_symbol"),
  newName: text("new_name"),
  matchedTokenId: text("matched_token_id"),
  matchedMint: text("matched_mint"),
  matchedSymbol: text("matched_symbol"),
  matchedName: text("matched_name"),
  signals: jsonb("signals").$type<Signal[]>().notNull().default([]),
  verdict: text("verdict").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dismissedAt: timestamp("dismissed_at"),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  dismissedAt: true,
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export const badActorState = pgTable("bad_actor_state", {
  id: varchar("id").primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const signalTypeSchema = z.enum([
  "ticker_exact",
  "ticker_fuzzy",
  "name_fuzzy",
  "social_overlap",
  "creator_match",
  "update_authority_match",
  "pump_fun_clone",
]);
export type SignalType = z.infer<typeof signalTypeSchema>;

export const signalSchema = z.object({
  type: signalTypeSchema,
  confidence: z.number().min(0).max(1),
  detail: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;

export const verdictSchema = z.enum(["SUSPICIOUS", "DANGER"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const tokenMetadataSchema = z.object({
  mint: z.string(),
  symbol: z.string().nullable(),
  name: z.string().nullable(),
  marketCapUsd: z.number().nullable(),
  priceUsd: z.number().nullable(),
  website: z.string().nullable(),
  twitter: z.string().nullable(),
  telegram: z.string().nullable(),
  discord: z.string().nullable(),
  imageUrl: z.string().nullable(),
  creator: z.string().nullable(),
  updateAuthority: z.string().nullable(),
  isPumpFun: z.boolean().optional(),
  sources: z.array(z.string()),
});
export type TokenMetadata = z.infer<typeof tokenMetadataSchema>;
