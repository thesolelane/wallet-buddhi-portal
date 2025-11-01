# Wallet Buddhi Portal

> **🚨 IMPORTANT**: This repository contains the **PORTAL** (web management interface), NOT the mobile app or other Wallet Buddhi components.

## What is This?

This is the **Wallet Buddhi Portal** - a web-based management interface where users:
- Get assigned custom Solana wallet subdomains (xxxx.wbuddhi.sol)
- Upgrade subscription tiers (Basic → Pro → Pro+)
- Manage arbitrage trading bots (Pro+ tier)
- Monitor wallet transactions and security threats

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

## License

MIT

---

**Partnership**: Powered by [Cooperanth Consulting LLC](https://cooperanth.com)
