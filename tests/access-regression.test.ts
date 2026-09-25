import "dotenv/config";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import crypto from "node:crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { eq } from "drizzle-orm";
import WebSocket from "ws";
import { db, pool } from "../server/db";
import { TOKEN_WATCH_CAPS, walletAccounts, watchedTokens, watchedWallets } from "../shared/schema";

// These are integration tests against the development database; never point them at production.
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

class BrowserPage {
  private nextId = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  constructor(private ws: WebSocket) {
    ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    });
    ws.on("close", () => {
      for (const pending of this.pending.values()) pending.reject(new Error("Browser closed"));
      this.pending.clear();
    });
  }
  command(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate<T>(expression: string): Promise<T> {
    const result = await this.command("Runtime.evaluate", {
      expression, returnByValue: true, awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value as T;
  }
  async visit(url: string) {
    const loaded = new Promise<void>((resolve) => {
      this.ws.once("message", function onMessage(raw) {
        const message = JSON.parse(raw.toString());
        if (message.method === "Page.loadEventFired") resolve();
        else this.once("message", onMessage);
      });
    });
    await this.command("Page.navigate", { url });
    await Promise.race([loaded, delay(20000).then(() => { throw new Error(`Page did not load: ${url}`); })]);
    await waitFor(async () => await this.evaluate<boolean>("document.readyState === 'complete'") || undefined, "page load");
  }
  close() { this.ws.close(); }
}

test("guest navigation, token cap, and free signed-wallet access", { timeout: 120000 }, async (t) => {
  const guestId = crypto.randomBytes(16).toString("hex");
  const owner = `guest:${guestId}`;
  const concurrentGuestId = crypto.randomBytes(16).toString("hex");
  const concurrentOwner = `guest:${concurrentGuestId}`;
  const mergedGuestId = crypto.randomBytes(16).toString("hex");
  const mergedOwner = `guest:${mergedGuestId}`;
  const legacyGuestId = crypto.randomBytes(16).toString("hex");
  const legacyOwner = `guest:${legacyGuestId}`;
  const signer = nacl.sign.keyPair();
  const address = new PublicKey(signer.publicKey).toBase58();
  const watchedAddress = new PublicKey(nacl.sign.keyPair().publicKey).toBase58();
  const mints = Array.from({ length: 3 }, () => new PublicKey(nacl.sign.keyPair().publicKey).toBase58());
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  const log: string[] = [];
  let server: ChildProcess | undefined;
  let chrome: ChildProcess | undefined;
  let browser: BrowserPage | undefined;
  let chromeDir: string | undefined;
  let signedHeaders: { cookie: string; "content-type": string } | undefined;
  try {
    server = spawn("node", ["--import", "tsx", "server/index.ts"], {
      env: { ...process.env, NODE_ENV: "development", PORT: String(port), ENABLE_WATCHLIST_MONITOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (chunk) => log.push(String(chunk)));
    server.stderr?.on("data", (chunk) => log.push(String(chunk)));
    await waitFor(async () => {
      if (server?.exitCode !== null) throw new Error(`App exited: ${log.join("")}`);
      const response = await fetch(`${base}/api/health/data-sources`);
      return response.ok ? true : undefined;
    }, "app startup", 45000);

    chromeDir = await mkdtemp(join(tmpdir(), "wb-access-"));
    const debugPort = await unusedPort();
    chrome = spawn("chromium", [
      "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
      "--no-first-run", `--user-data-dir=${chromeDir}`, `--remote-debugging-port=${debugPort}`,
      "about:blank",
    ], { stdio: "ignore" });
    const target = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const tabs = await response.json() as Array<{ type: string; webSocketDebuggerUrl: string }>;
      return tabs.find((tab) => tab.type === "page")?.webSocketDebuggerUrl;
    }, "headless browser");
    const ws = new WebSocket(target);
    await new Promise<void>((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    browser = new BrowserPage(ws);
    await browser.command("Page.enable");
    await browser.command("Runtime.enable");

    await t.test("guest desktop and mobile navigation hide Dashboard; direct access redirects home", async () => {
      await browser!.command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await browser!.visit(`${base}/`);
      await waitFor(async () => await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"button-home\"]')") || undefined, "React home page");
      assert.equal(await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"link-dashboard\"]')"), false);

      await browser!.command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await browser!.evaluate("document.querySelector('[data-testid=\"button-mobile-nav\"]').click()");
      await waitFor(async () => await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"sheet-mobile-nav\"]')") || undefined, "mobile menu");
      assert.equal(await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"link-mobile-dashboard\"]')"), false);
      assert.equal(await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"link-mobile-watchlist\"]')"), true);

      await browser!.visit(`${base}/dashboard`);
      await waitFor(async () => await browser!.evaluate<boolean>("location.pathname === '/'") || undefined, "guest dashboard redirect");
      assert.equal(await browser!.evaluate<boolean>("!!document.querySelector('h1') && document.querySelector('h1').textContent === 'Dashboard'"), false);
    });

    await t.test("connected wallet can navigate to Dashboard on desktop and mobile and visit it directly", async () => {
      // Inject a local Phantom-compatible provider before the app initializes.
      // This exercises the real wallet adapter and UI without requiring an extension or network wallet.
      await browser!.command("Page.addScriptToEvaluateOnNewDocument", {
        source: `(() => {
          const bytes = ${JSON.stringify(Array.from(signer.publicKey))};
          const publicKey = { toBytes: () => Uint8Array.from(bytes) };
          const provider = {
            isPhantom: true,
            isConnected: false,
            publicKey,
            async connect() { this.isConnected = true; return { publicKey }; },
            async disconnect() { this.isConnected = false; },
            on() {},
            off() {},
          };
          Object.defineProperty(window, "phantom", { value: { solana: provider }, configurable: true });
        })();`,
      });
      await browser!.command("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await browser!.visit(`${base}/`);
      await waitFor(async () => await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"button-wallet-connect\"]')") || undefined, "wallet connect button");
      await browser!.evaluate("document.querySelector('[data-testid=\"button-wallet-connect\"]').click()");
      await waitFor(async () => await browser!.evaluate<boolean>("!!document.querySelector('.wallet-adapter-modal-list button')") || undefined, "wallet chooser");
      await browser!.evaluate(`Array.from(document.querySelectorAll('.wallet-adapter-modal-list button')).find(button => button.textContent?.includes('Phantom')).click()`);
      await waitFor(async () => await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"button-wallet-connected\"]')") || undefined, "connected wallet");

      assert.equal(await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"link-dashboard\"]')?.getClientRects().length"), true);
      await browser!.evaluate("document.querySelector('[data-testid=\"link-dashboard\"]').click()");
      await waitFor(async () => await browser!.evaluate<boolean>("location.pathname === '/dashboard' && document.querySelector('h1')?.textContent === 'Dashboard'") || undefined, "desktop Dashboard navigation");

      await browser!.evaluate("document.querySelector('[data-testid=\"button-home\"]').click()");
      await waitFor(async () => await browser!.evaluate<boolean>("location.pathname === '/'") || undefined, "home navigation");
      await browser!.command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await browser!.evaluate("document.querySelector('[data-testid=\"button-mobile-nav\"]').click()");
      await waitFor(async () => await browser!.evaluate<boolean>("!!document.querySelector('[data-testid=\"link-mobile-dashboard\"]')?.getClientRects().length") || undefined, "mobile Dashboard navigation");
      await browser!.evaluate("document.querySelector('[data-testid=\"link-mobile-dashboard\"]').click()");
      await waitFor(async () => await browser!.evaluate<boolean>("location.pathname === '/dashboard' && document.querySelector('h1')?.textContent === 'Dashboard'") || undefined, "mobile Dashboard page");

      await browser!.visit(`${base}/dashboard`);
      await waitFor(async () => await browser!.evaluate<boolean>("location.pathname === '/dashboard' && document.querySelector('h1')?.textContent === 'Dashboard' && !!document.querySelector('[data-testid=\"button-wallet-connected\"]')") || undefined, "connected direct Dashboard access");
      assert.equal(await browser!.evaluate<string>("document.querySelector('main')?.textContent?.includes('On-Chain Account Status') ? 'account' : 'missing'"), "account");
    });

    const guestHeaders = { "x-wb-vid": guestId };
    await t.test("guest can add two tokens but not a third", async () => {
      for (const mint of mints.slice(0, 2)) {
        const response = await fetch(`${base}/api/tokens/watched-guest`, {
          method: "POST", headers: { ...guestHeaders, "content-type": "application/json" },
          body: JSON.stringify({ mint }),
        });
        assert.equal(response.status, 201, await response.text());
      }
      const rejected = await fetch(`${base}/api/tokens/watched-guest`, {
        method: "POST", headers: { ...guestHeaders, "content-type": "application/json" },
        body: JSON.stringify({ mint: mints[2] }),
      });
      assert.equal(rejected.status, 409);
      assert.equal((await rejected.json()).cap, 2);
      const listing = await fetch(`${base}/api/tokens/watched-guest`, { headers: guestHeaders });
      const data = await listing.json();
      assert.equal(data.count, 2);
      assert.deepEqual(new Set(data.tokens.map((token: { mint: string }) => token.mint)), new Set(mints.slice(0, 2)));
    });

    await t.test("merging an old cookie ID keeps canonical watches and only the newest available legacy watch", async () => {
      const [canonicalMint, olderMint, newerMint] = Array.from(
        { length: 3 }, () => new PublicKey(nacl.sign.keyPair().publicKey).toBase58(),
      );
      await db.insert(watchedTokens).values([
        { ownerPubkey: mergedOwner, mint: canonicalMint, addedAt: new Date("2024-01-01T00:00:00Z") },
        { ownerPubkey: legacyOwner, mint: olderMint, addedAt: new Date("2024-02-01T00:00:00Z") },
        { ownerPubkey: legacyOwner, mint: newerMint, addedAt: new Date("2024-03-01T00:00:00Z") },
      ]);
      const headers = { "x-wb-vid": mergedGuestId, cookie: `wb.vid=${legacyGuestId}` };
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(`${base}/api/tokens/watched-guest`, { headers });
        assert.equal(response.status, 200, await response.clone().text());
        const data = await response.json();
        assert.equal(data.count, 2);
        assert.deepEqual(new Set(data.tokens.map((token: { mint: string }) => token.mint)),
          new Set([canonicalMint, newerMint]));
      }
      assert.equal((await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, mergedOwner))).length, 2);
      assert.deepEqual(await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, legacyOwner)), []);
    });

    await t.test("simultaneous guest saves and replacements respect the two-token cap", async () => {
      const headers = { "x-wb-vid": concurrentGuestId, "content-type": "application/json" };
      const burstMints = Array.from({ length: 8 }, () => new PublicKey(nacl.sign.keyPair().publicKey).toBase58());
      const save = (mint: string, replaceMint?: string) => fetch(`${base}/api/tokens/watched-guest`, {
        method: "POST", headers, body: JSON.stringify({ mint, replaceMint }),
      });
      const responses = await Promise.all(burstMints.map((mint) => save(mint)));
      assert.equal(responses.filter((response) => response.status === 201).length, 2);
      assert.equal(responses.filter((response) => response.status === 409).length, 6);
      const firstRows = await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, concurrentOwner));
      assert.equal(firstRows.length, 2);

      const replacements = await Promise.all(burstMints.slice(0, 4).map((_, index) =>
        save(new PublicKey(nacl.sign.keyPair().publicKey).toBase58(), firstRows[index % 2].mint)));
      assert.equal(replacements.filter((response) => response.status === 201).length, 2);
      assert.equal(replacements.filter((response) => response.status === 409).length, 2);
      const finalRows = await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, concurrentOwner));
      assert.equal(finalRows.length, 2);
    });

    await t.test("unsigned guest cannot add a watched wallet; free signed-in wallet can add and remove one", async () => {
      const unauthenticated = await fetch(`${base}/api/wallets`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pubkey: watchedAddress }),
      });
      assert.equal(unauthenticated.status, 401);
      assert.deepEqual(await db.select().from(watchedWallets).where(eq(watchedWallets.ownerPubkey, owner)), []);

      const challengeResponse = await fetch(`${base}/api/auth/challenge`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      assert.equal(challengeResponse.status, 200);
      const challenge = await challengeResponse.json();
      const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(challenge.message), signer.secretKey));
      const verifyResponse = await fetch(`${base}/api/auth/verify`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, nonce: challenge.nonce, message: challenge.message, signature }),
      });
      assert.equal(verifyResponse.status, 200, await verifyResponse.clone().text());
      const sessionCookie = verifyResponse.headers.get("set-cookie")?.split(";")[0];
      assert(sessionCookie?.startsWith("wb.sid="), "Signed-in session cookie missing");

      const headers = { cookie: sessionCookie, "content-type": "application/json" };
      signedHeaders = headers;
      const tierResponse = await fetch(`${base}/api/tokens/watched`, { headers });
      assert.equal(tierResponse.status, 200);
      assert.equal((await tierResponse.json()).tier, "basic");
      const created = await fetch(`${base}/api/wallets`, {
        method: "POST", headers, body: JSON.stringify({ pubkey: watchedAddress, label: "Access regression test" }),
      });
      assert.equal(created.status, 201, await created.clone().text());
      const wallet = await created.json();
      assert.equal(wallet.ownerPubkey, address);
      const list = await fetch(`${base}/api/wallets`, { headers });
      assert.equal(list.status, 200);
      assert((await list.json()).wallets.some((item: { id: string }) => item.id === wallet.id));
      const removed = await fetch(`${base}/api/wallets/${wallet.id}`, { method: "DELETE", headers });
      assert.equal(removed.status, 200);
      assert.equal((await removed.json()).removed, true);
      assert.deepEqual(await db.select().from(watchedWallets).where(eq(watchedWallets.ownerPubkey, address)), []);
    });

    await t.test("overlapping watched-wallet saves cannot exceed five", async () => {
      assert(signedHeaders, "Signed-in session missing");
      const targets = Array.from({ length: 12 }, () => new PublicKey(nacl.sign.keyPair().publicKey).toBase58());
      const responses = await Promise.all(targets.map((pubkey) => fetch(`${base}/api/wallets`, {
        method: "POST", headers: signedHeaders, body: JSON.stringify({ pubkey }),
      })));
      assert.equal(responses.filter((response) => response.status === 201).length, 5,
        await Promise.all(responses.map((response) => response.clone().text())));
      assert.equal(responses.filter((response) => response.status === 403).length, 7);
      const persisted = await db.select().from(watchedWallets).where(eq(watchedWallets.ownerPubkey, address));
      assert.equal(persisted.length, 5);
      assert.deepEqual(new Set(persisted.map((wallet) => wallet.pubkey)),
        new Set(targets.filter((_, index) => responses[index].status === 201)));
    });

    await t.test("overlapping signed-wallet saves stop at the basic and pro limits", async () => {
      assert(signedHeaders, "Signed-in session missing");
      const save = (mint: string) => fetch(`${base}/api/tokens/watched`, {
        method: "POST", headers: signedHeaders, body: JSON.stringify({ mint }),
      });
      const burst = (size: number) =>
        Promise.all(Array.from({ length: size }, () => save(new PublicKey(nacl.sign.keyPair().publicKey).toBase58())));

      const basicResponses = await burst(8);
      assert.equal(basicResponses.filter((response) => response.status === 201).length, TOKEN_WATCH_CAPS.basic);
      assert.equal(basicResponses.filter((response) => response.status === 403).length, 8 - TOKEN_WATCH_CAPS.basic);
      assert.equal(
        (await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, address))).length,
        TOKEN_WATCH_CAPS.basic,
      );

      await db.insert(walletAccounts).values({ walletAddress: address, tier: "pro" })
        .onConflictDoUpdate({ target: walletAccounts.walletAddress, set: { tier: "pro" } });
      const proResponses = await burst(20);
      assert.equal(proResponses.filter((response) => response.status === 201).length, TOKEN_WATCH_CAPS.pro - TOKEN_WATCH_CAPS.basic);
      assert.equal(proResponses.filter((response) => response.status === 403).length, 20 - (TOKEN_WATCH_CAPS.pro - TOKEN_WATCH_CAPS.basic));
      assert.equal(
        (await db.select().from(watchedTokens).where(eq(watchedTokens.ownerPubkey, address))).length,
        TOKEN_WATCH_CAPS.pro,
      );
    });
  } finally {
    browser?.close();
    if (chrome) await stop(chrome);
    if (server) await stop(server);
    if (chromeDir) await rm(chromeDir, { recursive: true, force: true });
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, owner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, concurrentOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, mergedOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, legacyOwner));
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, address));
    await db.delete(watchedWallets).where(eq(watchedWallets.ownerPubkey, address));
    await db.delete(walletAccounts).where(eq(walletAccounts.walletAddress, address));
    await pool.end();
  }
});
