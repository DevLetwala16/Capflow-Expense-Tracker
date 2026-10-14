# CapFlow — Phase 5: QA, Testing & Deployment Guide

> **Step 5.1 — Testing** | **Step 5.2 — Deployment**
> 
> All design decisions locked. 83 unit + integration tests green. Ready for production deployment.

---

## Step 5.1 — Test Suite

### Test Infrastructure

| Tool | Role |
|------|------|
| **Jest** + **ts-jest** | Test runner + TypeScript compilation |
| **jest-environment-jsdom** | Browser-like env for Zustand / React tests |
| **`@jest-environment node`** | Per-file override for API route + Dexie tests |
| **fake-indexeddb** | In-memory IndexedDB — no real browser needed |
| **@testing-library/react** | (Available for future component tests) |
| **identity-obj-proxy** | Stubs CSS module imports |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-runs on save)
npm run test:watch

# Run a specific suite
npx jest __tests__/unit/analytics
```

### Test Results (baseline — all green ✅)

| Suite | File | Tests |
|-------|------|-------|
| Zod validation | `unit/validation/zodSchemas.test.ts` | 23 |
| Transaction store selectors | `unit/store/transactionStore.test.ts` | 12 |
| Settings store | `unit/store/settingsStore.test.ts` | 13 |
| Dexie schema + seed | `unit/db/schema.test.ts` | 12 |
| JS analytics engine | `unit/analytics/jsEngine.test.ts` | 17 |
| Auth API routes | `integration/api/auth.test.ts` | 6 |
| **Total** | | **83** |

### E2E Tests (Playwright — manual run)

E2E tests use [Playwright](https://playwright.dev/) and require a running Next.js dev server.

```bash
# Install Playwright browsers (once)
npx playwright install

# Start dev server first, then in another terminal:
npx playwright test
```

Critical flows to cover:
- [ ] Add → view → edit → delete a transaction
- [ ] Budget threshold color change (green → yellow → red)
- [ ] Export data download (CSV, JSON, PDF)
- [ ] OTP auth flow (email → 6-digit code → dashboard)
- [ ] Offline mode (devtools → Network → Offline)

### Mobile Viewport Testing

Test at these widths using browser devtools:

| Device | Width |
|--------|-------|
| iPhone SE | 375px |
| iPhone 14 Pro | 390px |
| iPhone 14 Plus | 430px |
| Galaxy S21 | 360px |

---

## Step 5.2 — Deployment

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────────────┐
│   Vercel             │────▶│   MongoDB Atlas       │     │   Render / Fly.io     │
│   Next.js PWA        │     │   (users + EMIs only) │     │   FastAPI analytics   │
│   (frontend + API)   │     │   Free tier           │     │   (stateless)         │
└─────────────────────┘     └──────────────────────┘     └───────────────────────┘
```

### Service 1 — Next.js Frontend (Vercel)

**One-time setup:**

1. Push the `nextjs/` directory to a GitHub repo.
2. Import the repo in [vercel.com](https://vercel.com) → **New Project**.
3. Set **Root Directory** to `nextjs` (if monorepo).
4. Add all environment variables from the table below.
5. Deploy → Vercel auto-detects Next.js 14 and configures the build.

**Environment Variables (Vercel Dashboard → Settings → Environment Variables):**

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `MONGODB_DB_NAME` | `Capflow` |
| `JWT_SECRET` | 64+ random hex chars |
| `JWT_EXPIRY` | `90d` |
| `CRON_SECRET` | Random secret for cron auth |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail App Password |
| `EMAIL_FROM` | `CapFlow <you@gmail.com>` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://your-app.vercel.app/api/auth/google/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_FASTAPI_URL` | `https://your-analytics.onrender.com` |
| `NEXT_PUBLIC_ANALYTICS_ENGINE` | `fastapi` |
| `FEATURE_MONTHLY_STATEMENT` | `false` (until privacy sign-off) |

**Vercel Cron Jobs** — already configured in `vercel.json`:
```json
{ "path": "/api/cron/emi-reminders",    "schedule": "0 2 * * *"   }
{ "path": "/api/cron/monthly-summary",  "schedule": "5 18 1 * *"  }
{ "path": "/api/cron/monthly-statement","schedule": "10 18 1 * *" }
```

> [!IMPORTANT]
> Add `CRON_SECRET` to each cron route handler verification to prevent unauthorized trigger.

---

### Service 2 — MongoDB Atlas

1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a **Free M0 cluster** (512 MB — sufficient for `users` collection only).
3. **Network Access** → Add IP `0.0.0.0/0` (Vercel uses dynamic IPs).
4. **Database Access** → Create a user with `readWrite` role on the `Capflow` database.
5. Copy the connection string → paste into Vercel env as `MONGODB_URI`.

---

### Service 3 — FastAPI Analytics (Render)

**Deploy to Render:**

1. Push the `fastapi/` directory to a GitHub repo (can be the same monorepo).
2. Create a new **Web Service** in [render.com](https://render.com).
3. Set:
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env var: `ALLOWED_ORIGINS=https://your-app.vercel.app`
5. Deploy.

**Or deploy to Fly.io:**
```bash
# From fastapi/ directory
fly launch
fly deploy
fly secrets set ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

### Pre-Deploy Checklist

- [ ] All `.env` secrets filled and verified (MongoDB URI, SMTP, OAuth credentials, JWT secret)
- [ ] MongoDB Atlas network access configured (allow all IPs for Vercel)
- [ ] CORS headers on FastAPI service locked to production frontend URL
- [ ] `next-pwa` production build tested locally (`npm run build && npm start`)
- [ ] Lighthouse audit passing:
  - Performance ≥ 90
  - Accessibility ≥ 90
  - PWA installable ✅
  - Best Practices ≥ 90
- [ ] Mobile viewport tested (375px, 390px, 430px)
- [ ] Offline mode tested (devtools → Network → Offline)
- [ ] Google OAuth callback URL updated to production domain in Google Cloud Console
- [ ] `FEATURE_MONTHLY_STATEMENT=false` until product/privacy sign-off
- [ ] Verify `/api/cron/*` routes require `CRON_SECRET` header check

---

### Post-Deploy Verification

After deploying, manually verify these critical paths:

| Flow | Check |
|------|-------|
| Splash → Auth | Splash auto-advances, Google OAuth redirects |
| OTP flow | Email arrives, 6-digit code works, JWT cookie set |
| Dashboard | Transactions load, month selector works |
| Add transaction | FAB → sheet → save → balance updates |
| Analytics | Charts render, JS engine fallback works |
| Export | CSV/JSON/PDF downloads work in production |
| PWA install | "Add to Home Screen" prompt appears on mobile |
| Offline | Dashboard works after cutting network |
| Email cron | Trigger `/api/cron/emi-reminders` manually to verify |

---

*Phase 5 complete. All 5 phases shipped. 🎉*
