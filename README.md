# Wallet Buddhi Portal

<p align="center">
  <img src="attached_assets/ChatGPT Image Oct 20, 2025, 01_13_52 PM (1)_1761084038488.png" alt="Wallet Buddhi Logo" width="200"/>
</p>

<p align="center">
  <strong>The central web management interface for Wallet Buddhi</strong><br/>
  Tiered Solana wallet protection with AI-powered security and automated trading
</p>

<p align="center">
  <a href="https://walletbuddhi.io">🌐 walletbuddhi.io</a> | 
  <a href="https://portal.wbuddhi.sol">⚡ portal.wbuddhi.sol</a>
</p>

---

> **🚨 IMPORTANT**: This repository contains the **PORTAL** (web management interface), NOT the mobile app or other Wallet Buddhi components.

## What is This?

This is the **Wallet Buddhi Portal** - a web-based management interface where users:
- 🎯 Get assigned custom Solana wallet subdomains (xxxx.wbuddhi.sol)
- 📈 Upgrade subscription tiers (Basic → Pro → Pro+)
- 🤖 Manage arbitrage trading bots (Pro+ tier)
- 🛡️ Monitor wallet transactions and security threats

## Features

✅ **Wallet Authentication** - Official Solana Wallet Adapter (Phantom, Solflare, Backpack)  
✅ **Custom Wallet Assignment** - Personalized xxxx.wbuddhi.sol subdomains via SNS  
✅ **Tiered Subscriptions** - Basic (free), Pro, Pro+ with on-chain verification  
✅ **Payment Processing** - SOL or $CATH token payments via Solana Pay  
✅ **AI Security** - Deep3 Labs threat detection (Pro/Pro+ tiers)  
✅ **Arbitrage Bots** - Automated trading across Solana DEXs (Pro+ tier)  
✅ **Mobile App Integration** - Verification codes for app downloads  
✅ **NFT Pass Management** - On-chain tier verification tokens  

## Domains

**Web2 (Universal Access):**
- `walletbuddhi.io` - Main public-facing portal

**Solana Name Service (Crypto-Native):**
- `portal.wbuddhi.sol` - Portal access via SNS
- `wbuddhi.sol` - Root registry (owned by Squads multisig)
- `xxxx.wbuddhi.sol` - Individual user wallet subdomains

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Blockchain**: Solana + Anchor framework
- **Wallets**: Official Solana Wallet Adapter (Phantom, Solflare, Backpack)
- **UI**: Shadcn UI + Tailwind CSS
- **State**: TanStack Query (React Query)

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Home, Dashboard, FAQ, etc.
│   │   ├── components/ # Reusable UI components
│   │   └── lib/        # Wallet context, API client
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   └── program-service.ts  # Solana program integration
├── programs/           # Solana smart contracts (Anchor)
│   └── wallet-buddhi/  # Tier management contract
└── shared/             # Shared types between client/server
```

## Development

```bash
# Install dependencies
npm install

# Run development server (frontend + backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Related Components

This is the **portal** component. Other Wallet Buddhi components (if they exist):
- Mobile app (separate repository)
- Browser extension (separate repository)
- Backend services (separate repository)

## User Onboarding Flows

### Flow 1: Basic Tier (Free)
1. User connects wallet to portal
2. Auto-assigned xxxx.wbuddhi.sol subdomain
3. Access to transaction monitoring

### Flow 2: App Store Download
1. User downloads mobile app from iOS/Google Play
2. App prompts for verification code
3. User logs into portal → Generates 6-digit code
4. User enters code in app → Wallet assigned

### Flow 3: Direct Web Purchase
1. User pays SOL or $CATH on portal
2. Tier upgrade processed on-chain
3. Auto-assigned wallet + deep link for app
4. One-tap authentication via Universal Links

## Architecture

**Blockchain:**
- Solana smart contracts (Anchor framework)
- Solana Name Service for wallet subdomains
- Squads multisig for root domain control

**Backend:**
- Express.js + TypeScript API
- In-memory storage (ready for PostgreSQL migration)
- Solana Pay integration

**Frontend:**
- React 18 + TypeScript + Vite
- Shadcn UI + Tailwind CSS
- TanStack Query for state management

## Environment Variables

```bash
# Optional - defaults to devnet
SOLANA_NETWORK=devnet
VITE_SOLANA_NETWORK=devnet
```

## License

MIT

---

<p align="center">
  <strong>Partnership</strong><br/>
  Powered by <a href="https://cooperanth.com">Cooperanth Consulting LLC</a>
</p>
