# Wallet Buddhi - Developer Onboarding Guide

## Project Overview

Wallet Buddhi is a tiered Solana wallet protection system with AI-powered threat detection and automated arbitrage bots. This is the **fully decentralized web portal** version that includes all tiers (Basic/Pro/Pro+) with on-chain payments via SOL/$CATH smart contracts.

**Domain:** wbuddhi.cooperanth.sol (Solana Name Service)

---

## Distribution Strategy

This codebase supports the **decentralized version**:
- All tiers: Basic, Pro, Pro+ with full features
- On-chain payments (SOL/$CATH) - 0% platform fees
- Arbitrage bots included (Pro+ tier)
- Target audience: Crypto-native users (Phantom/Solflare/Backpack)
- Distribution: PWA + downloadable Electron app for bot settings

**Note:** A separate "lite" version (Basic tier only) will be distributed via Google Play / Apple App Store with in-app purchases.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + TailwindCSS + Shadcn UI
- **Backend:** Express + TypeScript + WebSocket (ws)
- **State Management:** TanStack Query v5 (React Query)
- **Routing:** Wouter
- **Validation:** Zod schemas
- **Blockchain:** Solana Web3.js (to be integrated)
- **Storage:** In-memory (ready for PostgreSQL migration)
- **Fonts:** Inter (UI), JetBrains Mono (addresses)
- **Colors:** Primary Blue (220 85% 58%), Solana Purple (265 75% 65%)

---

## Quick Start

```bash
# This is a Replit project - open it in Replit
# Dependencies are already installed

# Start development server (runs both backend + frontend)
npm run dev

# Access at your Replit URL
```

---

## Required API Keys & Services

### Essential (Phase 1)

1. **Solana RPC Endpoint** (High Priority)
   - Providers: Helius, QuickNode, Alchemy, or Triton
   - Need both Mainnet + Devnet access
   - Recommended: High-throughput plan for production
   - Add to `.env`: `SOLANA_RPC_ENDPOINT=https://xxxxx`
   - Add to `.env`: `SOLANA_DEVNET_RPC=https://xxxxx`

2. **Deep3 Labs API Key** (For Pro Tier)
   - Sign up at Deep3 Labs platform
   - Get production API credentials
   - Configure rate limits and pricing tier
   - Add to `.env`: `DEEP3_API_KEY=xxxxx`

3. **Jupiter/Pyth Price Oracles** ($CATH/SOL Pricing)
   - Jupiter Aggregator API (free): `https://quote-api.jup.ag/v6`
   - Pyth Network price feeds
   - Add to `.env`: `PYTH_PRICE_FEED_ID=xxxxx`

### Required NPM Packages

```bash
# Install Solana wallet adapters
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base @solana/spl-token

# Price oracle integrations
npm install @pythnetwork/client
```

### Optional (Future Enhancements)

- **Solana Name Service SDK** - For .sol domain claiming
- **GenesysGo Shadow Drive** - Decentralized storage for bot configs
- **Metaplex SDK** - For NFT pass verification

---

## Environment Variables

Add these to your Replit Secrets (or `.env` file):

```bash
# Already configured
SESSION_SECRET=xxxxx

# Solana Integration
SOLANA_RPC_ENDPOINT=https://xxxxx
SOLANA_DEVNET_RPC=https://xxxxx
CATH_TOKEN_MINT_ADDRESS=xxxxx

# Deep3 Labs AI
DEEP3_API_KEY=xxxxx
DEEP3_API_ENDPOINT=https://api.deep3labs.com/v1

# Price Oracles
JUPITER_API_URL=https://quote-api.jup.ag/v6
PYTH_PRICE_FEED_ID=xxxxx

# Optional: For production deployment
DATABASE_URL=postgresql://xxxxx (when migrating from in-memory storage)
```

---

## Project Architecture

### Key Files to Review

**📁 Data Models & Types:**
```
shared/schema.ts          - Complete database schema (wallets, transactions, bots, NFT passes)
server/storage.ts         - Storage interface (ready for PostgreSQL migration)
```

**📁 Monetization Logic:**
```
server/cath-utils.ts      - $CATH token utilities (CURRENTLY MOCKED - NEEDS REAL API)
server/payment-utils.ts   - Bot payment fee calculations
server/routes.ts          - All API endpoints (payments, tiers, bots, passes)
```

**📁 Services to Replace (CRITICAL):**
```
server/deep3-mock.ts      - MOCK AI threat analysis → Replace with real Deep3 API
lib/solana-mock.ts        - MOCK wallet connection → Replace with real wallet adapters
```

**📁 Frontend Pages:**
```
client/src/pages/home.tsx       - Landing page with hero section
client/src/pages/dashboard.tsx  - Main app UI (transactions, bots)
client/src/pages/tiers.tsx      - Tier comparison page
```

**📁 Frontend Components:**
```
client/src/components/WalletConnectModal.tsx  - Wallet connection UI
client/src/components/Dashboard.tsx           - Main dashboard
client/src/components/ArbitrageBotPanel.tsx   - Bot management UI
client/src/components/ImportBotDialog.tsx     - JSON template import
```

---

## Implementation Roadmap

### Phase 1: Solana Wallet Integration (HIGHEST PRIORITY)

**Current State:** Mock wallet in `lib/solana-mock.ts`

**Tasks:**
1. Install Solana wallet adapter packages (see above)
2. Replace mock wallet with real adapters:
   - Support Phantom, Solflare, Backpack wallets
   - Implement proper wallet connection UI
   - Add wallet disconnection handling
   - Show wallet balance (SOL + $CATH)
3. Update `WalletConnectModal.tsx` to use real wallet adapter
4. Test wallet connection flow end-to-end

**Files to Modify:**
- `lib/solana-mock.ts` → Replace with real implementation
- `client/src/components/WalletConnectModal.tsx`
- `client/src/App.tsx` (add WalletProvider)

**Reference:**
- [Solana Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)

---

### Phase 2: $CATH Token On-Chain Verification

**Current State:** Mocked in `server/cath-utils.ts` (see `getCathHoldings()`)

**Tasks:**
1. Implement real SPL token balance verification:
   ```typescript
   // Replace getCathHoldings() in server/cath-utils.ts
   import { Connection, PublicKey } from '@solana/web3.js';
   import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
   
   async function getCathHoldings(walletAddress: string): Promise<number> {
     const connection = new Connection(process.env.SOLANA_RPC_ENDPOINT!);
     const walletPubkey = new PublicKey(walletAddress);
     const cathMint = new PublicKey(process.env.CATH_TOKEN_MINT_ADDRESS!);
     
     const tokenAddress = await getAssociatedTokenAddress(cathMint, walletPubkey);
     const tokenAccount = await getAccount(connection, tokenAddress);
     
     return Number(tokenAccount.amount) / 1e9; // Adjust for decimals
   }
   ```

2. Connect to Jupiter/Pyth for real-time $CATH/SOL pricing
3. Update `fetchCathPriceInSol()` with real price feeds
4. Add transaction signature verification for payments

**Files to Modify:**
- `server/cath-utils.ts` (replace all mock functions)

**Critical Security Rule:**
⚠️ **NEVER trust client-side token balances** - Always verify on-chain

---

### Phase 3: Deep3 Labs AI Integration

**Current State:** Mock responses in `server/deep3-mock.ts`

**Tasks:**
1. Replace mock with real Deep3 API calls:
   ```typescript
   // server/deep3-service.ts (create new file)
   import axios from 'axios';
   
   export async function analyzeToken(tokenAddress: string, metadata: any) {
     const response = await axios.post(
       process.env.DEEP3_API_ENDPOINT + '/analyze',
       { tokenAddress, metadata },
       { headers: { 'Authorization': `Bearer ${process.env.DEEP3_API_KEY}` } }
     );
     return response.data;
   }
   ```

2. Implement rate limiting strategy (Pro tier only)
3. Add caching to reduce API costs
4. Handle API errors gracefully (fallback to local classifier)
5. Add webhook support for async analysis

**Files to Modify:**
- `server/deep3-mock.ts` → Delete and replace with `server/deep3-service.ts`
- `server/routes.ts` (update Deep3 analysis endpoints)

**Classification Rule:**
- Local BLOCK always wins (Deep3 can only elevate threats, never reduce)

---

### Phase 4: Smart Contracts for Payments

**Current State:** Payment logic exists but uses mock transactions

**Tasks:**
1. Build Solana smart contracts (Anchor framework recommended):
   - Tier subscription contract (Pro/Pro+ monthly payments)
   - Bot activation contract (additional bot slot purchases)
   - NFT pass verification contract (benefit enforcement)

2. Implement on-chain payment processing:
   - Accept SOL payments
   - Accept $CATH token payments
   - Store transaction signatures for verification
   - Emit events for tier upgrades

3. Update frontend to trigger on-chain transactions
4. Add transaction confirmation UI

**Files to Create:**
- `contracts/` directory (Anchor smart contracts)
- `server/blockchain-service.ts` (contract interaction logic)

**Payment Flow:**
```
User clicks "Upgrade to Pro" 
→ Frontend creates transaction 
→ User signs with wallet 
→ Backend verifies transaction signature 
→ Update user tier in database 
→ WebSocket broadcasts tier change
```

---

### Phase 5: NFT Pass System

**Current State:** Schema exists, API endpoints ready, no on-chain verification

**Tasks:**
1. Implement NFT ownership verification:
   ```typescript
   import { Metaplex } from '@metaplex-foundation/js';
   
   async function verifyNFTOwnership(walletAddress: string, nftMint: string) {
     const connection = new Connection(process.env.SOLANA_RPC_ENDPOINT!);
     const metaplex = Metaplex.make(connection);
     
     const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(nftMint) });
     return nft.owner.toString() === walletAddress;
   }
   ```

2. Parse NFT metadata for pass benefits:
   - Fee waivers
   - Additional bot slots
   - Temporary tier upgrades
   - Expiration dates

3. Automatic pass detection when wallet connects
4. Build UI for pass activation/deactivation

**Files to Modify:**
- `server/routes.ts` (NFT pass endpoints)
- `client/src/components/Dashboard.tsx` (show active passes)

**Pass Benefits (from NFT metadata):**
```json
{
  "attributes": [
    { "trait_type": "benefit", "value": "fee_waiver" },
    { "trait_type": "bot_slots", "value": "2" },
    { "trait_type": "tier_upgrade", "value": "pro_plus" },
    { "trait_type": "expires_at", "value": "2025-12-31" }
  ]
}
```

---

### Phase 6: Arbitrage Bot Engine

**Current State:** Bot management UI exists, no real trading logic

**Tasks:**
1. Build bot execution engine (separate process from web app):
   - Connect to Solana DEX APIs (Jupiter, Raydium, Orca)
   - Implement MEV protection strategies
   - Execute trades based on bot configurations
   - Track performance metrics

2. Implement bot strategies:
   - Cross-DEX arbitrage
   - Token pair monitoring
   - Price threshold triggers
   - Slippage protection

3. Add real-time bot status updates via WebSocket
4. Build performance analytics dashboard

**Files to Create:**
- `bot-engine/` directory (separate application)
- `bot-engine/strategies/` (trading strategies)
- `bot-engine/executor.ts` (trade execution)

**Bot Architecture:**
```
Web App (this project) 
→ User configures bot via UI 
→ Bot config saved to database 
→ Bot Engine (separate app) reads config 
→ Executes trades on Solana 
→ Sends status updates to Web App via WebSocket
```

---

### Phase 7: Solana Name Service (.sol domains)

**Current State:** Not implemented

**Tasks:**
1. Integrate Solana Name Service SDK
2. Create subdomain system: `xxxx.wbuddhi.cooperanth.sol`
3. Build UI for domain claiming
4. Add domain management features

**Future Feature:** Users can claim personalized addresses for their wallets

---

## Monetization System (Complete Implementation)

### Pricing Structure

**App Purchase:**
- One-time $0.99 fee (required for all users)

**Base Monthly Fee:**
- $0.99/month (applies to ALL tiers including Basic)
- **Waived if:** User holds $CATH worth ≥ 0.005 SOL

**Tier Access:**
1. **Basic (Free):** Local spam classifier, real-time monitoring
2. **Pro ($9.99/mo OR 50 $CATH):** Basic + Deep3 AI + advanced risk scoring
3. **Pro+ ($29.99/mo OR 100 $CATH):** Pro + up to 5 arbitrage bots

**Tier Resolution Priority:**
```
$CATH holdings > Paid subscription > Default (Basic)
```

**Bot Fee Structure:**
- First 2 bots: Free monthly fee, 0.5% transaction fee
- Additional 3 bots: 0.0009 SOL/month + 0.5% transaction fee

**NFT Pass Benefits:**
- Fee waivers
- Additional bot slots
- Temporary tier upgrades

### Key API Endpoints

**Payments:**
```
POST /api/payments/app-purchase       - $0.99 one-time purchase
POST /api/payments/base-monthly       - $0.99/month base fee
POST /api/payments/tier-subscription  - Pro/Pro+ subscription
POST /api/payments/bot-monthly        - Bot slot payment
GET  /api/payments/calculate/:walletId - Payment summary
```

**Tier Management:**
```
GET  /api/tiers/resolve/:walletId     - Resolve tier (checks $CATH holdings)
PATCH /api/wallets/:id/payment-preference - Set SOL or CATH payment
```

**NFT Passes:**
```
POST /api/passes/activate             - Activate NFT pass
POST /api/passes/deactivate           - Deactivate NFT pass
```

---

## Security Checklist (CRITICAL)

### Must Follow

1. ⚠️ **NEVER trust client-side data**
   - Always verify SPL token balances on-chain
   - Validate transaction signatures server-side
   - Never accept client-reported $CATH balances

2. ⚠️ **Use trusted price oracles**
   - Never rely on single price source
   - Implement fallback oracles
   - Cache prices with reasonable TTL (currently 60s)

3. ⚠️ **Rate limit all API endpoints**
   - Prevent abuse of Deep3 API (costs money)
   - Limit wallet creation attempts
   - Throttle bot activation requests

4. ⚠️ **Sanitize all user inputs**
   - Bot template JSON import (already validated with Zod)
   - Wallet addresses (validate Solana pubkey format)
   - Transaction signatures

5. ⚠️ **Secure WebSocket connections**
   - Verify wallet ownership before sending sensitive data
   - Use authentication tokens
   - Prevent unauthorized subscriptions

---

## Database Migration (When Ready)

**Current:** In-memory storage (see `server/storage.ts`)

**Future:** PostgreSQL via Drizzle ORM

**Migration Steps:**
1. Uncomment PostgreSQL code in `server/storage.ts`
2. Set `DATABASE_URL` environment variable
3. Run migrations: `npm run db:migrate`
4. Update storage initialization in `server/index.ts`

The storage interface (`IStorage`) is already designed for easy migration.

---

## Testing Strategy

### Unit Tests (To Be Added)

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Test files to create:
server/__tests__/cath-utils.test.ts
server/__tests__/payment-utils.test.ts
client/src/__tests__/Dashboard.test.tsx
```

### E2E Testing

Use Playwright (already supported by Replit):
```bash
# Test critical flows:
1. Wallet connection → Dashboard load
2. Tier upgrade → Payment → Access granted
3. Bot import → Validation → Activation
4. NFT pass activation → Benefits applied
```

---

## WebSocket Real-Time Updates

**Current Implementation:** `server/websocket.ts`

**Broadcasts:**
- New transactions detected
- Threat classifications
- Bot status changes
- Tier upgrades
- Payment status updates

**Frontend Subscription:**
```typescript
// Already implemented in Dashboard
const ws = new WebSocket(`wss://.../?token=${walletId}`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle: transaction, bot_status, tier_update
};
```

---

## Design Specifications

### Visual Style
- **Theme:** Dark mode by default (security-focused)
- **Inspiration:** Phantom/Solflare clean modern interface
- **Mascot:** Blue shield character (see `attached_assets/`)
- **Responsive:** Mobile-first design

### Color Palette
```css
/* Primary Blue */
--primary: 220 85% 58%;

/* Solana Purple */
--solana-purple: 265 75% 65%;

/* See client/src/index.css for complete palette */
```

### Typography
- **UI Font:** Inter (Google Fonts)
- **Monospace:** JetBrains Mono (for addresses, signatures)

### UI Components
- Uses Shadcn UI (TailwindCSS-based)
- All components in `client/src/components/ui/`
- Dark mode variants pre-configured

---

## Code Conventions

### Backend
- Use TypeScript strict mode
- Validate all inputs with Zod schemas
- Keep routes thin (business logic in services)
- Use storage interface (never direct DB access)

### Frontend
- Use React Query for all API calls
- No direct fetch() calls (use queryClient)
- Always show loading/error states
- Add `data-testid` to interactive elements

### Naming
- API routes: `/api/resource` (plural)
- Components: PascalCase
- Files: kebab-case
- Types: PascalCase with descriptive suffixes (e.g., `WalletInsert`)

---

## Common Pitfalls to Avoid

1. **Don't use mock data in production**
   - Replace all mock services before deployment
   - Remove `server/deep3-mock.ts` and `lib/solana-mock.ts`

2. **Don't skip transaction verification**
   - Every payment must be verified on-chain
   - Store transaction signatures for audit

3. **Don't hardcode RPC endpoints**
   - Always use environment variables
   - Support multiple RPC providers (fallback)

4. **Don't expose sensitive data via WebSocket**
   - Authenticate WebSocket connections
   - Filter data by wallet ownership

5. **Don't trust client-side tier calculation**
   - Always use `resolveTier()` server-side
   - Re-verify on every protected endpoint

---

## Deployment Checklist

### Before Production

- [ ] Replace all mock services with real implementations
- [ ] Add all required API keys to Replit Secrets
- [ ] Migrate from in-memory to PostgreSQL
- [ ] Enable rate limiting on all endpoints
- [ ] Add monitoring/logging (e.g., Sentry)
- [ ] Test wallet adapters with real wallets
- [ ] Verify smart contracts on Solana Explorer
- [ ] Test payment flows with real SOL (devnet first)
- [ ] Add error tracking and alerts
- [ ] Configure CORS for production domain

### Domain Setup

- [ ] Configure `wbuddhi.cooperanth.sol` via Solana Name Service
- [ ] Set up SSL/TLS certificates
- [ ] Configure DNS records
- [ ] Test PWA installation flow

---

## Support & Resources

### Documentation
- **Project Docs:** `replit.md` (complete architecture)
- **Solana Docs:** https://docs.solana.com/
- **Wallet Adapter:** https://github.com/solana-labs/wallet-adapter
- **Deep3 Labs:** (Contact for API documentation)

### Key Contacts
- **Project Owner:** [Your contact info]
- **Design Assets:** See `attached_assets/` folder
- **Questions:** [Communication channel]

---

## Next Steps

1. **Set up Solana RPC endpoint** (QuickNode/Helius)
2. **Install wallet adapter packages**
3. **Replace `lib/solana-mock.ts`** with real implementation
4. **Test wallet connection** with Phantom/Solflare
5. **Implement on-chain $CATH verification**
6. **Integrate Deep3 Labs API**
7. **Build smart contracts** for payments

**Priority:** Get wallet connection working first, then tackle payments!

---

## Questions?

If you encounter issues or need clarification:
1. Review `replit.md` for architecture details
2. Check `shared/schema.ts` for data model
3. Read code comments in key files
4. Test thoroughly on Solana devnet before mainnet

**Good luck building Wallet Buddhi! 🚀**
