import "dotenv/config";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import crypto from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { TOKEN_WATCH_CAPS, walletAccounts, watchedTokens, watchedWallets } from "../shared/schema";

assert.notEqual(process.env.NODE_ENV, "production", "Access tests must not run against production");

async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function waitFor<T>(read: () => Promise<T | undefined>, label: string, ms = 30000): Promise<T> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const result = await read().catch(() => undefined);
    if (result !== undefined) return result;
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  await exited;
}

async function startApp(port: number) {
  const log: string[] = [];
  const server = spawn("node", ["--import", "tsx", "server/index.ts"], {
    env: { ...process.env, NODE_ENV: "development", PORT: String(port), ENABLE_WATCHLIST_MONITOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout?.on("data", (chunk) => log.push(String(chunk)));
  server.stderr?.on("data", (chunk) => log.push(String(chunk)));
  const base = `http://127.0.0.1:${port}`;
  await waitFor(async () => {
    if (server.exitCode !== null) throw new Error(`App exited: ${log.join("")}`);
    const response = await fetch(`${base}/api/health/data-sources`);
    return response.ok ? true : undefined;
  }, "app startup", 45000);
  return { server, base, log };
}

async function signIn(base: string, address: string, signer: nacl.SignKeyPair) {
  const challengeResponse = await fetch(`${base}/api/auth/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address }),
  });
  assert.equal(challengeResponse.status, 200, await challengeResponse.clone().text());
  const challenge = await challengeResponse.json();
  const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(challenge.message), signer.secretKey));
  const verifyResponse = await fetch(`${base}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, nonce: challenge.nonce, message: challenge.message, signature }),
  });
  assert.equal(verifyResponse.status, 200, await verifyResponse.clone().text());
  const sessionCookie = verifyResponse.headers.get("set-cookie")?.split(";")[0];
  assert(sessionCookie?.startsWith("wb.sid="), "Signed-in session cookie missing");
  return { cookie: sessionCookie, "content-type": "application/json" };
}

test("API access checks: guest tokens and signed wallet caps", { timeout: 180000 }, async (t) => {
  const guestId = crypto.randomBytes(16).toString("hex");
  const owner = `guest:${guestId}`;
  const concurrentGuestId = crypto.randomBytes(16).toString("hex");
  const concurrentOwner = `guest:${concurrentGuestId}`;
  const mergedGuestId = crypto.randomBytes(16).toString("hex");
  const mergedOwner = `guest:${mergedGuestId}`;
  const legacyGuestId = crypto.randomBytes(16).toString("hex");
  const legacyOwner = `guest:${legacyGuestId}`;
  const racingGuestId = crypto.randomBytes(16).toString("hex");
  const racingOwner = `guest:${racingGuestId}`;
  const racingLegacyGuestId = crypto.randomBytes(16).toString("hex");
  const racingLegacyOwner = `guest:${racingLegacyGuestId}`;
  const signer = nacl.sign.keyPair();
  const address = new PublicKey(signer.publicKey).toBase58();
  const watchedAddress = new PublicKey(nacl.sign.keyPair().publicKey).toBase58();
  const mints = Array.from({ length: 3 }, () => new PublicKey(nacl.sign.keyPair().publicKey).toBase58());
  const port = await unusedPort();
  let server: ChildProcess | undefined;
  let signedHeaders: { cookie: string; "content-type": string } | undefined;
  let base = "";

  try {
    const app = await startApp(port);
    server = app.server;
    base = app.base;

    const guestHeaders = { "x-wb-vid": guestId };
    await t.test("guest can add two tokens but not a third", async () => {
      for (const mint of mints.slice(0, 2)) {
        const response = await fetch(`${base}/api/tokens/watched-guest`, {
          method: "POST",
          headers: { ...guestHeaders, "content-type": "application/json" },
          body: JSON.stringify({ mint }),
        });
        assert.equal(response.status, 201, await response.text());
      }
      const rejected = await fetch(`${base}/api/tokens/watched-guest`, {
        method: "POST",
        headers: { ...guestHeaders, "content-type": "application/json" },
        body: JSON.stringify({ mint: mints[2] }),
      });
      assert.equal(rejected.status, 409);
      assert.equal((await rejected.json()).cap, 2);
    });

    await t.test("unsigned requests cannot use watched-wallet endpoints", async () => {
      const response = await fetch(`${base}/api/wallets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pubkey: watchedAddress }),
      });
      assert.equal(response.status, 401);
    });

    await t.test("free signed-in wallet can add and remove one watched wallet", async () => {
      signedHeaders = await signIn(base, address, signer);
      const created = await fetch(`${base}/api/wallets`, {
        method: "POST",
        headers: signedHeaders,
        body: JSON.stringify({ pubkey: watchedAddress, label: "API cap test" }),
      });
      assert.equal(created.status, 201, await created.clone().text());
      const wallet = await created.json();
      const removed = await fetch(`${base}/api/wallets/${wallet.id}`, { method: "DELETE", headers: signedHeaders });
      assert.equal(removed.status, 200);
    });

    await t.test("overlapping signed token saves across two servers stay within tier caps", async () => {
      assert(signedHeaders, "Signed-in session missing");
      await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, address));
      await db
        .insert(walletAccounts)
        .values({ walletAddress: address, tier: "basic" })
        .onConflictDoUpdate({ target: walletAccounts.walletAddress, set: { tier: "basic" } });

      const secondPort = await unusedPort();
      const second = await startApp(secondPort);
      try {
        const secondHeaders = await signIn(second.base, address, signer);
        const burst = (count: number) =>
          Promise.all(
            Array.from({ length: count }, (_, index) => {
              const mint = new PublicKey(nacl.sign.keyPair().publicKey).toBase58();
              const useSecond = index % 2 === 1;
              return fetch(`${useSecond ? second.base : base}/api/tokens/watched`, {
                method: "POST",
                headers: useSecond ? secondHeaders : signedHeaders!,
                body: JSON.stringify({ mint }),
              });
            }),
          );

        const basicBurst = await burst(TOKEN_WATCH_CAPS.basic + 6);
        const basicCreated = basicBurst.filter((response) => response.status === 201).length;
        const basicBlocked = basicBurst.filter((response) => response.status === 403).length;
        assert.equal(basicCreated, TOKEN_WATCH_CAPS.basic, "basic cap leaked across servers");
        assert.equal(basicBlocked, 6);
        assert.equal(
          (await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, address))).length,
          TOKEN_WATCH_CAPS.basic,
        );

        await db
          .insert(walletAccounts)
          .values({ walletAddress: address, tier: "pro" })
          .onConflictDoUpdate({ target: walletAccounts.walletAddress, set: { tier: "pro" } });
        const remaining = TOKEN_WATCH_CAPS.pro - TOKEN_WATCH_CAPS.basic;
        const proBurst = await burst(remaining + 8);
        assert.equal(proBurst.filter((response) => response.status === 201).length, remaining);
        assert.equal(proBurst.filter((response) => response.status === 403).length, 8);
        assert.equal(
          (await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, address))).length,
          TOKEN_WATCH_CAPS.pro,
        );
      } finally {
        await stop(second.server);
      }
    });
  } finally {
    if (server) await stop(server);
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, owner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, concurrentOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, mergedOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, legacyOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, racingOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, racingLegacyOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, address));
    await db.delete(watchedWallets).where(eq(watchedWallets.ownerPubkey, address));
    await db.delete(walletAccounts).where(eq(walletAccounts.walletAddress, address));
    await pool.end();
  }
});
