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
