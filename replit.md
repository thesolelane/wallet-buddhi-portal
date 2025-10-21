# Wallet Buddhi - Replit Project Guide

## Overview

Wallet Buddhi is a tiered Solana wallet protection system featuring AI-powered threat detection and automated arbitrage bots. This is the fully decentralized web portal version that provides comprehensive wallet security and DeFi automation tools for crypto-native users.

**Key Features:**
- Three-tier subscription model (Basic, Pro, Pro+)
- Real-time transaction monitoring and threat detection
- AI-powered risk scoring via Deep3 Labs integration
- Automated arbitrage bots for Solana DEXs
- On-chain payments using SOL or $CATH tokens
- Progressive Web App (PWA) with planned Electron distribution

**Target Audience:** Solana ecosystem users with wallets like Phantom, Solflare, and Backpack

**Domain:** wbuddhi.cooperanth.sol (Solana Name Service)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Libraries:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query v5 (React Query) for server state management and caching

**UI Component System:**
- Shadcn UI component library (New York style variant)
- Radix UI primitives for accessible, unstyled components
- TailwindCSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management

**Design System:**
- Primary theme: Dark mode with security-focused color palette
- Brand colors: Primary Blue (220 85% 58%), Solana Purple (265 75% 65%)
- Semantic colors for threat levels: Danger (red), Warning (orange), Success (green), Neutral (gray)
- Typography: Inter font for UI, JetBrains Mono for wallet addresses
- Custom CSS variables for consistent theming across light/dark modes

**State Management:**
- React Context API for wallet connection state and tier management
- TanStack Query for API data caching and synchronization
- Local component state using React hooks

**Key Pages:**
- Home: Landing page with hero, features, pricing tiers
- Dashboard: Protected route showing wallet monitoring, bot management, and analytics
- Not Found: 404 error page

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for the REST API server
- HTTP server creation for potential WebSocket upgrades
- In-memory storage implementation (MemStorage class) ready for database migration

**Development Environment:**
- Vite middleware integration for HMR in development
- Custom logging middleware for request/response tracking
- Error handling middleware with status code normalization

**API Design:**
- RESTful endpoints prefixed with `/api`
- JSON request/response format
- CRUD operations abstracted through IStorage interface

**Storage Interface:**
- Defined user model with username/password fields
- Abstracted storage layer (IStorage) for easy database swapping
- Current implementation: In-memory Map-based storage
- Prepared for PostgreSQL migration via Drizzle ORM

### Data Storage Solutions

**Database (Prepared but Not Active):**
- Drizzle ORM configured for PostgreSQL via Neon serverless driver
- Schema defined in `shared/schema.ts` with user table structure
- Migration configuration ready (`drizzle.config.ts`)
- Environment variable required: `DATABASE_URL`

**Current State:**
- In-memory storage using JavaScript Maps
- User data structure: id (UUID), username (unique), password
- Zod schemas for validation via drizzle-zod

**Migration Path:**
- Storage interface allows seamless transition from in-memory to database
- Run `npm run db:push` to sync schema when database is provisioned

### Authentication and Authorization

**Current Implementation:**
- Wallet-based authentication via Solana wallet connection
- Client-side wallet state management through WalletContext
- Three tier levels: Basic (free), Pro, Pro+ with feature gating

**Future Integration Points:**
- Session management prepared via connect-pg-simple package
- User schema includes password field for potential username/password auth
- Express session middleware ready for implementation

**Access Control:**
- Route-level protection: Dashboard redirects to home if wallet not connected
- Component-level tier checks for feature availability
- Planned on-chain payment verification for tier upgrades

## External Dependencies

### Blockchain & Web3
- **@solana/web3.js**: Solana blockchain interaction (to be integrated)
- Wallet adapters needed: Phantom, Solflare, Backpack

### Database & ORM
- **@neondatabase/serverless**: Neon serverless PostgreSQL driver
- **drizzle-orm**: TypeScript ORM for database operations
- **drizzle-zod**: Zod schema generation from Drizzle schemas

### Third-Party Services

**AI & Analysis (Planned Integration):**
- Deep3 Labs API for advanced threat detection (Pro/Pro+ tiers)
- Required for AI-powered risk scoring and transaction analysis

**Payment Processing:**
- On-chain Solana payments (SOL)
- Token payments via $CATH (Solana SPL token)
- 0% platform fees - direct wallet-to-wallet transfers

**DEX Integrations (For Arbitrage Bots):**
- Jupiter aggregator API
- Raydium DEX API
- Other Solana DEXs for cross-exchange arbitrage

### UI & Styling Libraries
- **@radix-ui/***: 20+ accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **lucide-react**: Icon library
- **react-icons**: Additional icons including Solana logo

### Development & Build Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast development server and optimized production builds
- **esbuild**: Fast JavaScript bundler for backend
- **tsx**: TypeScript execution for development server

### Form & Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Validation resolver integration
- **zod**: Schema validation library

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx & tailwind-merge**: Conditional className utilities
- **nanoid**: Unique ID generation
- **cmdk**: Command palette component

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Project navigation
- **@replit/vite-plugin-dev-banner**: Development environment banner