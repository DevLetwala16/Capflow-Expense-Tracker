# EXPENSE TRACKER WEB APPLICATION
## Merged Developer Specification & System Architecture Blueprint
**(Combines "ExpenseTracker" and "ExpenseFlow" specs into one unified document)**

**Version:** 2.0 (Merged)
**Type:** Mobile-first, offline-capable / local-first Expense Tracker Web Application
**Target Build Environment:** Antigravity (or any AI coding agent) — see Section 7 for the ready-to-paste master build prompt

> **Merge note:** This document unifies two prior specs that took slightly different architectural stances on backend/auth. Nothing from either source spec has been dropped — where the two disagreed (see Section 1.5 "Two Deployment Modes"), both approaches are documented so the team/agent can pick one, and the master build prompt defaults to the more feature-complete option (**Mode A — Cloud Auth**) while calling out how to build the simpler **Mode B — Fully Local** variant instead.

---

## 0. EXECUTIVE SUMMARY

A mobile-first, installable PWA expense tracker where all **financial data (transactions, categories, budgets, EMIs, goals) lives on the user's device** (IndexedDB via Dexie.js), keeping the app fully usable offline. Two deployment modes are supported:

- **Mode A — Cloud Auth (primary/recommended):** Users sign in once via Google / Facebook / Apple OAuth (or email + OTP); only authentication/registration data lives in MongoDB in the cloud. Users stay logged in indefinitely until they explicitly sign out. The app sends automated emails — EMI due reminders and a monthly income/expense statement — fired via a scheduled backend job.
- **Mode B — Fully Local (lite/no-backend alternative):** No server, no login screen, single local user profile stored in Dexie itself. All analytics run in-browser via Pyodide (Python/WebAssembly). No email automation (nothing to email to, since there's no server). Best for a purely offline personal-use build.

Both modes share the same UI, page layout, data model shape, and design language described below.

---

## 1. APP ARCHITECTURE & TECH STACK

### 1.1 Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | **Next.js 14 (App Router)** + React 18 | SSR for auth pages (Mode A) or static shell (Mode B), CSR for the offline app shell, API routes for the thin backend, file-based routing, fast dev loop |
| Styling | **Tailwind CSS** + shadcn/ui + CSS variables for theming | Utility-first, consistent rounded/soft-shadow design system, fast theming (dark/light/system) via `class` strategy |
| Animation | **Framer Motion** | Modal transitions, FAB expand, progress ring animation, page transitions, spring physics on sheets |
| State Management | **Zustand** (with `persist` middleware backed by IndexedDB) + a React-Query-style local cache wrapper | Lightweight, avoids Redux boilerplate, syncs with local DB automatically, no manual re-triggering of derived data |
| Local Database | **IndexedDB via Dexie.js** | Structured, queryable "device memory" store for transactions/categories/budgets/EMIs/goals/settings — works fully offline, supports thousands of records, survives refresh/close |
| Forms | **React Hook Form + Zod** | Validated amount/date/category inputs, fast controlled inputs, inline validation |
| PWA | **next-pwa** | Installable app, offline-first shell, background sync ready |
| Calendar | **react-day-picker** or **FullCalendar (day-grid view)** | Day-wise expense visualization |
| Icons | **lucide-react** | Category icons, consistent stroke/line-icon style across categories & nav |

### 1.2 Data Visualization & Analysis
| Purpose | Technology |
|---|---|
| In-app charts (donut/pie, stacked bar, line, weekly bar/sparkline) | **Recharts** (primary — `PieChart`, `BarChart` stacked, `LineChart` with gradient area) or **Tremor** (`BarList`/`SparkAreaChart`) for dashboard-style mini cards |
| Heavy analytics — **Mode A**: trend detection, category velocity, monthly comparisons, statement generation | **Python microservice (FastAPI + pandas + numpy)** — receives an exported JSON batch of transactions from the client, returns computed aggregates/insights as JSON, which Recharts renders. Runs as a stateless serverless function; it never persists data itself. |
| Heavy analytics — **Mode B**: trend forecasting, anomaly detection (z-scores), category clustering, linear-regression trend lines | **Python via Pyodide**, running fully **client-side in a Web Worker** (WebAssembly) using `pandas` + `numpy`. Keeps the "device-memory only" promise absolute since no data ever leaves the browser, even transiently. Cached after first load; lazy-loaded only when the Analytics screen is visited. |

Both analytics engines accept the same request/response contract (see 2.4) so the Analytics UI code doesn't need to know which one is active.

### 1.3 Backend & Database

**Design principle: two-tier storage (Mode A) or zero-server storage (Mode B).**

| Data type | Storage | Why |
|---|---|---|
| User registration/auth (name, email, OAuth ID, hashed passkey, verification status, notification preferences) — **Mode A only** | **MongoDB Atlas** (only collection: `users`) | Needs to persist server-side to support login, OTP, and email scheduling |
| Transactions, Categories, Budgets, Goals, EMIs, Calendar entries, Settings, single local User profile (**Mode B**) | **IndexedDB (client device), via Dexie.js** | Per the "device memory" requirement — fully private, zero backend storage cost, instant offline access, in both modes |

**Mode A backend stack:**
- **Node.js + Express (or Next.js API routes)** — thin layer for: OAuth callback handling, OTP generation/verification, JWT session issuance, and the two scheduled email jobs.
- **node-cron** (or a hosted cron like Vercel Cron) — triggers on the 1st of every month at 00:05 local server time for EMI + statement emails, and daily (e.g., 08:00) for EMI due-date reminders.
- **Nodemailer** with SMTP (Gmail App Password / SendGrid — credentials to be added later) for all outbound email.
- **JWT (httpOnly cookie, long expiry ~90 days + silent refresh)** — keeps user logged in across sessions; no repeated login required until explicit sign-out.

**Mode B backend stack:**
- None. The "backend" is purely a client-side persistence abstraction:
  - **Primary store:** IndexedDB via Dexie.js.
  - **Secondary/session cache:** Zustand in-memory store, hydrated from Dexie on app load, written back on every mutation (debounced).
  - **File-based backup:** Manual Export/Import as JSON or CSV (no cloud sync by default).
  - **Optional future sync hook:** an abstraction layer (`/lib/storage/adapter.ts`) exposing `get/set/delete/list`, swappable later for Supabase/Firebase/MongoDB without touching UI code — this is how a Mode B build could migrate to Mode A later.

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
│   Dexie.js (IndexedDB)       │  ← device-memory "database", works fully offline
└──────────────┬──────────────┘
               │ export/import
┌──────────────▼──────────────┐
│  JSON / CSV / PDF files      │  ← manual backup, portability
└──────────────────────────────┘
```

### 1.4 High-Level Data Flow

```
[Browser: Next.js PWA]
   ├─ IndexedDB (Dexie) ── all financial data, works fully offline
   ├─ Zustand store ── in-memory reactive layer over IndexedDB
   ├─ Recharts/Tremor ── visual rendering
   └─ analytics call ──> [Python FastAPI service (Mode A, stateless, on-demand)]
                     OR ─> [Pyodide Web Worker (Mode B, fully in-browser)]

[Auth flow — Mode A only]
   Browser ──OAuth──> Google/Facebook/Apple ──> Next.js API route
        ──> MongoDB (users collection: upsert profile) ──> JWT cookie set
   Browser ──email/OTP──> Next.js API route ──> Nodemailer (send OTP)
        ──> user enters OTP ──> verified ──> MongoDB flag updated ──> JWT cookie set

[Scheduled jobs — Node cron on server — Mode A only]
   1st of month, 00:05 ──> query MongoDB users with active EMIs/statement pref
        ──> Nodemailer sends "EMI due this month" + "Monthly statement" emails
   Daily, 08:00 ──> check EMIs whose due date == today+3 ──> send reminder email

[Mode B — no server, no auth flow, no scheduled jobs]
   Single local user profile lives in Dexie `users` table from first app open.
```

### 1.5 Two Deployment Modes — Summary Comparison

| Aspect | Mode A — Cloud Auth | Mode B — Fully Local |
|---|---|---|
| Login screen | Yes (OAuth + email/OTP) | No — single local profile |
| Server | Node/Express API routes + MongoDB Atlas | None |
| Multi-device sync | No (by design — only auth persists server-side) | No |
| Analytics engine | FastAPI + pandas microservice | Pyodide (pandas/numpy) in a Web Worker |
| Email reminders/statements | Yes, via Nodemailer + node-cron | Not possible (no server/email identity) |
| EMI reminder delivery | Email | In-app only (badge/notification) |
| Best for | Product with accounts, cross-device login, email nudges | Personal, zero-infra, fully offline-first build |

---

## 2. DETAILED PAGE-BY-PAGE BREAKDOWN

### 2.1 Onboarding / Authentication (pre-Dashboard) — **Mode A**

**Core Purpose:** One-time registration, silent re-entry afterward.

**Visual Layout:**
- Full-screen splash → "Continue with Google" / "Continue with Facebook" / "Continue with Apple" (primary large rounded buttons, brand icons) → thin divider "or" → "Continue with Email" (opens OTP flow).
- Email flow: enter email → 6-digit OTP screen (auto-focus boxes, resend timer 30s) → success → auto-redirect to Dashboard.

**Micro-interactions:** Button press ripple, OTP box auto-advance, shake animation on wrong OTP, success checkmark animation (Framer Motion) before redirect.

**State Management:** On success, backend issues an httpOnly JWT cookie (long-lived). Zustand `authStore` holds `{ user, isAuthenticated }` hydrated from a `/api/me` call on app load. **No login screen is shown again** unless the cookie is invalid/expired or the user taps "Sign Out" in Settings.

**Backend Data:** `POST /api/auth/google|facebook|apple` (OAuth token exchange), `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`. Writes only to MongoDB `users` collection (upsert by email/OAuth ID).

> **Mode B alternative:** Skip this screen entirely. On first app open, silently create a single local `User` record in Dexie (id, name placeholder, default currency, theme) and route straight to the Dashboard. A lightweight "Set up your profile" nudge card can appear once on the Dashboard instead of a gated login flow.

---

### 2.2 Dashboard / Home Screen

**Core Purpose:** Instant financial snapshot + fastest possible entry point to log a transaction.

**Visual Layout (mobile-first, single column, max-width 480px centered on desktop):**
1. Sticky top header: greeting + avatar (from OAuth profile, or placeholder in Mode B) + **month selector** (chevrons ◀ "September 2026" ▶) + theme toggle / settings icon.
2. **Balance Overview Card** (rounded-2xl, soft gradient background, elevated shadow):
   - Three stat blocks — Total Income (green), Total Expense (red), Net Savings (blue/neutral) for the current month, with a small % change vs. last month.
   - Large Net Savings figure prominent (bold, ~32px) with two sub-stats side by side (Income ↑ / Expense ↓).
   - Subtle progress bar showing % of income spent this month.
   - Balance card numbers count up (tweened animation) on load/data change.
3. **Weekly Spending Quick Bar Graph** — 7 slim bars (Mon–Sun), current day highlighted, tap a bar to see that day's total in a tooltip and/or filter the Recent Transactions feed to that day.
4. **Recent Transactions Feed** — scrollable list of last 10–15 entries: category icon (colored circle background), title/merchant/note, date, amount (green for income, red for expense), payment-method micro-tag. Swipe-left reveals Edit/Delete.
5. **Floating Action Button (+)** — bottom-right, fixed, thumb-reachable, expands on tap (Framer Motion spring) into "Add Expense / Add Income" quick options, reaching the Add Transaction sheet in ≤3 taps (tap FAB → pick category → enter amount → save).

**Micro-interactions:**
- FAB scales up slightly on press (`whileTap`), expands with a shared-element morph transition into the Add Transaction sheet.
- Pull-to-refresh recalculates totals from IndexedDB.
- Swipe-to-delete triggers an optimistic removal + a 5-second undo toast before the delete actually commits to Dexie.
- Skeleton loaders (shimmer) while the initial Dexie query resolves.
- Category icons use one consistent color-coding scheme app-wide, defined once in `categories.ts`.

**User Actions:** Tap FAB → Add/Edit Transaction screen; tap a transaction → Edit (pre-filled); tap "See All" → full Transactions list; tap bar-graph day → filtered day view (links to Calendar); month chevrons → change `selectedMonth`, all cards re-derive.

**State Management:** Zustand `transactionStore` (via a `useTransactions()` hook / memoized selector) derives `{ totalIncome, totalExpense, netSavings, weeklyTotals, recent }` reactively from Dexie queries scoped to the current month; recomputed on every add/edit/delete.

**Data Needed:** Read-only queries against local IndexedDB `transactions` table filtered by `date BETWEEN selectedMonthStart AND selectedMonthEnd` (no backend call); `sum(amount) WHERE type='income'|'expense'` aggregates; last 7 days grouped by day; `categories` table for icon/color lookup; current income baseline from `income` records the user has added.

---

### 2.3 Add / Edit Transaction (Modal, bottom-sheet on mobile / centered modal on desktop)

**Core Purpose:** Add a transaction in under 3 taps.

**Visual Layout:**
- Slides up as a full-height bottom sheet (mobile) or centered modal (desktop), rounded top corners, drag-handle at top.
1. **Amount input** — dominant, center-aligned, huge (48–64px) numeric display with a live currency symbol prefix (tappable chip opens a Currency Selector picker sheet — searchable list, symbol + code).
2. **Type toggle** — Expense / Income segmented control at top.
3. **Category grid** — 3–4 column grid (or horizontally scrollable row) of rounded icon tiles (Food, Rent, Travel, Utilities, Entertainment, Shopping, Health, EMI, Other...). Selected tile scales up + colored ring (Framer Motion), no separate "confirm" step needed.
4. **Details section** (collapsed by default behind a "More details" expander, per Mode B refinement — optional but recommended to reduce initial taps further):
   - **Date & Time picker** — defaults to "now," tap to open native/date-fns picker.
   - **Payment Method** — segmented control/chips: Cash / Credit Card / Bank Transfer / UPI.
   - **Notes** — single-line, expandable textarea.
   - **Receipt upload** — tap to attach image (camera or file picker), stored as a base64/blob in IndexedDB (not uploaded anywhere, per device-only storage rule).
   - **Recurring toggle** — switch + frequency chips (Daily / Weekly / Monthly / Yearly) + optional end-date, shown when ON; recurring entries auto-generate future transactions via a lightweight scheduler that runs on app open (checks "next due" against today).
5. Sticky bottom **Save** button, full-width, disabled until amount + category are set; morphs into a checkmark and collapses the sheet on success.

**Micro-interactions:** Custom numeric keypad component (so amount entry never triggers the native mobile keyboard / layout jump) with haptic-style press feedback (scale + shadow); category tile bounce on select; inline Zod validation (amount > 0, category required); Save button morphs into a checkmark then the sheet closes.

**User Actions:** Save → local form state (React Hook Form) dispatches `addTransaction()`/`updateTransaction()` to Zustand → writes to Dexie `transactions` table → closes modal → Dashboard/Analytics react instantly (Zustand subscription). Edit mode: sheet opens pre-populated, Save becomes "Update," adds a "Delete" text button (confirmation dialog).

**Data Needed:** Categories list (local `categories` table, seeded with defaults, user-customizable in Settings); existing transaction record (edit mode); user's default currency (from settings store). No backend call at all — 100% local write.

---

### 2.4 Analytics & Graphic Insights Screen

**Core Purpose:** Turn raw transactions into decision-making insight, computed via a Python analysis layer (FastAPI in Mode A, Pyodide in Mode B).

**Visual Layout:**
1. **Filter bar** (sticky top): Date Range chips — This Week / This Month / This Year / Custom (opens range picker) — plus a Category multi-select filter/dropdown.
2. **Category Breakdown** — interactive Donut Chart (Recharts `PieChart`), center shows total spend for the filter period; tapping/hovering a slice highlights it and shows category name, %, amount, and transaction count in a side panel/tooltip; a tappable legend list below the chart can isolate a category.
3. **Monthly vs. Historical Comparison** — Stacked Bar Chart, one bar per month (last 6–12 months), segments = categories or income vs. expense (or by payment method); toggle between stacking modes.
4. **Daily Expense Velocity & Trend** — Line Chart of daily spend across the selected range, with a 7-day moving-average overlay line (Python-computed rolling average), a shaded ±1 standard-deviation band for anomaly detection, and an annotated peak-spend day marker; tapping a point shows that day's top transactions.
5. **Summary strip / insight callouts** below the charts — short auto-generated text (e.g., "You spent 18% more on Food this month," "Avg daily spend," "Highest spending day," "Fastest-growing category") — all generated by the Python layer.

**How the Python analysis works:**
- On opening this screen (or changing filters, debounced to avoid re-running per keystroke), the frontend serializes the relevant IndexedDB transaction rows to JSON.
- **Mode A:** `POST`s the payload (`transactions[]`, `range`, `groupBy`) to a FastAPI endpoint `/analyze`. The service uses **pandas** to group by category/date, computes % changes, moving averages, z-scores, and outlier days, and returns a compact JSON `{ donut, stackedBar, lineTrend, insights[] }`. The service is **stateless** — it never stores the data.
- **Mode B:** A `usePythonAnalytics(transactions, filters)` hook serializes the filtered transactions and posts them to a **Web Worker running Pyodide**; `pandas`/`numpy` compute rolling averages, month-over-month deltas, category z-scores, and simple linear-regression trend lines entirely in-browser; the worker returns the same structured JSON shape, cached by filter-hash. The Pyodide runtime is lazy-loaded (only on first Analytics visit) and cached thereafter.
- Either way, results are rendered with Recharts — Python does the math, JS/React does the drawing — respecting the "device memory only" data rule (Mode A treats the service call as transient/on-demand-only; Mode B never lets data leave the browser at all).

**Micro-interactions:** Chart entrance animations (staggered, Recharts `isAnimationActive`), smooth transition when filters change (skeleton → new chart), haptic-style tap feedback / visual pulse on donut-slice tap, empty-state illustration + CTA if no transactions exist yet for the selected range.

**Data Needed:** Local transactions (via Dexie) — full table or range-filtered subset with `amount, category, date, type` — pushed transiently to the analytics engine for computation only; `categories` for color/label mapping.

---

### 2.5 Budgeting & Goals Management

**Core Purpose:** Prevent overspending and track savings intent.

**Visual Layout:**
1. **"This Month's Budgets" / Category Limit Trackers** — a card per budgeted category: circular progress ring (or horizontal bar on narrow screens) showing spent/limit, remaining amount, colored per threshold:
   - **Green** < 70% used
   - **Yellow** 70–90% used
   - **Red** > 90% or over budget (ring/card also gets a subtle pulsing red border/animation + a small warning icon; over-budget cards show a small toast/badge, e.g., "You're $42 over budget.")
2. **"+ Add Budget"** button → sheet: pick category, set monthly limit, optional alert threshold % (e.g., 0.9 = warn at 90%).
3. **Savings Goals** section below budgets — cards per goal (e.g., "Emergency Fund," "Vacation," "New Laptop"): goal name, target amount, current saved amount, progress bar, target date, small illustration icon, "Add funds" quick-action button.
4. **Add Goal** button → sheet: name, target amount, target date, icon/color, optional linked auto-contribution rule (e.g., "10% of monthly income").

**Micro-interactions:** Progress rings animate from 0 → current % on mount (Framer Motion + SVG stroke-dashoffset); colors transition smoothly as new transactions push a category from green→yellow→red in real time; tapping a budget card opens a breakdown of the transactions contributing to that category this month.

**User Actions:** Edit/delete budget or goal; "Add funds" / manually add a contribution to a goal creates a linked transfer-/savings-type transaction tagged to the goal.

**State Management:** `budgets` store keyed by `categoryId + month`, recalculated reactively (derived selector) whenever a transaction in that category/month changes — never manually re-triggered. `goals` stored separately.

**Data Needed:** Local `budgets` and `goals` tables; spent-so-far computed live from `transactions` filtered by category + current month.

---

### 2.6 Calendar View (Day-wise Expense)

**Core Purpose:** Visualize spending by specific day.

**Visual Layout:** Month-grid calendar; each day cell shows a small colored dot/amount badge if transactions exist that day (red dot for net-expense day, green for net-income day). Tapping a day opens a bottom sheet listing that day's transactions with a mini total.

**User Actions:** Swipe between months; tap "+" inside a day sheet to add a transaction pre-filled with that date.

**Data Needed:** Local transactions grouped by `date` (ISO day key) via a Dexie index (`[categoryId+date]` composite index) for fast lookups.

---

### 2.7 EMI Management

**Core Purpose:** Track recurring loan/EMI obligations and get proactively reminded before they're due.

**Visual Layout:**
- List of EMI cards: EMI name, monthly cost, next due date, progress (e.g., "8 of 24 installments paid"), status tag (Upcoming / Due Soon / Overdue).
- **Add EMI** form: EMI Name, Total/Monthly Cost, Start Date, End Date (or number of installments), Due Date (day of month), Reminder preference (e.g., 3 days before).

**Logic:**
- **Mode A:** EMI records are stored locally in IndexedDB `emis` table **and** a lightweight mirror (EMI name + due day + amount + user email) is synced to MongoDB **only if the user opts into email reminders**, since the reminder email must be sent server-side. This is the one deliberate exception where a minimal EMI reference (not full expense data) exists server-side, clearly disclosed in Settings ("Enable EMI email reminders"). A daily cron checks EMIs due within N days → sends a reminder email ("Your [EMI Name] payment of ₹X is due on [date]"). On the 1st of each month, a summary email lists all EMIs due that month.
- **Mode B:** EMIs live only in the local `emis` table; reminders surface as in-app badges/notifications on app open (no email possible without a server/identity).

**Data Needed:** Local `emis` table (full detail); MongoDB `emi_reminders` sub-collection in Mode A (name, due day, amount, user email — only if opted in).

---

### 2.8 Settings & Profile

**Core Purpose:** Personalization, data control, account management.

**Visual Layout — profile header + grouped list (iOS-style settings sections):**
1. **Profile** — avatar (from OAuth in Mode A, editable placeholder in Mode B), name, email (read-only, from OAuth in Mode A), "Sign Out" (Mode A, with confirmation dialog).
2. **Preferences** — Currency switcher (searchable list, symbol + code, e.g., ₹ $ € £ ...), Dark/Light/System theme toggle (segmented control with live preview, instantly re-themes the whole app via CSS-variable swap with a ~200ms crossfade, no reload), Notification/email preferences (Monthly statement on/off, EMI reminders on/off — Mode A only).
3. **Categories** — "Manage Categories": add/edit/delete/reorder, pick icon + color/emoji picker.
4. **Data** — Export Data (CSV via PapaParse / PDF via a lightweight PDF lib / JSON — all generated client-side from IndexedDB), Import Data, Backup & Sync (manual "Download backup file" + "Restore from file" — exports full IndexedDB JSON dump the user can save or re-import, since there's no cloud copy of financial data by design), Clear All / Reset App Data (danger zone — destructive, requires a confirm modal with typed confirmation).
5. **About** — app version, privacy note explaining the device-only storage model.

**Micro-interactions:** Export buttons show a brief "Generating…" spinner then trigger a native file download; destructive actions require typed confirmation.

**Data Needed:** MongoDB for profile fields + notification-preference flags (Mode A); `settings` Dexie table (currency, theme, notification prefs) loaded once into a Zustand slice at app boot; `categories` full CRUD; full dataset for export operations.

---

## 3. DATABASE SCHEMA & DATA MODELS

### 3.1 MongoDB — `users` collection (Mode A only — the ONLY server-side collection)
```json
{
  "_id": "ObjectId",
  "authProvider": "google | facebook | apple | email",
  "providerId": "string (OAuth sub ID, null for email users)",
  "name": "string",
  "email": "string (unique, indexed)",
  "avatarUrl": "string",
  "isVerified": "boolean",
  "otp": {
    "codeHash": "string (hashed, temporary)",
    "expiresAt": "ISODate"
  },
  "preferences": {
    "currency": "string (e.g. INR)",
    "theme": "light | dark | system",
    "emailNotifications": {
      "monthlyStatement": "boolean",
      "emiReminders": "boolean"
    }
  },
  "emiReminders": [
    {
      "emiId": "string (matches local IndexedDB emi id)",
      "name": "string",
      "amount": "number",
      "dueDay": "number (1-31)",
      "startDate": "ISODate",
      "endDate": "ISODate"
    }
  ],
  "createdAt": "ISODate",
  "lastLoginAt": "ISODate"
}
```

### 3.2 IndexedDB (Dexie) — device-local tables

**JSON schema view (used in both modes):**

**`transactions`**
```json
{
  "id": "uuid",
  "type": "income | expense",
  "amount": "number",
  "currency": "string",
  "categoryId": "string (FK -> categories.id)",
  "date": "ISODate",
  "paymentMethod": "cash | credit_card | bank_transfer | upi",
  "notes": "string",
  "receiptBlob": "base64 | null",
  "isRecurring": "boolean",
  "recurrenceRule": "daily | weekly | monthly | yearly | null",
  "linkedGoalId": "string | null",
  "linkedEmiId": "string | null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

**`categories`**
```json
{ "id": "uuid", "name": "string", "icon": "string", "color": "string", "type": "income | expense | both", "isDefault": "boolean", "order": "number" }
```

**`budgets`**
```json
{ "id": "uuid", "categoryId": "string", "monthlyLimit": "number", "month": "YYYY-MM", "alertThreshold": "number (e.g. 0.9)" }
```

**`goals`**
```json
{ "id": "uuid", "name": "string", "targetAmount": "number", "currentAmount": "number", "targetDate": "ISODate", "icon": "string", "color": "string" }
```

**`emis`**
```json
{
  "id": "uuid",
  "name": "string",
  "monthlyCost": "number",
  "startDate": "ISODate",
  "endDate": "ISODate",
  "dueDay": "number",
  "totalInstallments": "number",
  "installmentsPaid": "number",
  "reminderDaysBefore": "number",
  "syncedToServer": "boolean"
}
```

### 3.3 Dexie/TypeScript schema (reference implementation, Mode B / local layer used by both modes)

```typescript
// db.ts — Dexie schema definition
import Dexie, { Table } from 'dexie';

export interface User {
  id: string;               // uuid, single local user in Mode B; mirrors MongoDB _id in Mode A
  name: string;
  defaultCurrency: string;  // ISO code e.g. "USD"
  theme: 'light' | 'dark' | 'system';
  createdAt: string;        // ISO date
}

export interface Category {
  id: string;
  name: string;             // "Food", "Rent", "Custom: Gym"
  icon: string;             // lucide icon name or emoji
  color: string;            // hex, e.g. "#F97316"
  type: 'expense' | 'income' | 'both';
  isCustom: boolean;
  order: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  categoryId: string;
  date: string;              // ISO 8601 datetime
  paymentMethod: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'UPI';
  notes?: string;
  receiptImage?: string;     // base64 or blob reference
  recurrence?: {
    frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
    endDate?: string;
    nextOccurrence: string;
  };
  goalId?: string;           // set if this transaction funds a savings goal
  emiId?: string;            // set if this transaction is an EMI payment
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string;             // "2026-09"
  limit: number;
  alertThreshold: number;    // e.g. 0.9 = warn at 90%
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  color: string;
  icon: string;
}

export interface EMI {
  id: string;
  name: string;
  monthlyCost: number;
  startDate: string;
  endDate: string;
  dueDay: number;
  totalInstallments: number;
  installmentsPaid: number;
  reminderDaysBefore: number;
  syncedToServer: boolean;   // Mode A only — true if mirrored to MongoDB for email reminders
}

class ExpenseTrackerDB extends Dexie {
  users!: Table<User, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  emis!: Table<EMI, string>;

  constructor() {
    super('ExpenseTrackerDB');
    this.version(1).stores({
      users: 'id',
      categories: 'id, order',
      transactions: 'id, date, categoryId, type, [categoryId+date]',
      budgets: 'id, [categoryId+month]',
      goals: 'id',
      emis: 'id, dueDay',
    });
  }
}

export const db = new ExpenseTrackerDB();
```

**Example JSON shape (for export/import & analytics-engine interchange, either mode):**
```json
{
  "user": { "id": "u1", "name": "Alex", "defaultCurrency": "USD", "theme": "dark" },
  "categories": [
    { "id": "c1", "name": "Food", "icon": "utensils", "color": "#F97316", "type": "expense", "isCustom": false, "order": 1 }
  ],
  "transactions": [
    { "id": "t1", "type": "expense", "amount": 24.50, "currency": "USD", "categoryId": "c1",
      "date": "2026-09-03T13:20:00Z", "paymentMethod": "UPI", "notes": "Lunch", "createdAt": "...", "updatedAt": "..." }
  ],
  "budgets": [
    { "id": "b1", "categoryId": "c1", "month": "2026-09", "limit": 300, "alertThreshold": 0.9 }
  ],
  "goals": [
    { "id": "g1", "name": "Emergency Fund", "targetAmount": 5000, "savedAmount": 1200, "targetDate": "2027-01-01", "color": "#10B981", "icon": "shield" }
  ]
}
```

---

## 4. EMAIL SYSTEM SPECIFICATION (Mode A only)

| Email | Trigger | Content |
|---|---|---|
| OTP Verification | User requests email login | 6-digit code, 5-min expiry |
| EMI Due Reminder | Daily cron, N days before an EMI's `dueDay` | EMI name, amount, due date |
| Start-of-Month EMI Summary | 1st of month, 00:05 | List of all EMIs due that month with total |
| Start-of-Month Expense Statement | 1st of month, 00:10 | **Note:** since full transaction data lives only on-device, this statement is generated **client-side** the next time the user opens the app that month (a "Monthly Statement Ready" push/email links them to an in-app report), OR the user can opt to have a lightweight monthly total (income/expense/savings numbers only, no line items) synced once a month specifically to enable this email — this must be an explicit opt-in toggle in Settings, consistent with the device-only data principle. |

Email credentials (SMTP host, user, app password/API key) and the MongoDB connection string are placeholders to be filled in later, e.g.:
```
MONGODB_URI=""
SMTP_HOST=""
SMTP_USER=""
SMTP_PASS=""
JWT_SECRET=""
GOOGLE_CLIENT_ID / SECRET=""
FACEBOOK_APP_ID / SECRET=""
APPLE_CLIENT_ID / SECRET=""
```

> **Mode B:** This entire section is skipped — there is no server, no cron, and no email identity to send to. Replace EMI/statement emails with in-app banners/badges on the Dashboard and EMI screen.

---

## 5. DESIGN TOKENS (for consistency across pages, both modes)

| Token | Light | Dark |
|---|---|---|
| `--bg-primary` | `#FAFAFA` | `#0F1115` |
| `--bg-card` | `#FFFFFF` | `#1A1D23` |
| `--text-primary` | `#111827` | `#F3F4F6` |
| `--accent` | `#6366F1` | `#818CF8` |
| `--success` | `#10B981` | `#34D399` |
| `--danger` | `#EF4444` | `#F87171` |
| `--warning` | `#F59E0B` | `#FBBF24` |
| Radius | `16px` cards, `24px` sheets | same |
| Shadow | soft, `0 4px 20px rgba(0,0,0,0.06)` | `0 4px 20px rgba(0,0,0,0.4)` |

Default category seed set (both modes): Food, Rent, Travel, Utilities, Entertainment, Shopping, Health, EMI, Salary, Other — each with an icon and color assigned from the palette above.

---

## 6. IMPLEMENTATION ROADMAP (MVP → Full Deployment)

**Phase 1 — MVP Core (Weeks 1–3)**
- Next.js + Tailwind scaffold, dark/light/system theme system, Dexie schema setup (`users`, `categories`, `transactions`).
- Dashboard with Balance Overview card + Recent Transactions feed (static/default categories only).
- Add/Edit Transaction modal (amount, category, date, payment method) — no recurring or receipts yet.
- Basic CRUD persistence to IndexedDB via Zustand.
- **Mode A:** Google OAuth login + JWT session (MongoDB `users` collection only).
- **Mode B:** silent local-user bootstrap, no login screen.
- **Goal:** a user can add, view, edit, and delete transactions and see an accurate running balance before moving on.

**Phase 2 — Insights & Budgeting (Weeks 4–6)**
- Weekly bar graph on Dashboard; month navigator.
- Analytics screen wired to the chosen analytics engine (FastAPI in Mode A / JS aggregation first, then Pyodide in Mode B) — donut, stacked bar, line chart with date-range & category filters.
- Budgeting & Goals module with progress rings/bars and threshold color logic; "Add funds" flow for goals.
- Category management (add/edit/reorder/recolor custom categories).
- Calendar day-wise view.

**Phase 3 — EMI + Automation (Weeks 7–8)**
- EMI CRUD screen + local storage; recurring-transactions engine; receipt upload.
- **Mode A:** node-cron jobs for EMI reminders and monthly summary email; opt-in EMI mirror sync to MongoDB.
- **Mode B:** in-app EMI due/overdue badges instead of email; integrate/finish the Pyodide worker for anomaly/trend analysis.
- Settings: notification preferences (Mode A) or data preferences (Mode B), opt-in sync toggles, CSV/PDF/JSON export, backup/restore JSON.

**Phase 4 — Polish & Deployment (Weeks 9–10)**
- **Mode A:** Facebook/Apple OAuth, OTP email login.
- PWA installability, offline testing, Framer Motion micro-interaction pass throughout (modals, sheets, progress rings).
- Accessibility audit (contrast, focus states, screen-reader labels) and performance pass (code-splitting, lazy-load Pyodide only on Analytics visit in Mode B).
- Final QA on mobile viewports; deploy frontend (Vercel) + Python service (Render/Fly.io, Mode A) + MongoDB Atlas (Mode A).

---

## 7. FULL BUILD PROMPT (for Antigravity / AI coding agent)

Paste the block below into Antigravity as the master build instruction. It defaults to **Mode A (Cloud Auth)** since it is the more feature-complete option; a callout at the end shows the one-line change to switch to **Mode B (Fully Local)**.

```
Build a mobile-first, installable PWA called "ExpenseTracker" using Next.js 14 (App Router),
TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Zustand, Dexie.js (IndexedDB) for storage,
React Hook Form + Zod for forms, Recharts for charts, and Lucide React for icons.

DESIGN: Clean, minimalist, professional. Rounded-2xl cards, soft shadows, generous spacing,
full dark/light/system theme support via CSS variables (accent indigo #6366F1 light /
#818CF8 dark, success green #10B981, danger red #EF4444, warning amber #F59E0B). Mobile-first,
max content width 480px centered on desktop. Smooth Framer Motion transitions on all
modals/sheets/progress indicators.

DATA RULE: All financial data (transactions, categories, budgets, goals, EMIs) must be stored
ONLY in the browser via IndexedDB using Dexie.js — never sent to any server for storage, except
transiently for on-demand analytics computation (see ANALYTICS below), which must remain
stateless. The ONLY server-side database is MongoDB, and it must contain exactly one collection,
`users`, holding authentication/profile/notification-preference data.

AUTH: Implement Google, Facebook, and Apple OAuth login plus an email + 6-digit-OTP login option
(OTP sent via Nodemailer). On success, issue a long-lived httpOnly JWT cookie so the user is
never asked to log in again unless they tap "Sign Out." Use placeholder env vars for all secrets
(MONGODB_URI, SMTP_HOST/USER/PASS, JWT_SECRET, GOOGLE/FACEBOOK/APPLE client credentials).

BUILD THESE SCREENS with a bottom-sheet-first mobile UX, soft shadows, rounded-2xl cards, and
full dark/light theme support:
1. Onboarding/Auth screen (OAuth buttons + email/OTP flow).
2. Dashboard: sticky header with month selector, balance overview card (income/expense/net
   savings with % change vs. last month and a spent-vs-income progress bar), weekly bar graph,
   recent transactions feed with swipe-to-delete + 5s undo toast, and a floating "+" action
   button that opens Add Transaction in <3 taps.
3. Add/Edit Transaction bottom sheet: large numeric amount input with a custom keypad and
   currency chip/selector, category icon grid, a collapsible "more details" section (date/time
   picker, payment method chips: Cash/Credit Card/Bank Transfer/UPI, notes, receipt image
   attach stored as a local blob, recurring toggle with Daily/Weekly/Monthly/Yearly frequency
   and optional end date).
4. Analytics screen: date-range and category filters; send the filtered transaction set to a
   Python FastAPI microservice (pandas-based, stateless, no persistence) which returns donut
   chart data, a stacked bar chart (monthly vs historical, toggle by category or payment
   method), a daily trend line chart with a 7-day moving average and a ±1 standard-deviation
   anomaly band, a peak-spend-day marker, and short auto-generated text insights (avg daily
   spend, highest spending day, fastest-growing category). Render with Recharts.
5. Budgeting & Goals screen: per-category monthly limit trackers as progress rings/bars colored
   green (<70%), yellow (70-90%), red (>90% or over, with a pulsing warning + over-budget
   toast), tappable to drill into that category's contributing transactions, plus savings goal
   cards with progress bars, target dates, and an "Add funds" quick action.
6. Calendar screen: month grid showing a colored dot per day with transactions; tap a day to see
   that day's transactions in a sheet, with a "+" to add a transaction pre-filled to that date.
7. EMI Management screen: add/edit EMIs (name, cost, start date, end date, due day, reminder
   lead time); list EMIs with status (Upcoming/Due Soon/Overdue) and installment progress.
8. Settings screen: profile (from OAuth), searchable currency switcher, theme toggle (instant
   crossfade re-theme), notification preferences (monthly statement, EMI reminders — both
   opt-in), category customization (add/edit/reorder/recolor), CSV/PDF/JSON export
   (client-side), full local-data backup/restore as JSON, reset-all-data with typed
   confirmation, sign out.

BACKEND: A minimal Node.js/Express (or Next.js API routes) layer that only handles: OAuth
callbacks, OTP request/verify, JWT issuance, and two scheduled cron jobs — (a) a daily job that
emails users whose EMIs are due within their configured reminder window, and (b) a job that runs
at the start of each month to email an EMI summary and, for users who opted in, a lightweight
monthly income/expense/savings totals statement (no transaction-level detail, since detailed
data never leaves the device).

DATA MODEL: Implement the Dexie schema for User, Category, Transaction, Budget, Goal, and EMI
exactly as specified below, with a Zustand store layer on top exposing hooks like
useTransactions(), useBudgets(), useGoals(), useSettings().

[paste the TypeScript interfaces and Dexie schema from Section 3.3 here]

Seed default categories: Food, Rent, Travel, Utilities, Entertainment, Shopping, Health, EMI,
Salary, Other — each with an icon and color.

Leave all secrets (Mongo URI, SMTP credentials, OAuth client IDs/secrets, DB name) as clearly
labeled placeholders in a .env.example file for me to fill in later.

BUILD ORDER — follow this 4-phase roadmap and confirm the working MVP loop (add → view → edit
→ delete a transaction, accurate balance) before proceeding to later phases:
Phase 1 (MVP): scaffold, theming, Dexie setup, Google OAuth, Dashboard, Add/Edit Transaction, CRUD.
Phase 2: weekly graph, Analytics screen wired to FastAPI (start with JS-only aggregation if
  the Python service isn't ready yet), Budgets/Goals UI + logic, Calendar view, category management.
Phase 3: EMI CRUD, node-cron reminder + monthly summary email jobs, recurring transactions,
  receipt upload.
Phase 4: Facebook/Apple OAuth, OTP email login, PWA/offline support, animation polish,
  accessibility & performance pass, deploy (Vercel + Render/Fly.io + MongoDB Atlas).
```

**To build Mode B (Fully Local, no backend) instead:** replace the AUTH and BACKEND paragraphs
above with: *"No login screen and no server. On first launch, silently create a single local
User record in Dexie (name, default currency, theme) and route straight to the Dashboard. Do
not implement OAuth, OTP, MongoDB, JWT, Nodemailer, or cron jobs. Replace the FastAPI analytics
call with a Web Worker running Pyodide (pandas + numpy) that computes the same donut/stacked-
bar/line-trend/insights JSON entirely client-side, lazy-loaded on first visit to the Analytics
screen. Replace email-based EMI reminders and the monthly statement with in-app badges/banners
on the Dashboard and EMI screens."*

---

**End of Merged Specification.**
