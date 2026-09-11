# Expense Tracker — Comprehensive Development Implementation Plan

> Synthesized from [`final_ExpenseTracker_Specification.md`](file:///d:/webapp%20Project/Expense%20Tracker/app_capflow/final_ExpenseTracker_Specification.md) and [`ExpenseTracker_Full_Detailed_PageFlow.excalidraw`](file:///d:/webapp%20Project/Expense%20Tracker/app_capflow/ExpenseTracker_Full_Detailed_PageFlow.excalidraw)  
> **Version:** 2.0 — Decisions Locked | **Date:** September 2026 | **Mode:** Mode A — Cloud Auth · Google OAuth MVP · Facebook/Apple deferred

---

## ✅ Locked Design Decisions

> [!IMPORTANT]
> All open questions have been reviewed and confirmed. No blockers remain — development can begin on Phase 1 immediately.

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | **Deployment Mode** | **Mode A — Google OAuth at MVP.** Facebook/Apple OAuth deferred to post-MVP (purely additive; no data model or architectural impact). Mode B ruled out — accounts are a real requirement. |
| 2 | **Phase 2 Analytics Engine** | **JS-only aggregations in Phase 2.** FastAPI microservice migrated in Phase 3. Frontend contract is engine-agnostic by design — no rework needed when FastAPI is plugged in. |
| 3 | **Monthly Statement Email** | **Allowed — with strict consent rules.** Toggle defaults **OFF**. Settings UI copy must read verbatim: *"Sync your monthly totals (income, expense, savings — no transaction details) to send you a monthly email summary."* Requires product/privacy sign-off before the opt-in UI ships. |
| 4 | **Currency Model** | **Single default currency app-wide** (stored in `settingsStore`). Per-transaction `currency` field records currency at time-of-entry for export portability — no live conversion required at MVP. |

---

## Executive Overview

A mobile-first, installable PWA expense tracker. All **financial data lives on the user's device** (IndexedDB via Dexie.js), keeping the app fully usable offline. Only auth/profile data lives in MongoDB Atlas. The wireframe defines **22 screens across 5 flows (A–E)**. This plan targets **Mode A** with **Google OAuth** at MVP; Facebook/Apple OAuth is a post-MVP addition (Phase 4).

---

## Screen Inventory (from Excalidraw Wireframe)

| Flow | Screen ID | Name | Mode |
|------|-----------|------|------|
| **A — Auth** | A1 | Splash Screen | A only |
| | A2 | Auth Options | A only |
| | A3 | Email OTP Verification | A only |
| **B — Core** | B1 | Dashboard (Home) | Both |
| | B2 | Full Transactions List | Both |
| | B3 | Add/Edit Transaction (basic) | Both |
| | B4 | Add/Edit Transaction (expanded) | Both |
| | B5 | Currency Selector Sheet | Both |
| **C — Insights** | C1 | Analytics & Insights | Both |
| | C2 | Category Drilldown | Both |
| | C3 | Calendar (day-wise) | Both |
| | C4 | Day Detail Sheet | Both |
| **D — Finance** | D1 | Budgets & Goals | Both |
| | D2 | Add Budget Sheet | Both |
| | D3 | Add Goal Sheet | Both |
| | D4 | Budget Category Drilldown | Both |
| | D5 | EMI Management List | Both |
| | D6 | Add/Edit EMI Form | Both |
| **E — Settings** | E1 | Settings & Profile | Both |
| | E2 | Manage Categories | Both |
| | E3 | Export / Backup & Restore | Both |
| | E4 | Confirmation Dialogs | Both |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + CSS variables |
| Animation | Framer Motion |
| State | Zustand + persist middleware (IndexedDB-backed) |
| Local DB | Dexie.js (IndexedDB) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | lucide-react |
| PWA | next-pwa |
| Calendar | react-day-picker |
| Analytics (Mode A) | Python FastAPI + pandas microservice (stateless) |
| Analytics (Mode B) | Pyodide (pandas/numpy) in a Web Worker |
| Auth (Mode A) | Google/Facebook/Apple OAuth + Email OTP |
| Auth Backend | Node.js / Next.js API routes + Nodemailer |
| Server DB (Mode A) | MongoDB Atlas — `users` collection ONLY |
| Scheduled Jobs | node-cron / Vercel Cron |
| Export | PapaParse (CSV) + lightweight PDF lib + JSON |

---

## Phase 1 — Foundation & MVP Core (Weeks 1–3)

> **Goal:** A working CRUD loop — add → view → edit → delete a transaction with an accurate running balance.

### Step 1.1 — Project Scaffold & Configuration

**Files to create:**
```
/
├── app/                         # Next.js App Router
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   └── shared/                  # Reusable app components
├── lib/
│   ├── db.ts                    # Dexie schema (full TypeScript interfaces)
│   ├── store/                   # Zustand stores
│   └── storage/adapter.ts       # Storage abstraction layer
├── hooks/                       # useTransactions, useBudgets, etc.
├── types/                       # Shared TypeScript types
├── .env.example                 # All secret placeholders
└── public/
    └── manifest.json            # PWA manifest
```

**Tasks:**
- [ ] `npx create-next-app@14 --typescript --tailwind --app` scaffold
- [ ] Install all core dependencies:
  ```bash
  npm install dexie zustand framer-motion react-hook-form zod recharts lucide-react react-day-picker next-pwa
  npm install @radix-ui/react-* (via shadcn/ui init)
  ```
- [ ] Configure `tailwind.config.ts` with custom CSS variables (design tokens from spec Section 5)
- [ ] Set up `globals.css` with light/dark variable definitions:
  ```css
  :root {
    --bg-primary: #FAFAFA; --bg-card: #FFFFFF;
    --text-primary: #111827; --accent: #6366F1;
    --success: #10B981; --danger: #EF4444; --warning: #F59E0B;
    --radius-card: 16px; --radius-sheet: 24px;
  }
  .dark { --bg-primary: #0F1115; /* ... */ }
  ```
- [ ] Configure `next.config.js` with `next-pwa`, `public/manifest.json` (installable PWA)
- [ ] Create `.env.example` with all placeholders:
  ```
  MONGODB_URI=""
  SMTP_HOST="" SMTP_USER="" SMTP_PASS=""
  JWT_SECRET="" JWT_EXPIRY="90d"
  GOOGLE_CLIENT_ID="" GOOGLE_CLIENT_SECRET=""
  FACEBOOK_APP_ID="" FACEBOOK_APP_SECRET=""
  APPLE_CLIENT_ID="" APPLE_CLIENT_SECRET=""
  NEXT_PUBLIC_FASTAPI_URL=""
  ```

---

### Step 1.2 — Dexie Database Schema

**File:** `lib/db.ts`

Implement the complete TypeScript Dexie schema with all 6 tables:

```typescript
// Tables: users | categories | transactions | budgets | goals | emis
// Indexes: transactions: 'id, date, categoryId, type, [categoryId+date]'
//          budgets: 'id, [categoryId+month]'
//          categories: 'id, order'
//          emis: 'id, dueDay'
```

- [ ] Define all TypeScript interfaces (`User`, `Category`, `Transaction`, `Budget`, `Goal`, `EMI`)
- [ ] Implement `ExpenseTrackerDB` class extending `Dexie`
- [ ] Export singleton `db` instance
- [ ] Implement DB seeder function `seedDefaultCategories()`:

| # | Category | Icon (lucide) | Color | Type |
|---|----------|--------------|-------|------|
| 1 | Food | `utensils` | `#F97316` | expense |
| 2 | Rent | `home` | `#6366F1` | expense |
| 3 | Travel | `plane` | `#0EA5E9` | expense |
| 4 | Utilities | `zap` | `#F59E0B` | expense |
| 5 | Entertainment | `clapperboard` | `#EC4899` | expense |
| 6 | Shopping | `shopping-bag` | `#8B5CF6` | expense |
| 7 | Health | `heart-pulse` | `#10B981` | expense |
| 8 | EMI | `banknote` | `#EF4444` | expense |
| 9 | Salary | `wallet` | `#34D399` | income |
| 10 | Other | `circle-ellipsis` | `#94A3B8` | both |

---

### Step 1.3 — Zustand Store Layer

**Files:** `lib/store/transactionStore.ts`, `settingsStore.ts`, `authStore.ts`

- [ ] `transactionStore` — exposes `useTransactions()` hook with memoized selectors:
  - `totalIncome`, `totalExpense`, `netSavings` (by selected month)
  - `weeklyTotals` (last 7 days, grouped by day)
  - `recent` (last 10–15 transactions)
  - Actions: `addTransaction`, `updateTransaction`, `deleteTransaction`
- [ ] `settingsStore` — `defaultCurrency`, `theme`, `selectedMonth`; persisted to Dexie `users` table
- [ ] `authStore` (Mode A) — `{ user, isAuthenticated }`, hydrated from `/api/me` on app load
- [ ] Storage abstraction layer `lib/storage/adapter.ts` — `get/set/delete/list` interface, swappable later

---

### Step 1.4 — Theme System

- [ ] Implement `ThemeProvider` wrapper using `next-themes` or a custom context
- [ ] Three modes: `light` / `dark` / `system` — toggled via Zustand `settingsStore`
- [ ] CSS variable swap strategy (no page reload, ~200ms crossfade transition)
- [ ] Theme toggle component (segmented control: ☀️ Light | 💻 System | 🌙 Dark)

---

### Step 1.5 — Auth Flow (Mode A) — Screens A1, A2, A3

**Route:** `app/(auth)/` layout group

#### A1 — Splash Screen
- Full-screen, centered logo + app name "ExpenseTracker"
- Auto-advances to A2 after 1.5s (or on tap)
- Framer Motion fade-in/scale animation
- **Session check:** if valid JWT cookie exists → redirect straight to Dashboard (no login re-prompt)

#### A2 — Auth Options Screen

> [!NOTE]
> **MVP scope:** Only Google OAuth is implemented in Phase 1. Facebook and Apple buttons are rendered but disabled (grayed out with a "Coming soon" tooltip) to preserve the wireframe layout. They are fully wired in Phase 4.

- **Google OAuth button** (active, blue):
  - `Continue with Google` → `POST /api/auth/google`
- **Facebook OAuth button** (disabled at MVP, Phase 4):
  - Rendered but grayed out — `Continue with Facebook`
- **Apple OAuth button** (disabled at MVP, Phase 4):
  - Rendered but grayed out — `Continue with Apple`
- `── or ──` divider
- `Continue with Email` (orange button) → navigates to A3 (OTP flow — active at MVP)

#### A3 — Email OTP Verification Screen
- Step 1: Email input + submit
- Step 2: 6 auto-focus boxes for 6-digit OTP
  - Auto-advance on each digit entry
  - `Resend code in 30s` countdown timer
  - Shake animation (Framer Motion) on wrong OTP
  - Success checkmark animation → redirect to Dashboard
- API calls: `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`

**Backend API routes** (Next.js API routes):
```
POST /api/auth/google       — [MVP] OAuth token exchange, MongoDB upsert, JWT cookie
POST /api/auth/facebook     — [Phase 4] Facebook OAuth
POST /api/auth/apple        — [Phase 4] Apple OAuth
POST /api/auth/otp/request  — [MVP] Generate OTP hash, store in MongoDB, send via Nodemailer
POST /api/auth/otp/verify   — [MVP] Verify hash, issue JWT httpOnly cookie (90-day expiry)
GET  /api/me                — [MVP] Return user from JWT cookie (hydrates authStore)
POST /api/auth/signout      — [MVP] Clear JWT cookie
```

> **Mode B:** Replace entire auth flow — on first app open, silently create a local `User` record in Dexie and route to Dashboard.

---

### Step 1.6 — Dashboard (Screen B1)

**Route:** `app/(app)/dashboard/page.tsx`

**Layout (mobile-first, max-width 480px centered):**

```
┌─────────────────────────────────────┐
│  👋 Hey, Alex          [avatar] ⚙️  │  ← Sticky header
│         ◀ September 2026 ▶           │  ← Month selector
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │  Balance Overview Card      │    │  ← Gradient bg, rounded-2xl
│  │  Income ↑  Expense ↓  Net  │    │
│  │     ₹32,000  ₹18,500  ₹13,500   │
│  │  +12% vs last month          │    │
│  │  ████████████░░░░  58% spent │    │
│  └─────────────────────────────┘    │
│  Weekly Spending (Mon–Sun bars)     │  ← tap bar → tooltip + filter
│  Recent Transactions                │  ← last 10–15, swipe-left = edit/delete
│  [See All →]                        │
├─────────────────────────────────────┤
│  ● Home  ○ Analytics  ○ Budget  ○ … │  ← Bottom nav
│                              [FAB+] │  ← Fixed bottom-right
└─────────────────────────────────────┘
```

**Implementation tasks:**
- [ ] Sticky header with greeting, avatar, month chevron selector (◀ September 2026 ▶)
- [ ] **Balance Overview Card**: gradient background, 3 stat blocks (Income/Expense/Net), `%Δ` vs last month, spent-vs-income progress bar. Numbers count-up animation (Framer Motion tween) on load/data change
- [ ] **Weekly Bar Graph**: 7 slim bars Mon–Sun, current day highlighted; tap reveals tooltip
- [ ] **Recent Transactions Feed**: last 10–15 entries — category icon (colored circle), title, date, amount (green income / red expense), payment-method micro-tag. Swipe-left reveals Edit/Delete. 5-second undo toast on delete (optimistic)
- [ ] **[See All →]** link → navigates to B2
- [ ] **Skeleton loaders** (shimmer) while initial Dexie query resolves
- [ ] **FAB (+)**: fixed bottom-right, scales on press (Framer Motion `whileTap`), expands spring animation into "Add Expense / Add Income" quick options → opens B3
- [ ] **Pull-to-refresh** recalculates totals from IndexedDB
- [ ] **Bottom navigation bar**: Home | Analytics | Budget & Goals | EMI | Settings

---

### Step 1.7 — Add/Edit Transaction (Screens B3, B4, B5)

**Component:** `components/transaction/AddTransactionSheet.tsx` (bottom-sheet on mobile / modal on desktop)

#### B3 — Basic View
- Slides up as full-height bottom-sheet, drag handle at top, rounded top corners
- **Expense | Income** segmented toggle at top
- **Amount input**: huge (48–64px), center-aligned, custom numeric keypad component (avoids native mobile keyboard/layout jump), live currency symbol prefix as tappable chip → opens B5
- **Category Grid**: 3–4 col grid, rounded icon tiles; selected tile scales up + colored ring (Framer Motion)
- **More details ▾** expander button → reveals B4

#### B4 — Expanded Details
- **Date & Time picker**: defaults to "now," react-day-picker
- **Payment Method**: segmented chips — Cash | Credit Card | Bank Transfer | UPI
- **Notes**: single-line expandable textarea
- **Receipt upload**: camera/file picker → stored as base64 blob in IndexedDB (never uploaded)
- **Recurring toggle**: ON/OFF switch; when ON shows Daily / Weekly / Monthly / Yearly chips + optional end-date; recurring entries auto-generate future transactions on app open

#### B5 — Currency Selector Sheet
- Opens from amount currency chip
- Searchable list: symbol + code + name
- Pre-populate: INR, USD, EUR, GBP, JPY + all ISO currencies

**Shared Save button:**
- Full-width sticky bottom, disabled until `amount > 0` AND `category` selected
- Zod validation inline
- On success: morphs into ✔ checkmark animation → sheet closes → Dashboard updates reactively

**Edit mode:** sheet opens pre-populated; Save becomes "Update"; includes "Delete" text button with confirmation dialog.

---

### Step 1.8 — Full Transactions List (Screen B2)

**Route:** `app/(app)/transactions/page.tsx`

- Accessed via "See All →" from Dashboard
- **Search bar** + **filter bar** (type, category, date range, payment method)
- Transaction rows: icon | title | date | amount (same format as Dashboard feed)
- Infinite scroll / pagination from Dexie
- Swipe-left to edit/delete (same as Dashboard)
- FAB also present for quick add

---

## Phase 2 — Insights, Budgeting & Calendar (Weeks 4–6)

### Step 2.1 — Analytics & Insights (Screens C1, C2)

**Route:** `app/(app)/analytics/page.tsx`

#### C1 — Analytics Screen

**Filter bar (sticky top):**
- Date Range chips: This Week | This Month | This Year | Custom (opens range picker)
- Category multi-select dropdown

**Charts (Recharts):**
1. **Category Donut Chart** (`PieChart`): center shows total spend; tap slice → opens C2 drilldown panel; tappable legend to isolate
2. **Stacked Bar Chart**: one bar per month (last 6–12 months); toggle between category/payment-method stacking
3. **Daily Trend Line Chart**: daily spend + 7-day moving average overlay + ±1 std-dev anomaly band + peak-spend day marker

**Insight Strip (auto-generated text):**
- "You spent 18% more on Food this month"
- "Avg daily spend: ₹600"
- "Highest spending day: Sept 3"
- "Fastest-growing category: Travel"

**Analytics Engine — Phase 2 (JS-only, no Python):**

> [!NOTE]
> **Decision locked:** Phase 2 uses JavaScript-only aggregations. The FastAPI microservice is built and swapped in during Phase 3. The frontend abstraction layer (`useAnalytics()`) is written once and is engine-agnostic — the data contract `{ donut, stackedBar, lineTrend, insights[] }` is identical in both phases.

**Phase 2 — JS aggregation layer** (`lib/analytics/jsEngine.ts`):
- **Donut data:** `Array.from groupBy categoryId`, sum amounts, compute `%` per category
- **Stacked bar:** group by `YYYY-MM`, then by `categoryId` or `paymentMethod` within each month
- **Daily trend:** group by ISO day, compute daily totals, then rolling 7-day average in JS:
  ```ts
  // Simple 7-day rolling average (no pandas needed)
  const rolling = dailyTotals.map((_, i, arr) =>
    arr.slice(Math.max(0, i - 6), i + 1).reduce((s, d) => s + d.amount, 0) / Math.min(7, i + 1)
  );
  ```
- **Insight strip (Phase 2):** hardcoded text templates filled with computed values — avg daily spend, highest spending day, month-over-month % change per category
- **Limitations acknowledged for Phase 2:** no z-score anomaly detection, no regression trend line, no ±1 std-dev band — these are FastAPI features added in Phase 3

**Phase 3 — FastAPI swap** (`lib/analytics/fastapiEngine.ts`):
- Same function signature as `jsEngine.ts`; `useAnalytics()` hook switches based on `NEXT_PUBLIC_ANALYTICS_ENGINE=js|fastapi`
- Adds: rolling z-scores, ±1 std-dev anomaly band, linear-regression trend line overlay, richer auto-generated insight text
- FastAPI service: stateless, deployed to Render/Fly.io, CORS locked to production origin

**Micro-interactions:** Chart entrance animations (staggered), skeleton → chart on filter change, empty-state illustration + CTA when no data

#### C2 — Category Drilldown
- Opens from tapping a donut slice (bottom panel / modal)
- Shows: category name + % + amount + transaction count
- Tappable legend list to isolate categories

---

### Step 2.2 — Calendar View (Screens C3, C4)

**Route:** `app/(app)/calendar/page.tsx`

#### C3 — Calendar Screen
- Month-grid calendar (react-day-picker)
- Each day cell: colored dot/amount badge if transactions exist
  - 🔴 Red dot = net-expense day
  - 🟢 Green dot = net-income day
- Swipe between months (◀ September 2026 ▶)
- Data from Dexie with `[categoryId+date]` composite index for fast lookups

#### C4 — Day Detail Sheet
- Opens on tap of a day cell (bottom sheet)
- Shows: "Wed, 3 Sept 2026 — Net: -₹850"
- Lists all transactions for that day (icon | title | amount)
- "**+ Add transaction**" button (pre-filled with that date) → opens B3

---

### Step 2.3 — Budgets & Goals (Screens D1–D4)

**Route:** `app/(app)/budgets/page.tsx`

#### D1 — Budgets & Goals Screen

**This Month's Budgets section:**
- Card per budgeted category: circular progress ring + horizontal bar
- Color thresholds:
  - 🟢 **Green** `< 70%` used
  - 🟡 **Yellow** `70–90%` used  
  - 🔴 **Red** `> 90%` — pulsing red border animation + warning icon + "You're ₹X over budget" badge
- Tap a budget card → D4 (contributing transactions drilldown)
- **+ Add Budget** button → D2 sheet

**Savings Goals section:**
- Cards: goal name, target amount, saved amount, progress bar, target date, icon/color, **[Add Funds]** quick-action button
- **+ Add Goal** button → D3 sheet

#### D2 — Add Budget Sheet
- Category picker (from categories list)
- Monthly limit amount input
- Alert threshold % (default 90%)
- **Save Budget** button

#### D3 — Add Goal Sheet
- Goal name
- Target amount
- Target date
- Icon + color picker
- Optional: auto-contribution rule ("10% of monthly income")
- **Save Goal** button

#### D4 — Budget Category Drilldown
- Opens from tapping a budget card
- Shows: "Food — ₹2,750 / ₹5,000 (55%)"
- Lists transactions contributing to that category this month

**State Management:** `budgets` store keyed by `categoryId + month`, recalculated reactively on every transaction change in that category/month.

---

### Step 2.4 — Category Management (Screen E2)

**Route:** `app/(app)/settings/categories/page.tsx`

- Drag-to-reorder list (using `@dnd-kit/sortable`)
- Each row: icon + name + [drag handle ⠿] + [edit] + [delete]
- **+ Add Custom Category** button → sheet with:
  - Name input
  - Icon picker (lucide icons grid / emoji)
  - Color picker (color swatches)
  - Type: Expense / Income / Both

---

## Phase 3 — EMI, Automation & Polish (Weeks 7–8)

### Step 3.1 — EMI Management (Screens D5, D6)

**Route:** `app/(app)/emis/page.tsx`

#### D5 — EMI List Screen
- Cards: EMI name, monthly cost, progress (e.g., "8 of 24 installments paid"), next due date, status tag:
  - **Upcoming** — due date is >7 days away
  - **Due Soon** — due date within reminder window
  - **Overdue** — past due date
- In-app badges/notification counts on screen icon in nav
- **+ Add EMI** button → D6

**Mode A:** Opt-in EMI mirror sync to MongoDB `emiReminders` — disclosed in Settings. "Enable EMI email reminders" toggle.  
**Mode B:** In-app badges/banners only; no server sync.

#### D6 — Add/Edit EMI Form
Fields:
- EMI Name
- Total / Monthly Cost
- Start Date
- End Date (or # of installments)
- Due Day (1–31)
- Reminder lead time (days before)
- **Save EMI** button

---

### Step 3.2 — Recurring Transactions Engine

- Lightweight scheduler runs on app open
- Checks each recurring transaction's `recurrence.nextOccurrence` against today
- Auto-generates new transaction records if due
- Updates `nextOccurrence` to the next interval date

---

### Step 3.3 — Receipt Upload

- Tap to attach image (camera or gallery picker via `<input type="file" accept="image/*" capture>`)
- Store as base64 blob in `transactions.receiptImage` field in IndexedDB
- Display thumbnail on transaction detail view
- **Never uploaded to any server** — device-only storage

---

### Step 3.4 — Email Automation (Mode A only)

**Cron jobs via `node-cron` (or Vercel Cron):**

| Job | Schedule | Content |
|-----|----------|---------|
| EMI Due Reminder | Daily 08:00 | Check EMIs where `dueDay` == today+N → send reminder email |
| Monthly EMI Summary | 1st of month 00:05 | List all EMIs due this month + total |
| Monthly Statement | 1st of month 00:10 | **Opt-in, default OFF** — lightweight income/expense/savings totals only (no transaction line items). Triggered only for users where `preferences.emailNotifications.monthlyStatement === true` AND a one-time aggregated totals sync was explicitly confirmed. |

> [!WARNING]
> **Monthly Statement — Mandatory consent implementation rules (locked):**
> 1. **Toggle defaults to OFF** — never enabled on first login or after upgrades without explicit user action.
> 2. **Settings UI copy must be verbatim:** *"Sync your monthly totals (income, expense, savings — no transaction details) to send you a monthly email summary."*
> 3. **Do not use vague language** like "enable monthly statement" — users must understand exactly what leaves their device.
> 4. **Requires product/privacy sign-off** before the opt-in UI is shipped. Block this feature behind a feature flag (`FEATURE_MONTHLY_STATEMENT=false`) until sign-off is granted.

**Nodemailer setup** with SMTP (credentials from `.env`):
```typescript
// lib/email/mailer.ts
// Templates: OTP, EMI reminder, Monthly summary, Monthly statement
```

---

## Phase 4 — Settings, PWA & Deployment (Weeks 9–10)

### Step 4.1 — Settings & Profile (Screens E1–E4)

**Route:** `app/(app)/settings/page.tsx`

#### E1 — Settings Screen (iOS-style grouped list)

**Profile section:**
- Avatar (from OAuth, or editable placeholder in Mode B)
- Name + email (read-only from OAuth in Mode A)
- **Sign Out** button → E4 confirmation dialog

**Preferences section:**
- **Currency switcher**: searchable list (symbol + code), updates `settingsStore.defaultCurrency`
- **Theme toggle**: segmented control (Light | System | Dark) → instant ~200ms crossfade re-theme via CSS variable swap, no reload
- **Notification preferences** (Mode A only):
  - **Monthly Statement emails** — toggle, **default OFF**, feature-flagged behind `FEATURE_MONTHLY_STATEMENT`:
    - UI label: *"Monthly email summary"*
    - Sub-label (always visible): *"Sync your monthly totals (income, expense, savings — no transaction details) to send you a monthly email summary."*
    - Enabling triggers a one-time confirmation dialog before data is ever synced
  - **EMI Reminders emails** — toggle, default OFF; enabling opts into the daily/monthly EMI cron job
  - **EMI email sync** — toggle, default OFF; enabling mirrors EMI name/amount/due-day to MongoDB `emiReminders` for server-side scheduling (disclosed explicitly with this label: *"Store your EMI schedule on our server to send you email reminders. Only EMI name, amount, and due date are stored — not your transactions."*)

**Categories section:**
- **Manage Categories →** → E2

**Data section:**
- **Export / Backup & Restore →** → E3

**About section:**
- App version
- Privacy note: "All your financial data is stored only on this device"

#### E3 — Export / Backup & Restore
- **Export Data:**
  - JSON (full IndexedDB dump)
  - CSV (via PapaParse, client-side)
  - PDF (via lightweight PDF lib, client-side)
  - All triggered as native file downloads with brief "Generating…" spinner
- **Backup & Sync:**
  - **Download Backup File** — exports full IndexedDB JSON dump
  - **Restore From File** — re-imports JSON dump back into Dexie
- **Clear All Data** (danger zone, red) → E4

#### E4 — Confirmation Dialogs
- **Sign Out dialog**: "Are you sure you want to sign out?" [Cancel] [Sign Out]
- **Reset All Data dialog**: Type "DELETE" to confirm → [Cancel] [Reset]
  - Destructive, requires typed confirmation per spec

---

### Step 4.2 — Facebook & Apple OAuth (Phase 4)

- Complete `POST /api/auth/facebook` and `POST /api/auth/apple` OAuth callback handlers
- Test OAuth flows for all three providers

---

### Step 4.3 — PWA & Offline Support

- [ ] `next-pwa` configuration with service worker
- [ ] Cache shell + static assets for offline access
- [ ] App manifest (`public/manifest.json`): name, icons, theme color, display: `standalone`
- [ ] Offline fallback page
- [ ] Background sync ready for any future cloud-sync feature
- [ ] "Install App" prompt handling (deferred `beforeinstallprompt`)

---

### Step 4.4 — Framer Motion Animation Pass

Apply Framer Motion throughout the entire app:

| Interaction | Animation |
|-------------|-----------|
| FAB expand | Spring physics → shared-element morph into Add Transaction sheet |
| Transaction sheet open/close | Slide up / slide down with drag gesture |
| Category tile select | Scale-up + colored ring bounce |
| Balance card numbers | Count-up tween on load / data change |
| Progress rings (budgets) | SVG stroke-dashoffset 0 → current % on mount |
| Budget color transitions | Green → Yellow → Red smooth color interpolation |
| OTP wrong entry | Shake animation (`x` keyframes) |
| OTP success | Checkmark morph → redirect |
| Charts | Staggered entrance (`isAnimationActive`, custom variants) |
| Delete undo toast | Slide in from bottom, 5s auto-dismiss |
| Page transitions | Shared layout animations between routes |
| Modals/sheets | Scale + fade with `AnimatePresence` |

---

### Step 4.5 — Accessibility & Performance

**Accessibility:**
- [ ] WCAG AA contrast ratios for all text/background combinations in both themes
- [ ] Keyboard navigability for all interactive elements
- [ ] `aria-label` on all icon-only buttons (FAB, close buttons, swipe actions)
- [ ] Screen-reader labels on chart elements
- [ ] Focus trap in modals/sheets
- [ ] Skip-to-content link

**Performance:**
- [ ] Code-splitting: lazy-load Analytics screen, Pyodide worker (Mode B), heavy chart components
- [ ] Image optimization for receipt thumbnails
- [ ] Dexie query optimization — composite indexes already defined in schema
- [ ] Memoized Zustand selectors to prevent unnecessary re-renders
- [ ] `React.memo` on transaction rows (large lists)

---

### Step 4.6 — Python FastAPI Analytics Microservice (Mode A)

**Service:** Separate repo / directory, deployed to Render or Fly.io

```python
# main.py — FastAPI app
# POST /analyze
# Input: { transactions: [], range: {}, groupBy: "category" | "paymentMethod" }
# Output: { donut: [], stackedBar: [], lineTrend: [], insights: [] }
# - Uses pandas for groupBy, rolling averages, z-scores, % changes
# - Stateless — never persists any data
# - CORS configured to allow only the frontend origin
```

---

## Phase 5 — QA, Testing & Deployment (Final)

### Step 5.1 — Testing

- [ ] Unit tests for Zustand store selectors (Jest)
- [ ] Unit tests for Dexie operations (mock IndexedDB)
- [ ] Unit tests for Zod schemas (form validation)
- [ ] Integration tests for auth API routes
- [ ] E2E tests for critical flows:
  - Add → view → edit → delete transaction
  - Budget threshold color change
  - Export data download
  - OTP flow
- [ ] Mobile viewport testing (375px, 390px, 430px widths)
- [ ] Offline mode testing (devtools → offline)

---

### Step 5.2 — Deployment

| Service | Platform |
|---------|----------|
| Frontend (Next.js PWA) | **Vercel** |
| Python FastAPI Analytics | **Render** or **Fly.io** (Mode A only) |
| Database | **MongoDB Atlas** (free tier, `users` collection only) |

**Pre-deploy checklist:**
- [ ] All `.env` secrets filled in (MongoDB URI, SMTP, OAuth credentials, JWT secret)
- [ ] MongoDB Atlas network access configured
- [ ] CORS headers on FastAPI service locked to production frontend URL
- [ ] `next-pwa` production build tested
- [ ] Lighthouse PWA + Performance + Accessibility scores verified

---

## Data Flow Architecture

```
┌─────────────────────────────┐
│         React UI            │
│  (Dashboard, Add, Charts…)  │
└──────────────┬──────────────┘
               │ hooks (useTransactions, useBudgets, useGoals, useSettings)
┌──────────────▼──────────────┐
│      Zustand Store           │  ← in-memory, reactive, memoized selectors
└──────────────┬──────────────┘
               │ persist middleware
┌──────────────▼──────────────┐
│   Dexie.js (IndexedDB)       │  ← device-memory database, fully offline
└──────────────┬──────────────┘
               │ export/import (client-side)
┌──────────────▼──────────────┐
│  JSON / CSV / PDF files      │  ← manual backup, portability
└──────────────────────────────┘

[Auth — Mode A only]
Browser → OAuth Provider → /api/auth/* → MongoDB Atlas (users only) → JWT cookie

[Analytics — Mode A]
IndexedDB rows → JSON → POST /analyze (FastAPI, stateless) → Recharts

[Analytics — Mode B]
IndexedDB rows → JSON → Pyodide Web Worker (in-browser) → Recharts

[Scheduled Emails — Mode A only]
node-cron → MongoDB (users + emiReminders) → Nodemailer → user's inbox
```

---

## Navigation Architecture

```
/ (root)
├── /splash                   A1 — Splash (auto-redirects)
├── /auth                     A2 — Auth Options
├── /auth/otp                 A3 — Email OTP Verification
│
└── /app (authenticated shell — bottom nav)
    ├── /dashboard             B1 — Dashboard
    │   └── /transactions      B2 — Full Transactions List
    ├── /analytics             C1 — Analytics & Insights
    ├── /calendar              C3 — Calendar
    │   └── /(sheet) C4        Day Detail Sheet
    ├── /budgets               D1 — Budgets & Goals
    ├── /emis                  D5 — EMI Management
    └── /settings              E1 — Settings & Profile
        ├── /settings/categories   E2 — Manage Categories
        └── /settings/export       E3 — Export / Backup & Restore

Modals/Sheets (rendered globally via portal, accessible from any screen):
├── B3/B4 — Add/Edit Transaction Sheet
├── B5    — Currency Selector Sheet
├── D2    — Add Budget Sheet
├── D3    — Add Goal Sheet
├── D4    — Budget Category Drilldown Sheet
├── D6    — Add/Edit EMI Form Sheet
├── C2    — Category Drilldown Panel
└── E4    — Confirmation Dialogs (Sign Out, Reset Data)
```

---

## Decisions Log — All Closed ✅

All design decisions that were open at v1.0 are now resolved. This section records the rationale for auditability.

| # | Decision | Outcome | Rationale |
|---|----------|---------|-----------|
| 1 | **Mode A vs Mode B** | **Mode A — Google OAuth at MVP** | Accounts are a real requirement. Mode B is cheaper forever but only if accounts are never needed — migrating B → A is expensive post-hoc. Facebook/Apple deferred (additive only). |
| 2 | **Phase 2 analytics engine** | **JS-only in Phase 2; FastAPI in Phase 3** | UI is engine-agnostic. Unblocks Phase 2 immediately. JS handles all Phase 2 aggregate requirements. Advanced stats (z-scores, regression) are Phase 3 Polish, not Phase 2 MVP. |
| 3 | **Monthly Statement email** | **Allowed with strict consent** | Tradeoff is reasonable privacy-wise (opt-in, aggregates only). Default OFF is mandatory. Verbatim copy required. Feature-flagged until product/privacy sign-off. |
| 4 | **Currency model** | **Single default currency app-wide** | Per-transaction `currency` field preserved for export portability. No live conversion at MVP — avoids exchange-rate API dependency and complexity. |

---

## Summary Timeline

| Phase | Weeks | Deliverable |
|-------|-------|-------------|
| **Phase 1 — MVP Core** | 1–3 | Scaffold, Google OAuth + OTP, Dexie schema, Zustand stores, Dashboard, Add/Edit Transaction, full CRUD |
| **Phase 2 — Insights & Budgeting** | 4–6 | Analytics (JS-only engine), Calendar, Budgets/Goals, Category management |
| **Phase 3 — EMI, Automation & FastAPI** | 7–8 | EMI CRUD, recurring transactions, receipts, email cron jobs, **FastAPI analytics swap-in** |
| **Phase 4 — Polish & PWA** | 9–10 | **Facebook/Apple OAuth**, Framer Motion pass, accessibility, PWA/offline, performance |
| **Phase 5 — QA & Deploy** | 10 | E2E tests, Vercel + Render/Fly.io + MongoDB Atlas deployment |

**Total estimated duration:** 10 weeks to full deployment.

> [!NOTE]
> **Phase 3 scope change from v1.0:** FastAPI analytics microservice build + swap-in has been moved from Phase 4 to Phase 3, running concurrently with EMI/automation work. This was always a Phase 3 activity by the spec's own roadmap — v1.0 was an artifact of the "analytics engine TBD" question being open at the time.

---

*This plan synthesizes all 22 screens from the Excalidraw wireframe and all sections of the merged specification. Version 2.0 — all design decisions locked. **Ready to begin Phase 1 execution.***
