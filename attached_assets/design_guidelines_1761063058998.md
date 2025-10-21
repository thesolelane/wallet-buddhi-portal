# Wallet Buddhi - Design Guidelines

## Design Approach

**Selected Approach:** Security-First Crypto Interface with Solana Ecosystem Alignment

**Inspiration:** Phantom Wallet's clean minimalism + Solflare's data clarity + enterprise security dashboards

**Core Principles:**
- Trust through transparency: Clear threat classifications, no hidden complexity
- Instant recognition: Color-coded security states users can scan at a glance
- Progressive disclosure: Basic info first, details on demand
- Solana-native feel: Align with familiar Solana wallet aesthetics

---

## Color Palette

### Dark Mode (Primary)
**Brand Colors:**
- Primary Blue: 220 85% 58% (Wallet Buddhi shield blue - trustworthy, protective)
- Secondary Purple: 265 75% 65% (Solana ecosystem alignment)

**Semantic Colors:**
- Danger/Block: 0 85% 60% (critical threats)
- Warning: 38 92% 58% (suspicious activity)
- Success/Safe: 142 75% 48% (verified safe)
- Neutral: 240 5% 65% (pending analysis)

**Backgrounds:**
- App Background: 240 8% 8%
- Card Surface: 240 6% 12%
- Elevated Surface: 240 5% 16%

**Text:**
- Primary Text: 0 0% 98%
- Secondary Text: 240 4% 70%
- Tertiary Text: 240 3% 50%

### Light Mode (Secondary Support)
- App Background: 0 0% 98%
- Card Surface: 0 0% 100%
- Adjust semantic colors for sufficient contrast

---

## Typography

**Font Stack:**
- Primary: Inter (Google Fonts) - modern, readable, crypto-industry standard
- Monospace: JetBrains Mono (for wallet addresses, transaction hashes)

**Scale:**
- Hero/H1: text-4xl font-bold (36px) - Dashboard titles
- H2: text-2xl font-semibold (24px) - Section headers
- H3: text-xl font-semibold (20px) - Card titles
- Body: text-base (16px) - Primary content
- Small: text-sm (14px) - Metadata, timestamps
- Tiny: text-xs (12px) - Labels, badges

**Weights:**
- Bold (700): Headlines, critical alerts
- Semibold (600): Subheadings, tier names
- Medium (500): Interactive elements
- Regular (400): Body text

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4
- Page margins: px-4 md:px-8

**Container Strategy:**
- Max width: max-w-7xl mx-auto
- Dashboard grid: grid-cols-1 lg:grid-cols-12 gap-6
- Sidebar: lg:col-span-3 (tier info, wallet status)
- Main content: lg:col-span-9 (transactions, monitoring)

**Responsive Breakpoints:**
- Mobile: Base (< 768px) - Single column, stacked cards
- Tablet: md (768px+) - 2-column layouts where appropriate
- Desktop: lg (1024px+) - Full 12-column grid system

---

## Component Library

### Navigation
**Top Bar:**
- Full-width with backdrop blur (bg-background/80 backdrop-blur-lg)
- Wallet Buddhi logo + mascot icon (32px blue shield character)
- Wallet connection button (shows address when connected)
- Tier badge (Basic/Pro/Pro+ with color coding)
- Network indicator (Solana mainnet/devnet)

### Cards & Containers
**Transaction Cards:**
- Rounded borders (rounded-xl)
- Subtle shadow (shadow-md)
- Left border accent for threat level (border-l-4)
- Hover lift effect (hover:shadow-lg transition)

**Tier Cards:**
- Larger, prominent (rounded-2xl p-6)
- Gradient backgrounds for Pro/Pro+ tiers
- Feature list with checkmarks
- CTA button at bottom

### Data Display
**Threat Severity Indicators:**
- Badge style with icon + text
- Color-coded backgrounds (red/yellow/green/gray)
- Pill shape (rounded-full px-3 py-1)

**Transaction List:**
- Table layout on desktop (borders, alternating row bg)
- Card layout on mobile (stacked)
- Expandable rows for details
- Monospace font for addresses (truncated with ellipsis)

### Forms & Inputs
**Wallet Connection:**
- Large button grid showing Phantom, Solflare, Backpack logos
- Each button: rounded-lg p-4 border-2 hover:border-primary
- Icon + wallet name layout

**Arbitrage Bot Controls (Pro+):**
- Toggle switches for activation
- Slider inputs for parameters
- Real-time status indicators
- Wallet address selectors with validation

### Buttons
**Primary Action:** bg-primary text-white hover:bg-primary/90 rounded-lg px-6 py-3
**Secondary:** border-2 border-primary text-primary hover:bg-primary/10
**Danger:** bg-danger text-white (for disconnect, block actions)
**Ghost:** text-primary hover:bg-primary/10 (for tertiary actions)

### Overlays & Modals
**Deep3 Labs Analysis Modal:**
- Centered overlay with backdrop (bg-black/60)
- White/dark card (max-w-2xl)
- Header with "AI Analysis" + Deep3 logo
- Tabbed content (Threat Score, Metadata, Recommendations)
- Close button (top-right)

---

## Images

### Hero Section
**Wallet Buddhi Mascot Hero:**
- Large illustrated mascot (friendly blue shield character with arms/face)
- Positioned right side on desktop, centered on mobile
- Gradient background (purple to blue, matching Solana vibes)
- Call-to-action: "Connect Your Wallet" with supported wallet logos below
- Size: Full viewport height on landing, ~400px illustration

### Tier Comparison Section
**Feature Icons:**
- Simple line icons for each feature (shield, AI brain, bot)
- Consistent 48px size
- Placed above feature names in tier cards

### Dashboard Background
**Optional Subtle Pattern:**
- Very subtle grid or dot pattern (opacity: 0.05)
- Reinforces security/tech aesthetic without distraction

---

## Special Features

### Real-Time Monitoring Visualization
- Timeline view of recent transactions
- Animated pulse on new activity detection
- Color-coded dots for threat levels
- Expandable details on click

### Tier Upgrade Flow
- Comparison table highlighting locked features
- "Upgrade to Pro" prominent CTA with feature preview
- Smooth modal transition showing pricing and benefits

### Wallet Naming Display
- Show "wbuddi.cooperanth.sol" format prominently
- Editable nickname feature with save indicator
- Copy-to-clipboard button with success animation

---

## Animations

**Use Sparingly:**
- Smooth transitions on threat level changes (300ms ease)
- Subtle pulse on active scanning indicator
- Fade-in for new transaction entries
- Scale effect on button hover (scale-105)
- No elaborate scroll animations or parallax effects

---

## Accessibility & Dark Mode

- Default to dark mode (crypto user preference)
- Light mode toggle in settings
- All colors meet WCAG AA contrast ratios
- Focus states visible on all interactive elements (ring-2 ring-primary)
- Screen reader labels for all icons and status indicators