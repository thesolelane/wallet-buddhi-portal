import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { pool } from "./db";

export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_NONCES_PER_ADDRESS = 5;

declare module "express-session" {
  interface SessionData {
    walletAddress?: string;
    authenticatedAt?: number;
  }
}

let tableReady: Promise<void> | null = null;

async function ensureTable() {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS siws_challenges (
        challenge_key TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        nonce TEXT NOT NULL,
        message TEXT NOT NULL,
        issued_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      )
    `).then(() => undefined);
  }
  await tableReady;
}

async function pruneExpired() {
  await ensureTable();
  await pool.query("DELETE FROM siws_challenges WHERE expires_at <= $1", [Date.now()]);
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

export async function createChallenge(address: string, domain: string, uri?: string) {
  await pruneExpired();
  if (!SOLANA_ADDRESS_RE.test(address)) {
    throw new Error("Invalid Solana address");
  }
  new PublicKey(address);

  const count = await pool.query(
    "SELECT COUNT(*)::int AS n FROM siws_challenges WHERE address = $1 AND expires_at > $2",
    [address, Date.now()],
  );
  if ((count.rows[0]?.n || 0) >= MAX_NONCES_PER_ADDRESS) {
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

  await pool.query(
    `INSERT INTO siws_challenges (challenge_key, address, nonce, message, issued_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [`${address}:${nonce}`, address, nonce, message, issuedAtMs, expiresAtMs],
  );

  return { nonce, message, issuedAt, expirationTime, domain };
}

function decodeSignature(signature: string): Uint8Array {
  const trimmed = signature.trim();
  try {
    return bs58.decode(trimmed);
  } catch {
    return Uint8Array.from(Buffer.from(trimmed, "base64"));
  }
}

export async function verifyChallenge(params: {
  address: string;
  nonce: string;
  signature: string;
  message?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await pruneExpired();
  const key = `${params.address}:${params.nonce}`;
  const found = await pool.query(
    "DELETE FROM siws_challenges WHERE challenge_key = $1 RETURNING message, expires_at",
    [key],
  );
  const rec = found.rows[0];
  if (!rec) return { ok: false, error: "Unknown or expired challenge" };
  if (Number(rec.expires_at) <= Date.now()) {
    return { ok: false, error: "Challenge expired" };
  }
  if (params.message && params.message !== rec.message) {
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

  const valid = nacl.sign.detached.verify(
    new TextEncoder().encode(rec.message),
    sigBytes,
    pubkeyBytes,
  );
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
