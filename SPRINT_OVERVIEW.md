# 🌿 NCTR Inspiration Platform — Daily Sprint Overview

**Project:** NCTR Inspiration Garden & Crescendo Ecosystem
**Date:** February 21, 2026
**Sprint Focus:** Cross-platform integration, brand pages, and dashboard polish

---

## 1. Executive Summary

Today's session focused on strengthening the cross-platform bridge between **The Garden** (shopping/earning) and **Crescendo** (rewards marketplace), polishing the Kroma Wellness flagship brand page, and validating the existing user dashboard experience. Key wins include correcting the Crescendo cross-link URL, confirming comprehensive dashboard coverage, and documenting the current feature landscape for next-phase planning.

---

## 2. User Feedback Items Addressed

| # | Problem | Solution | Impact |
|---|---------|----------|--------|
| 1 | Crescendo cross-link on Kroma page pointed to wrong URL (`crescendo.nctr.live`) | Updated href to `crescend0.nctr.live` | Users now land on the correct Crescendo rewards platform |
| 2 | Request for Garden-to-Crescendo banner on Kroma page | Confirmed banner already implemented (lines 111–127 of `KromaWellness.tsx`) | No duplicate work; validated existing UX |
| 3 | Request for user dashboard with NCTR balance, unlocks, and earning history | Confirmed existing dashboard at `/garden?tab=dashboard` covers all requirements | Avoided redundant feature build; documented capabilities |

---

## 3. Key Mental Model & Strategy Changes

### Cross-Platform Architecture
- **The Garden** serves as the **earning engine** — users shop brands, earn NCTR, and manage locks
- **Crescendo** (`crescend0.nctr.live`) serves as the **rewards marketplace** — users spend claims on curated rewards
- Cross-link banners on brand pages drive users between platforms, creating a **closed-loop participation economy**

### Brand Page Strategy
- Flagship partners (e.g., Kroma Wellness) get dedicated routes (`/garden/brand/kroma-wellness`)
- Each brand page includes: hero, product grid, about section, and a **Crescendo CTA banner**
- Affiliate tracking flows through `loyalize-redirect` edge function with `tracking_id` mapping

---

## 4. Major Features — Current Status

| Feature | Status | Description | Technical Details | User Impact |
|---------|--------|-------------|-------------------|-------------|
| **User Dashboard** | ✅ Complete | NCTR balance, locks, earnings history | `GardenHeroSection`, `CollapsibleDashboard`, `NCTREarningsHistory` at `/garden?tab=dashboard` | Users see available/locked/pending NCTR with USD values |
| **Kroma Wellness Brand Page** | ✅ Complete | Dedicated flagship partner page | `KromaWellness.tsx` with Loyalize redirect integration | Premium brand experience with affiliate tracking |
| **Crescendo Cross-Link** | ✅ Complete | Banner linking Garden → Crescendo | `<a href="https://crescend0.nctr.live">` in brand pages | Drives reward marketplace engagement |
| **Affiliate Redirect System** | ✅ Complete | Loyalize-based tracking & redirect | `loyalize-redirect` edge function with `pid`, `cp`, `sid` params | Purchase attribution for NCTR rewards |
| **NCTR Purchase Flow** | ✅ Complete | Stripe checkout for NCTR 360LOCK | `create-nctr-checkout` edge function → Stripe sessions | Users can buy NCTR directly |
| **Learn & Earn** | ✅ Complete | Educational modules with NCTR rewards | `learning_modules` + `learning_progress` tables, quiz system | Users earn by learning |
| **Daily Check-in Streaks** | ✅ Complete | Streak-based engagement rewards | `daily_checkin_streaks` table, `DailyCheckinCountdown` component | Gamified daily engagement |
| **Referral System** | ✅ Complete | Invite-based reward distribution | `ReferralSystem` component, `/referrals` route | Viral growth loop |
| **Mall/Brand Discovery** | ✅ Complete | Searchable brand grid with categories & tags | `MallView`, `BrandCarousel`, `DepartmentGrid`, category/tag pages | Easy brand browsing |

---

## 5. Navigation & UX Structure

### Authenticated Layout (`AuthenticatedLayout.tsx`)
Routes wrapped in shared navigation:

```
/garden                          → Main dashboard + mall
/garden/category/:slug           → Category-filtered brands
/garden/tag/:slug                → Tag-filtered brands
/garden/brand/kroma-wellness     → Flagship brand page
/profile                         → User profile & settings
/referrals                       → Referral management
/affiliate-links                 → Independent affiliate links
/learn                           → Learn & Earn modules
```

### Public Routes
```
/                                → Landing page (Index)
/auth                            → Authentication
/admin                           → Admin panel
/admin/brand-rates               → Brand rate management
```

### Rationale
- Garden is the **hub** — dashboard, shopping, and brand pages live under one authenticated context
- Mobile bottom nav (`MobileBottomNav`) provides quick access to key sections
- Coming Soon mode available via `?preview=coming-soon` query param

---

## 6. Technical Infrastructure

### Database Tables (Key)
| Table | Purpose |
|-------|---------|
| `nctr_portfolio` | User NCTR balances (available, locked, pending) |
| `nctr_locks` | Individual lock records with type, dates, upgrade status |
| `nctr_transactions` | Full earning/spending history with source tracking |
| `brands` | Brand catalog with Loyalize IDs, commission rates, categories |
| `brand_categories` / `brand_tags` | Taxonomy system for brand discovery |
| `affiliate_link_mappings` | User → tracking ID → brand mapping for purchase attribution |
| `learning_modules` / `learning_progress` | Learn & Earn content and completion tracking |
| `daily_checkin_streaks` | Streak engagement data |
| `nctr_price_cache` | Cached NCTR/USD price for portfolio valuations |
| `unified_profiles` | Core user profile view |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `loyalize-redirect` | Affiliate link redirect with tracking |
| `create-nctr-checkout` | Stripe checkout session creation |
| `nctr-price-feed` / `nctr-pricing` | Price oracle |
| `nctr-live-sync` | Cross-platform balance sync |
| `loyalize-brands` / `loyalize-sync-transactions` | Brand catalog & transaction sync |
| `mailchimp-integration` | Email list management |
| `stripe-webhook` | Payment confirmation processing |

### Key Components
| Component | Role |
|-----------|------|
| `GardenHeroSection` | Dashboard hero with NCTR balance breakdown |
| `CollapsibleDashboard` | Expandable stakes/locks section |
| `NCTREarningsHistory` | Paginated transaction history |
| `MilestoneProgress` | Tier progress visualization |
| `CrescendoStatusCard` | Crescendo membership status |
| `BuyNCTRModal` | NCTR purchase flow |
| `MallView` | Brand discovery grid |
| `BrandDetailModal` | Brand detail overlay |

---

## 7. Bug Fixes & Polish

| Item | Status | Details |
|------|--------|---------|
| Crescendo URL typo | ✅ Fixed | Changed `crescendo.nctr.live` → `crescend0.nctr.live` in `KromaWellness.tsx` |
| Dashboard feature duplication check | ✅ Verified | Confirmed no redundant dashboard needed — existing covers balance, locks, history |

---

## 8. Platform Feature Status

### The Garden (This App)
| Feature | Status |
|---------|--------|
| Brand mall with search | ✅ |
| Category & tag filtering | ✅ |
| Affiliate click tracking | ✅ |
| NCTR dashboard | ✅ |
| Lock management (90/360) | ✅ |
| Lock upgrades | ✅ |
| Alliance tokens | ✅ |
| Learn & Earn | ✅ |
| Daily check-in streaks | ✅ |
| Referral system | ✅ |
| NCTR purchase (Stripe) | ✅ |
| Flagship brand pages | ✅ |
| Crescendo cross-links | ✅ |
| Admin panel | ✅ |
| Mobile bottom nav | ✅ |

### Crescendo (`crescend0.nctr.live`)
| Feature | Status |
|---------|--------|
| Rewards marketplace | 🔄 External platform |
| Claims-based redemption | 🔄 External platform |
| Cross-link from Garden | ✅ |

---

## 9. Next Session Priorities

1. 🔄 **Additional flagship brand pages** — Extend the Kroma pattern to other key partners
2. ⏸️ **Brand page template component** — Extract reusable template from `KromaWellness.tsx`
3. ⏸️ **Enhanced cross-platform sync** — Real-time balance updates between Garden and Crescendo
4. ⏸️ **Push notification system** — Alert users on NCTR earnings, unlock milestones
5. ⏸️ **Analytics dashboard** — Admin-facing metrics on affiliate clicks, conversions, NCTR distribution

---

## 10. Key Learnings

1. **Validate before building** — Checking existing features prevented duplicate dashboard work
2. **URL precision matters** — The `crescendo` vs `crescend0` distinction is critical for cross-platform linking
3. **Affiliate tracking is multi-layered** — Loyalize redirect → tracking ID → click mapping → transaction webhook forms a complete attribution chain
4. **The Garden is feature-rich** — 40+ components, 20+ edge functions, and a deep data model already in place

---

## 11. Open Questions & Unresolved Issues

| # | Question | Context |
|---|----------|---------|
| 1 | Should other brands get dedicated pages like Kroma? | Currently only Kroma has `/garden/brand/kroma-wellness` |
| 2 | Is the Crescendo cross-link banner needed on all brand modals? | Currently only on the dedicated Kroma page |
| 3 | Should NCTR price updates be more frequent? | Currently cached in `nctr_price_cache` with periodic updates |
| 4 | Mobile UX audit needed? | `MobileBottomNav` exists but full responsive testing TBD |

---

*Generated: February 21, 2026 | NCTR Inspiration Platform Sprint Documentation*
