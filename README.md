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

<p align="center">
  <img src="https://img.shields.io/badge/Solana-14F195?style=for-the-badge&logo=solana&logoColor=white" alt="Solana"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
</p>

---

> **🚨 IMPORTANT**: This repository contains the **PORTAL** (web management interface), NOT the mobile app or other Wallet Buddhi components.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Domains](#domains)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [User Onboarding Flows](#user-onboarding-flows)
- [API Documentation](#api-documentation)
- [Smart Contracts](#smart-contracts)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [Related Repositories](#related-repositories)
- [License](#license)
- [Support](#support)

## Overview

The **Wallet Buddhi Portal** is a decentralized web application that serves as the central management hub for the Wallet Buddhi ecosystem. Built on Solana blockchain, it provides users with:

- 🎯 **Custom Wallet Assignment** - Personalized Solana Name Service subdomains (xxxx.wbuddhi.sol)
- 📈 **Tiered Subscriptions** - Flexible pricing with Basic (free), Pro, and Pro+ tiers
- 🤖 **Arbitrage Bot Management** - Automated trading across Solana DEXs (Pro+ tier)
- 🛡️ **Security Monitoring** - Real-time transaction monitoring and AI-powered threat detection
- 💳 **On-Chain Payments** - Direct SOL or $CATH token payments via Solana Pay
- 📱 **Mobile Integration** - Verification codes for seamless mobile app authentication

The portal acts as the source of truth for user identities, tier management, NFT pass distribution, and wallet assignments across the entire Wallet Buddhi ecosystem.

## Features

✅ **Wallet Authentication** - Official Solana Wallet Adapter (Phantom, Solflare, Backpack)  
✅ **Custom Wallet Assignment** - Personalized xxxx.wbuddhi.sol subdomains via SNS  
✅ **Tiered Subscriptions** - Basic (free), Pro, Pro+ with on-chain verification  
✅ **Payment Processing** - SOL or $CATH token payments via Solana Pay  
✅ **AI Security** - Deep3 Labs threat detection (Pro/Pro+ tiers)  
✅ **Arbitrage Bots** - Automated trading across Solana DEXs (Pro+ tier)  
✅ **Mobile App Integration** - Verification codes for app downloads  
✅ **NFT Pass Management** - On-chain tier verification tokens  
✅ **Upgrade Capsules** - NFT-based software upgrades with burn-to-earn rewards  

## Domains

**Web2 (Universal Access):**
- `walletbuddhi.io` - Main public-facing portal

**Solana Name Service (Crypto-Native):**
- `portal.wbuddhi.sol` - Portal access via SNS
- `wbuddhi.sol` - Root registry (owned by Squads multisig)
- `xxxx.wbuddhi.sol` - Individual user wallet subdomains

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: Wouter (lightweight client-side routing)
- **UI Library**: Shadcn UI (Radix UI primitives)
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query v5 (React Query)
- **Forms**: React Hook Form + Zod validation
- **Wallet Integration**: @solana/wallet-adapter-react (official)

### Backend
- **Server**: Express.js + TypeScript
- **Runtime**: Node.js 20
- **Storage**: In-memory (MemStorage) with PostgreSQL-ready interface
- **ORM**: Drizzle ORM (configured for migration)
- **Database**: Neon Serverless PostgreSQL (ready to activate)

### Blockchain
- **Network**: Solana (devnet/mainnet configurable)
- **Smart Contracts**: Anchor framework (Rust)
- **Wallet Support**: Phantom, Solflare, Backpack (explicit adapters)
- **Payments**: Solana Pay protocol
- **Tokens**: Native SOL + $CATH SPL token
- **Name Service**: Solana Name Service (SNS) for wallet subdomains

### Infrastructure
- **Deployment**: Replit (with planned custom domain)
- **Domain Management**: Squads multisig for root domain control
- **Session Management**: Express-session (prepared for activation)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn package manager
- (Optional) Solana CLI for smart contract deployment
- (Optional) Rust + Anchor for smart contract development

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wallet-buddhi-portal.git
   cd wallet-buddhi-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables** (optional)
   ```bash
   # Create .env file (optional - defaults work fine)
   echo "SOLANA_NETWORK=devnet" > .env
   echo "VITE_SOLANA_NETWORK=devnet" >> .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the portal**
   - Open http://localhost:5000 in your browser
   - Connect a Solana wallet (Phantom, Solflare, or Backpack)

### Available Scripts

```bash
npm run dev      # Start development server (frontend + backend)
npm run build    # Build for production
npm run start    # Start production server
npm run check    # TypeScript type checking
npm run db:push  # Sync database schema (when DB is configured)
```

## Project Structure

```
wallet-buddhi-portal/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── pages/                  # Route pages
│   │   │   ├── Home.tsx           # Landing page with hero and pricing
│   │   │   ├── Dashboard.tsx      # User dashboard (protected)
│   │   │   ├── GettingStarted.tsx # User onboarding guide
│   │   │   ├── FAQ.tsx            # Frequently asked questions
│   │   │   ├── Security.tsx       # Security best practices
│   │   │   └── NotFound.tsx       # 404 error page
│   │   ├── components/            # Reusable UI components
│   │   │   ├── ui/               # Shadcn UI primitives
│   │   │   ├── Header.tsx        # Navigation header
│   │   │   ├── Footer.tsx        # Site footer
│   │   │   ├── WalletButton-new.tsx  # Wallet connection button
│   │   │   └── TierBadge.tsx     # Tier display badge
│   │   ├── lib/                  # Core utilities
│   │   │   ├── SolanaProvider.tsx    # Wallet adapter provider
│   │   │   ├── wallet-context-new.tsx # Wallet state management
│   │   │   ├── program-client.ts     # Smart contract client
│   │   │   └── queryClient.ts        # TanStack Query config
│   │   ├── App.tsx               # Root component with routes
│   │   └── main.tsx              # React entry point
│   └── index.html                # HTML template
│
├── server/                         # Express backend API
│   ├── index.ts                   # Server entry point
│   ├── routes.ts                  # API route handlers
│   ├── storage.ts                 # Storage interface + in-memory impl
│   ├── payments.ts                # Solana Pay integration
│   ├── program-service.ts         # Smart contract service
│   └── vite.ts                    # Vite dev server integration
│
├── programs/                      # Solana smart contracts (Anchor)
│   └── wallet-buddhi/
│       └── src/
│           └── lib.rs            # Tier management contract (Rust)
│
├── shared/                        # Shared TypeScript types
│   └── schema.ts                 # Database schema + Zod validators
│
├── attached_assets/              # Static assets
│   └── [logos, banners, etc.]
│
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts               # Vite build configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── drizzle.config.ts            # Drizzle ORM configuration
├── Anchor.toml                  # Anchor framework config
└── README.md                    # This file
```

## API Documentation

### Authentication

All protected endpoints require a connected Solana wallet. The wallet address is used as the primary identifier.

### Endpoints

#### Wallet Management

**GET /api/wallet/:address**
```typescript
// Get or create wallet account
Response: {
  id: string
  walletAddress: string
  tier: "basic" | "pro" | "pro+"
  onChainTier: "basic" | "pro" | "pro+"
}
```

**GET /api/wallet/:address/tier**
```typescript
// Get on-chain tier status
Response: {
  tier: string
  tierEnum: number
}
```

#### Payment Processing

**POST /api/payments/create**
```typescript
Request: {
  walletAddress: string
  tier: "pro" | "pro+"
  currency: "sol" | "cath"
}

Response: {
  paymentUrl: string
  referenceKey: string
  amount: string
  currency: string
  transactionId: string
}
```

**POST /api/payments/verify**
```typescript
Request: {
  referenceKey: string
}

Response: {
  status: "pending" | "confirmed"
  tier?: string
  signature?: string
  onChainSignature?: string
}
```

**GET /api/payments/status/:referenceKey**
```typescript
// Check payment transaction status
Response: {
  status: string
  tier: string
  amount: string
  currency: string
  signature: string | null
  createdAt: Date
  confirmedAt: Date | null
}
```

#### Verification Codes (Coming Soon)

**POST /api/verification/generate**
```typescript
// Generate verification code for mobile app
Request: {
  walletAddress: string
}

Response: {
  code: string
  expiresAt: Date
}
```

**POST /api/verification/validate**
```typescript
// Validate verification code from mobile app
Request: {
  code: string
}

Response: {
  valid: boolean
  walletAddress: string
  assignedSubdomain: string
}
```

## Smart Contracts

### Wallet Buddhi Program

**Program ID:** `EcorGtD2gpLK9FRGHCJwSd1PPRhVo2yDWYkpEvPfoogQ` (devnet)

**Status:** Written but not deployed (requires Rust toolchain for compilation)

### Program Instructions

1. **initialize_user**
   - Creates a new UserAccount PDA for a wallet address
   - Default tier: Basic
   - One-time operation per wallet

2. **upgrade_tier**
   - Updates user tier after payment verification
   - Validates payment signature
   - Updates on-chain tier status

3. **get_user_tier**
   - Queries current tier from on-chain account
   - Returns tier enum (0=Basic, 1=Pro, 2=Pro+)

### Deployment Guide

To deploy the smart contract:

```bash
# Install Rust and Solana CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
npm install -g @coral-xyz/anchor-cli

# Build the program
cd programs/wallet-buddhi
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update program ID in code with deployed address
```

## Related Repositories

This is the **portal** component. Other Wallet Buddhi components:
- **Mobile App**: `thesolelane/wallet-buddhi-app` (iOS/Android)
- **Browser Extension**: (separate repository - if exists)
- **Backend Services**: (separate repository - if exists)

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

## Configuration

### Environment Variables

Create a `.env` file in the root directory (optional - defaults work for development):

```bash
# Solana Network Configuration
SOLANA_NETWORK=devnet              # Options: devnet, mainnet-beta
VITE_SOLANA_NETWORK=devnet         # Frontend Solana network

# Session Secret (required for production)
SESSION_SECRET=your-secret-key-here

# Database (optional - currently using in-memory storage)
# DATABASE_URL=postgresql://user:password@host:port/database
```

### Network Configuration

**Devnet (Default)**
- RPC Endpoint: `https://api.devnet.solana.com`
- Use for development and testing
- Free SOL from faucet available

**Mainnet-Beta (Production)**
- RPC Endpoint: `https://api.mainnet-beta.solana.com`
- Use for production deployment
- Real SOL and $CATH tokens required

### Domain Configuration

To deploy on custom domain:

1. **Acquire Domain**: Register `walletbuddhi.io`
2. **Configure DNS**: Point to Replit deployment
3. **SNS Setup**: Configure `portal.wbuddhi.sol` to resolve to web2 domain
4. **SSL/TLS**: Automatically handled by Replit

## Deployment

### Replit Deployment (Current)

The portal is hosted on Replit with automatic deployment:

1. **Push to Git**: Changes automatically trigger rebuild
2. **Workflow Restart**: Automatically restarts on file changes
3. **Environment**: Production mode enabled via `NODE_ENV=production`

**Access:**
- Development: `https://[your-repl].replit.dev`
- Production: `https://walletbuddhi.io` (when configured)

### Custom Domain Setup

1. **Register Domain**: `walletbuddhi.io`
2. **Replit Settings**:
   - Navigate to Replit deployment settings
   - Add custom domain
   - Copy provided DNS records
3. **DNS Configuration**:
   - Add A/CNAME records to domain registrar
   - Wait for DNS propagation (24-48 hours)
4. **SSL Certificate**: Auto-provisioned by Replit

### Database Migration (When Ready)

Currently using in-memory storage. To migrate to PostgreSQL:

1. **Create Database**:
   ```bash
   # Use Replit's database creation tool
   # Or provision Neon Serverless PostgreSQL
   ```

2. **Set DATABASE_URL**:
   ```bash
   DATABASE_URL=postgresql://user:password@host/db
   ```

3. **Push Schema**:
   ```bash
   npm run db:push
   ```

4. **Update Storage**:
   - Replace `MemStorage` with database implementation
   - Restart server

## Security

### Best Practices

✅ **Never expose private keys** - Wallet adapter handles signing securely  
✅ **HTTPS only** - All production traffic encrypted  
✅ **Input validation** - Zod schemas validate all API requests  
✅ **Rate limiting** - Implement on payment endpoints  
✅ **CORS configuration** - Restrict to trusted domains  
✅ **Session secrets** - Use strong, random SESSION_SECRET in production  

### Wallet Security

- Portal **never** requests private keys
- All transactions signed in user's wallet (Phantom/Solflare/Backpack)
- Users maintain full custody of funds
- Smart contract interactions require explicit user approval

### Smart Contract Security

- Anchor framework provides built-in security features
- Program-derived addresses (PDAs) prevent unauthorized access
- Payment verification before tier upgrades
- On-chain audit trail for all tier changes

### Reported Vulnerabilities

To report security vulnerabilities:
- **Email**: security@cooperanth.com
- **Response Time**: 24-48 hours
- **Disclosure**: Coordinated disclosure policy

## Contributing

We welcome contributions to the Wallet Buddhi Portal! Here's how to get started:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation
4. **Test your changes**
   ```bash
   npm run check    # TypeScript type checking
   npm run dev      # Manual testing
   ```
5. **Commit with clear messages**
   ```bash
   git commit -m "feat: add verification code API endpoint"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Follow existing patterns
- **Naming**: Descriptive, camelCase for variables/functions
- **Comments**: Only for complex logic (code should be self-documenting)

### Commit Message Convention

```
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features (discuss in issues first)
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🔒 Security improvements
- ⚡ Performance optimizations

## Roadmap

### Phase 1: MVP (Current)
- [x] Wallet authentication (Phantom, Solflare, Backpack)
- [x] Tier management (Basic/Pro/Pro+)
- [x] Payment processing (SOL/$CATH)
- [x] Basic dashboard
- [ ] Verification code system for mobile app
- [ ] Deploy smart contracts to devnet

### Phase 2: Production
- [ ] Deploy to `walletbuddhi.io`
- [ ] Migrate to PostgreSQL database
- [ ] Deploy smart contracts to mainnet
- [ ] Transfer `wbuddhi.sol` to Squads multisig
- [ ] Deep3 Labs AI integration
- [ ] Full mobile app integration

### Phase 3: Advanced Features
- [ ] Arbitrage bot assignment (Pro+ tier)
- [ ] Real-time transaction monitoring
- [ ] NFT pass minting for tier verification
- [ ] Upgrade Capsules system (NFT-based software upgrades)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

## Upgrade Capsules System

### Overview

**Upgrade Capsules** are NFTs that unlock new app features and versions. When users "unwrap" (burn) these certificates, they receive software upgrades and earn rewards based on their holdings.

### How It Works

1. **Receive Capsule NFT**
   - Distributed to eligible users (tier-based, campaigns, milestones)
   - Contains version info (e.g., "Upgrade v2", "Feature Pack Pro+")
   - Metadata includes features, rewards, and eligibility requirements

2. **Unwrap/Burn Capsule**
   - User burns NFT through portal or mobile app
   - Smart contract validates authenticity
   - Upgrade data unlocked and synced to app
   - Certificate recorded in Upgrade Vault (not destroyed, kept for audit)

3. **Earn Rewards**
   - Instant payout based on percentage of user's holdings
   - Calculated from snapshot of SOL + $CATH balances
   - Reward percentage defined in capsule metadata
   - Anti-gaming measures: cool-down periods, minimum holding duration

4. **App Upgrade**
   - New features unlock automatically
   - Upgrade manifest downloaded from IPFS/Arweave
   - Version state recorded on-chain
   - Cannot redeem same capsule twice

### Naming & Types

**Upgrade Capsules** (primary name) can include:
- **Version Capsules**: "v2.0 Upgrade Capsule"
- **Feature Capsules**: "Pro+ Trading Bot Capsule"
- **Event Capsules**: "Early Adopter Capsule"
- **Bonus Capsules**: "Loyalty Reward Capsule"

### Technical Architecture

**Smart Contracts:**
- `UpgradeRegistry` - Stores authorized capsule definitions
- `UpgradeVault` - Tracks wallet upgrade state, prevents duplicates
- `RewardEscrow` - Manages reward distribution (multisig controlled)

**Capsule Metadata (stored on IPFS/Arweave):**
```json
{
  "name": "Wallet Buddhi v2.0 Upgrade Capsule",
  "version": "2.0.0",
  "features": [
    "advanced-analytics",
    "multi-wallet-support",
    "enhanced-security-dashboard"
  ],
  "manifestURI": "ipfs://Qm...",
  "eligibility": {
    "minTier": "pro",
    "minHoldingDuration": 30
  },
  "rewards": {
    "percentage": 2.5,
    "assetTypes": ["SOL", "CATH"],
    "maxReward": 100
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Burn-to-Upgrade Flow:**
1. User initiates burn via portal/app
2. Portal calls Upgrade Vault program
3. Vault validates capsule authenticity (registry signature)
4. Marks capsule as redeemed (single-use protection)
5. Calculates reward from holdings snapshot
6. Distributes rewards from escrow
7. Emits upgrade event with manifest URI
8. App downloads and caches upgrade data

### Security Features

✅ **Registry Signatures** - Only capsules signed by multisig are valid  
✅ **Single-Use Enforcement** - UpgradeVault prevents duplicate redemptions  
✅ **Anti-Sybil Protection** - Minimum holding duration requirements  
✅ **Reward Caps** - Maximum reward limits prevent exploitation  
✅ **Cool-Down Periods** - Time delays between redemptions  
✅ **Audit Trail** - Burned capsules kept in vault for compliance  

### Distribution Strategy

**Who Receives Capsules:**
- Pro/Pro+ tier users (priority access)
- Early adopters and beta testers
- Campaign participants
- Community milestones (e.g., 10,000 users)
- Staking/loyalty programs

**Minting Method:**
- Compressed NFTs for scalability
- Candy Machine or programmable drops
- Controlled by Squads multisig
- Batch minting for campaigns

### Reward Calculation

**Holdings Snapshot:**
```typescript
// Example reward calculation
const solBalance = await getSOLBalance(wallet);
const cathBalance = await getCATHBalance(wallet);
const totalValue = (solBalance * solPrice) + (cathBalance * cathPrice);

const rewardPercentage = capsule.rewards.percentage; // e.g., 2.5%
const rawReward = totalValue * (rewardPercentage / 100);
const finalReward = Math.min(rawReward, capsule.rewards.maxReward);
```

**Reward Distribution:**
- Paid in $CATH tokens
- Sourced from multisig-controlled escrow
- Instant payout upon successful burn
- Transaction recorded on-chain

### User Benefits

🎁 **Instant Upgrades** - New features unlock immediately  
💰 **Earn While Upgrading** - Get rewarded for staying current  
🔒 **Verified Authenticity** - On-chain proof of legitimate software  
📈 **Holder Incentives** - Rewards scale with portfolio size  
🎯 **Exclusive Access** - Early feature releases for engaged users  

### Example Scenarios

**Scenario 1: Pro User with 100 SOL + 5,000 $CATH**
- Receives "v2.0 Upgrade Capsule" (2.5% reward)
- Burns capsule → Unlocks v2.0 features
- Portfolio value: $15,000 (example)
- Reward: $375 in $CATH (2.5% of $15,000)
- Features unlocked: Advanced analytics, multi-wallet support

**Scenario 2: Pro+ User - Early Adopter Bonus**
- Receives "Early Adopter Capsule" (5% reward)
- Burns within 30 days → Higher reward percentage
- Gets commemorative "Genesis User" badge NFT
- Priority access to future capsules

## Troubleshooting

### Common Issues

**Wallet won't connect**
- Ensure wallet extension is installed and unlocked
- Try refreshing the page
- Clear browser cache and cookies
- Check browser console for errors

**Payment not confirming**
- Wait 30-60 seconds for blockchain confirmation
- Check transaction on Solana Explorer
- Ensure sufficient SOL for transaction fees
- Verify correct network (devnet/mainnet)

**Build errors**
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`
- Check Node.js version: `node -v` (should be 20.x)

**Port already in use**
- Kill process on port 5000: `lsof -ti:5000 | xargs kill -9`
- Or use different port in configuration

## Support

### Community

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/wallet-buddhi-portal/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/yourusername/wallet-buddhi-portal/discussions)

### Professional Support

For enterprise support, integrations, or custom development:

- **Website**: [cooperanth.com](https://cooperanth.com)
- **Email**: support@cooperanth.com

### Documentation

- **Solana Documentation**: [docs.solana.com](https://docs.solana.com)
- **Anchor Framework**: [anchor-lang.com](https://www.anchor-lang.com)
- **Wallet Adapter**: [solana-labs.github.io/wallet-adapter](https://solana-labs.github.io/wallet-adapter/)

## Acknowledgments

Built with:
- [Solana](https://solana.com) - High-performance blockchain
- [Anchor](https://www.anchor-lang.com) - Solana development framework
- [React](https://react.dev) - UI framework
- [Shadcn UI](https://ui.shadcn.com) - Component library
- [Replit](https://replit.com) - Development and deployment platform

## License

MIT License - see [LICENSE](LICENSE) file for details

---

<p align="center">
  <strong>Partnership</strong><br/>
  Powered by <a href="https://cooperanth.com">Cooperanth Consulting LLC</a>
</p>

<p align="center">
  <sub>Built with ❤️ for the Solana ecosystem</sub>
</p>
