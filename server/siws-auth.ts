/**
 * Sign-In With Solana (SIWS-style) auth.
 *
 * Industry pattern (Phantom SIWS / CAIP-74):
 *   1. Server issues a one-time nonce + canonical message
 *   2. Wallet signs the message (private key never leaves the wallet)
 *   3. Server verifies Ed25519 signature with tweetnacl
 *   4. Server creates a short-lived session bound to the pubkey
 */
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";

export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes (SIWS recommendation)
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_NONCES_PER_ADDRESS = 5;

interface NonceRecord {
  nonce: string;
  address: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
}

declare module "express-session" {
  interface SessionData {
    walletAddress?: string;
    authenticatedAt?: number;
  }
}

const nonceStore = new Map<string, NonceRecord>(); // key = `${address}:${nonce}`

function pruneExpired() {
  const now = Date.now();
  for (const [key, rec] of nonceStore) {
    if (rec.expiresAt <= now) nonceStore.delete(key);
  }
}

function countNoncesForAddress(address: string): number {
  let n = 0;
  for (const rec of nonceStore.values()) {
    if (rec.address === address) n += 1;
  }
  return n;
}

export function getAuthDomain(req: Request): string {
  const configured = process.env.SIWS_DOMAIN?.trim();
  if (configured) return configured;
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  return host.split(",")[0].trim();
}

export function buildSiwsMessage(params: {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  uri?: string;
}): string {
  const uri = params.uri || `https://${params.domain}`;
  return [
    `${params.domain} wants you to sign in with your Solana account:`,
    params.address,
    "",
    "Sign this message to prove you own this wallet. No transaction will be sent and no funds will move.",
    "",
    `URI: ${uri}`,
    "Version: 1",
    "Chain ID: mainnet",
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
    `Expiration Time: ${params.expirationTime}`,
  ].join("\n");
}

export function createChallenge(address: string, domain: string, uri?: string) {
  pruneExpired();
  if (!SOLANA_ADDRESS_RE.test(address)) {
    throw new Error("Invalid Solana address");
  }
  // cheap sanity check — invalid keys throw
  new PublicKey(address);

  if (countNoncesForAddress(address) >= MAX_NONCES_PER_ADDRESS) {
    throw new Error("Too many outstanding challenges. Wait and retry.");
  }

  const nonce = crypto.randomBytes(16).toString("base64url");
  const issuedAtMs = Date.now();
  const expiresAtMs = issuedAtMs + NONCE_TTL_MS;
  const issuedAt = new Date(issuedAtMs).toISOString();
  const expirationTime = new Date(expiresAtMs).toISOString();
  const message = buildSiwsMessage({
    domain,
    address,
    nonce,
    issuedAt,
    expirationTime,
    uri,
  });

  nonceStore.set(`${address}:${nonce}`, {
    nonce,
    address,
    message,
    issuedAt: issuedAtMs,
    expiresAt: expiresAtMs,
  });

  return { nonce, message, issuedAt, expirationTime, domain };
}

function decodeSignature(signature: string): Uint8Array {
  const trimmed = signature.trim();
  try {
    return bs58.decode(trimmed);
  } catch {
    // some wallets return base64
    return Uint8Array.from(Buffer.from(trimmed, "base64"));
  }
}

export function verifyChallenge(params: {
  address: string;
  nonce: string;
  signature: string;
  message?: string;
}): { ok: true } | { ok: false; error: string } {
  pruneExpired();
  const key = `${params.address}:${params.nonce}`;
  const rec = nonceStore.get(key);
  if (!rec) return { ok: false, error: "Unknown or expired challenge" };
  if (rec.expiresAt <= Date.now()) {
    nonceStore.delete(key);
    return { ok: false, error: "Challenge expired" };
  }

  // Bind the exact server-issued message; reject client-rewritten text.
  const message = rec.message;
  if (params.message && params.message !== message) {
    return { ok: false, error: "Message mismatch" };
  }

  let pubkeyBytes: Uint8Array;
  try {
    pubkeyBytes = new PublicKey(params.address).toBytes();
  } catch {
    return { ok: false, error: "Invalid address" };
  }

  let sigBytes: Uint8Array;
  try {
    sigBytes = decodeSignature(params.signature);
  } catch {
    return { ok: false, error: "Invalid signature encoding" };
  }
  if (sigBytes.length !== 64) {
    return { ok: false, error: "Invalid signature length" };
  }

  const messageBytes = new TextEncoder().encode(message);
  const valid = nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
  // one-time nonce regardless of outcome after first verify attempt on a found record
  nonceStore.delete(key);
  if (!valid) return { ok: false, error: "Signature verification failed" };
  return { ok: true };
}

export function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  const address = req.session?.walletAddress;
  const authedAt = req.session?.authenticatedAt ?? 0;
  if (!address || !SOLANA_ADDRESS_RE.test(address)) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (Date.now() - authedAt > SESSION_TTL_MS) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ error: "Session expired" });
  }
  return next();
}

export function sessionWallet(req: Request): string | undefined {
  return req.session?.walletAddress;
}
