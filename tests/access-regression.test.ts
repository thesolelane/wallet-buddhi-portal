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
import { watchedTokens, watchedWallets } from "../shared/schema";

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
  } finally {
    browser?.close();
    if (chrome) await stop(chrome);
    if (server) await stop(server);
    if (chromeDir) await rm(chromeDir, { recursive: true, force: true });
    await db.delete(watchedTokens).where(eq(watchedTokens.ownerPubkey, owner));
    await db.delete(watchedWallets).where(eq(watchedWallets.ownerPubkey, address));
    await pool.end();
  }
});