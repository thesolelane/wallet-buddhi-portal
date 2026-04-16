# Wallet Buddhi Portal — Resources & Stack

> Living document. Tracks every external service, library, and integration the portal depends on. Updated as features land.

## Design principles

- **No price charts, no candles.** Charts trigger emotional reactions. We show *state*, *flow*, and *direction* — never trajectory.
- **Track buys, sells, volume, momentum.** Not price.
- **One service = many measurements.** Consolidate. Avoid overlapping vendors.
- **Tier-gated depth.** Free shows basics; Pro/Pro+ unlock cohort, sniper, dev-trace, copy-trade.

## Core on-chain stack (1 vendor covers most)

### Helius (primary)
Single source for nearly all on-chain data.

| Capability | Helius feature |
|---|---|
| Token metadata (name, symbol, supply, mint/freeze authority) | DAS `getAsset` |
| First N buyers | Enhanced Transactions API + webhook on token mint/pair |
| Top N holders | DAS `getTokenAccounts` |
| Real-time tx stream | Webhooks (mainnet) |
| Sniper / bribe detection | Parsed tx + Jito tip account inspection |
| Bump-bot detection | Tx pattern matching on parsed stream |
| Dev wallet tracing | `getSignaturesForAddress` + funder graph traversal |
| Volume / momentum | Aggregated from parsed buy/sell stream |

**Env:** `HELIUS_API_KEY`

### Yellowstone gRPC / Geyser (later phase)
Sub-second tx streaming, needed for live sniper detection. Defer until Phase C.

### Jito Block Engine API (later phase)
Bundle and tip inspection. Defer until sniper detection lands.

## Token discovery & socials

### DexScreener (free, no key)
- Pair discovery by CA
- Social links (Twitter, Telegram, website)
- Pair age / launch date
- Liquidity figures (no price chart used)

### Metaplex `mpl-token-metadata` (on-chain)
- Off-chain JSON metadata pointer
- Used as fallback when Helius metadata is incomplete

## Social signal layer

### twitterapi.io (Twitter metrics)
- Account age, follower count, follower quality
- Mention velocity per ticker
- Engagement metrics (likes/RTs/replies)
- Bot follower percentage

**Env:** `TWITTER_API_KEY`

### TGStat (Telegram channel/group health)
- Member count + growth rate
- Post reach
- Channel age

**Env:** `TGSTAT_API_KEY`

### Sentiment scoring (LLM)
- Pull recent N messages from TG via Telegram Bot API (free)
- Pull recent N tweets via twitterapi.io
- Score sentiment via local Ollama model (free) or fallback to Claude Haiku

## LLM layer (agentic AI experimentation)

### Ollama (local, primary for experimentation)
**Host:** `OLLAMA_HOST` (e.g. `http://localhost:11434` or LAN address)

Models to test against the data pipeline:

| Model | Use case |
|---|---|
| `llama3.1:8b` | General reasoning, wallet narrative summaries |
| `qwen2.5:14b` | Structured extraction, JSON output |
| `qwen2.5-coder:7b` | Tx parsing, dynamic SQL generation |
| `mistral-nemo` | Fast sentiment scoring (TG / Twitter) |
| `phi3:14b` | Lightweight classification (bump? sniper? real?) |
| `deepseek-r1:7b` | Multi-step reasoning (cluster analysis, dev-wallet hunt) |
| `nomic-embed-text` | Embeddings for similarity (similar tokens, similar wallet behavior) |

### Cloud fallback
- Anthropic Claude Haiku for production sentiment when local is unavailable
- Single `LLMProvider` interface; impls: `ollama`, `anthropic`

### Agentic patterns to evaluate
1. Single-shot classifier
2. Tool-using agent (fns: `getWalletTxs`, `getTokenHolders`, `getFunderOf`)
3. Pipeline (extract → classify → summarize)
4. Self-critique loop (proposer + verifier model)
5. RAG over historical tx patterns

## Storage & infra

### Postgres (Neon) — already configured
- Drizzle ORM ready
- Add **TimescaleDB**-style hypertable for time-series tx data when phase B lands

### Redis (Upstash) — phase B+
- Hot cache: top holders, live counters, dedup keys for webhook idempotency

### BullMQ — phase B+
- Worker queues for indexer jobs (per-token backfills, cohort decay snapshots)

## Frontend visualization (no charts)

- **Wallet cohort grid** — 200 squares for first buyers, color = holding state
- **Top holders bar** — horizontal stack rank, hover for wallet detail
- **Sniper trail** — first-100 timeline with bribe markers
- **Bubble cluster** — wallet relationship map (`react-force-graph-2d`, phase D)
- **Pulse / heat / flow river** — buy pressure indicators
- **Compass / tachometer** — momentum direction + magnitude
- **Stacked status pills** — `🟢 Buyers ↑ accelerating`, etc.
- **Sentiment bar + word pulse** — TG/Twitter combined

Libraries planned:
- `react-force-graph-2d` (phase D)
- D3 only for force layouts; no axis-based chart libs

**Removed from earlier plans:** TradingView Lightweight Charts, OHLCV libs, Recharts price usage. (Recharts already in deps — keep for non-price bars only.)

## Phased build

| Phase | Scope | Status |
|---|---|---|
| **A** | `/token/:ca` page — metadata only (Helius `getAsset` + DexScreener) | ✅ done |
| **B.1** | Top 50 holders (Helius DAS `getTokenAccounts`, live read) | ✅ done |
| **B.2** | First-200 buyers cohort + holding/exited classification | ✅ done (in-memory cache, 10min TTL; no DB yet) |
| **B.3** | Postgres persistence + Helius webhooks (push model) | planned |
| **C** | Sniper / bribe detection (Jito tip accounts + priority fee threshold) | ✅ done (parsed-tx based; Yellowstone gRPC still future) |
| **D.1** | Dev / update authority surfacing + "dev still holds" signal | ✅ done |
| **D.2** | Cluster engine + bubble map viz | planned |
| **E** | Bump-bot detector + estimated fee burn | ✅ done |
| **F** | Social layer (twitterapi.io + TGStat) | ✅ scaffolded; activates when keys set |
| **G** | Ollama connector + `/lab` page + AI Analyst | ✅ done |
| **H** | Telegram/Discord alerts + copy-trade automation (Pro+) | planned |

### Also shipped
- Health Pills card synthesizing all signals into single-glance status
- Token search on Home page (enter CA → `/token/:ca`)
- Lab page (`/lab`) for testing Ollama models interactively
- Watchlist: localStorage-backed — **tokens and wallets**, surfaced on Dashboard
- Header nav: Lab + Bad Actors links
- **Wallet page** (`/wallet/:address`): swap activity, per-token PNL, AI Analyst
- **Copycat detector** (`/api/wallet/:addr/copycat`): finds leaders a wallet
  copies from, traces funder, flags CEX-deposit endpoints
- **Bad Actor Registry** (`/api/bad-actors`, `/bad-actors` page): tracks funders
  that have funded 3+ confirmed copycats; click through to the funder wallet
  and its funded cluster
- **Wallet AI Analyst** (`/api/wallet/:addr/analyze`): Ollama verdict on trader
  patterns — mirror of token analyst
- Deep links: holder rows, cohort grid cells, and bump-bot rows on Token page
  all navigate to the clicked wallet's page

### Fighting back against copycats / bots
The copycat pipeline is the portal's core defensive feature:

1. **Detect** — when a user analyzes a wallet, the detector checks that
   wallet's recent buys against the first-buyer cohorts of each token. Any
   OTHER wallet that consistently bought the same tokens shortly before it
   (across ≥2 tokens within 2h) is tagged as a "leader" — i.e. the wallet
   this wallet is copying.
2. **Trace** — same analysis walks Helius parsed history backwards to the
   OLDEST incoming native SOL transfer. That sender is the wallet's funder
   (unless it's a known CEX hot wallet, which ends the trace).
3. **Register** — every (funder → wallet) relationship is recorded in the
   bad-actor registry. When that wallet is confirmed as a copycat, the
   funder's `copycatCount` increments.
4. **Flag** — once a funder has funded 3+ confirmed copycats, it's
   auto-flagged. Flagged funders appear on `/bad-actors` and get a red
   badge everywhere their address surfaces.
5. **Cluster** — from the flagged funder, users can see every wallet it
   funded and click through, letting us surface the entire cluster of
   related wallets operating from the same source.

This turns the portal from a passive analytics tool into an active
counter-intelligence surface against repeat bad actors.

## Tier gating (proposed)

| Feature | Basic | Pro | Pro+ |
|---|---|---|---|
| Token metadata page | ✅ | ✅ | ✅ |
| Top 50 holders | ✅ | ✅ | ✅ |
| First 200 buyers cohort | — | ✅ | ✅ |
| Sniper / bribe detection | — | ✅ | ✅ |
| Bump-bot filter | — | ✅ | ✅ |
| Bubble map (cluster viz) | — | ✅ | ✅ |
| Dev wallet trace | — | — | ✅ |
| Copy-trade automation | — | — | ✅ |
| Sentiment + social signals | — | ✅ | ✅ |
| Agentic AI analyst | — | — | ✅ |
| Telegram/Discord alerts | — | ✅ (3 tokens) | ✅ (unlimited) |

## Env vars (full)

```bash
# On-chain
HELIUS_API_KEY=
SOLANA_NETWORK=mainnet-beta

# Socials
TWITTER_API_KEY=
TGSTAT_API_KEY=
TELEGRAM_BOT_TOKEN=

# LLM
OLLAMA_HOST=http://localhost:11434
ANTHROPIC_API_KEY=

# Storage (existing)
DATABASE_URL=
REDIS_URL=

# Existing payment infra
# (see existing .env keys for SOL/CATH treasuries)
```
