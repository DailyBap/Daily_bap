# Daily Bap — Creator Coupon System: Release Notes & Production Runbook

**Branch:** `feature/creator-coupons`  
**Merge target:** `main`  
**Release date:** 2026-10-03  
**Written by:** Antigravity ADE  

---

## Overview

This release adds a complete **Creator Coupon / Influencer Partner System** to Daily Bap. Creators get custom promo codes that give buyers a discount and earn the creator a commission on every delivered order. All logic is enforced server-side — the client never controls prices or totals.

---

## Commits Included

| Commit | Stage | Summary |
|--------|-------|---------|
| `f602f0e` | 0/pre | Server-side pricing engine, order actions rewrite, admin auth endpoints |
| `e299cbd` | A | Live server security proof — 6 automated tests, all pass |
| `4b4bed5` | B | `placeOrder` on TEST DB — coupon validation, lowercase normalization, fake-price rejection |
| `58a6f19` | C | AI chat `createOrderRecord` wired to server `calculateOrderTotals` |
| `c5acc2b` | D | Customer UI: coupon field in CartDrawer, rate-limited validation, Zustand v2 migration |
| `df5a4f9` | E | Admin panel: Creator management tab, IST Sales Analytics tab, commission payout modals |
| `c07acbb` | F | Excel export route, `.xlsx`/`.csv` creator import with per-row error preview |

---

## Pre-Deployment Checklist

> [!IMPORTANT]
> Complete every item before merging to `main` and deploying to production.

### 1. Neon Database — Switch to Production Branch

The `.env.local` currently points to the **Neon TEST branch** (`ep-livel*`). Before deploying:

1. Open [Neon Console](https://console.neon.tech) → your project → **Branches**.
2. Select the **main/production branch**.
3. Copy the connection string for your production database.
4. Update `DATABASE_URL` in your production environment (Vercel → Settings → Environment Variables).
5. Run the migration against production (see §2 below).

> [!CAUTION]
> Never use the TEST branch in production. It is for development only and has no SLA.

### 2. Apply Database Migration to Production

The Creator Coupon system requires these columns and tables. Run the following SQL once against your **production Neon branch**:

```sql
-- influencers table (creator partners)
CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  instagram_handle TEXT,
  phone_or_upi TEXT,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  commission_percent INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- New columns on orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS influencer_id UUID REFERENCES influencers(id),
  ADD COLUMN IF NOT EXISTS commission_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ;

-- Index for faster creator lookups
CREATE INDEX IF NOT EXISTS idx_orders_influencer_id ON orders(influencer_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code);
CREATE INDEX IF NOT EXISTS idx_influencers_code ON influencers(code);
```

> [!WARNING]
> These are additive-only changes. No existing order data is altered. The migration is safe to run on a live database with zero downtime.

### 3. Production Environment Variables

Set the following in your Vercel project (or hosting provider) environment:

| Variable | Requirement |
|----------|------------|
| `DATABASE_URL` | Production Neon connection string (pooled recommended) |
| `ADMIN_PASSWORD` | At least **32 characters** of random entropy |
| `ADMIN_SESSION_SECRET` | At least **64 characters** of random entropy |
| `GEMINI_API_KEY` | For AI chat functionality |
| `META_PAGE_ACCESS_TOKEN` | Optional — for WhatsApp post-delivery review pings |

**Generate secrets securely:**
```bash
# ADMIN_PASSWORD (32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# ADMIN_SESSION_SECRET (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> [!CAUTION]
> Never commit secrets to Git. Never echo them in logs.

---

## Feature Documentation

### Creator Coupon Flow (End-to-End)

```
Customer enters code in CartDrawer
   ↓ validateCouponAction (server, rate-limited 10/min per IP)
   → returns { valid, discountAmount, discountPercent, creatorName }
   → CartDrawer shows green preview "Save ₹X with CODENAME"
   ↓
Customer submits order (CheckoutForm)
   ↓ placeOrder server action
   → Re-validates coupon server-side (ignores any client-sent prices)
   → calculateOrderTotals() computes ALL amounts server-side:
       foodSubtotal = sum of server-validated menu prices
       discountAmount = floor(foodSubtotal × discountPercent / 100)
       deliveryFee = 0 if foodSubtotal ≥ ₹1000, else 49/69/99 by distance
       totalAmount = foodSubtotal - discountAmount + deliveryFee
       commissionAmount = floor(totalAmount × commissionPercent / 100)
   → Writes order to DB with couponCode, discountAmount, influencerId, commissionAmount
   → commissionPaid = false (default)
```

### Security Properties

| Property | Implementation |
|----------|---------------|
| Client prices ignored | `calculateOrderTotals()` reads prices from `menuData` server config only |
| Paused codes rejected | `isActive = false` → "Invalid or expired coupon code." |
| Invalid codes | Generic error, no information leakage |
| Rate limiting | `validateCouponAction` — 10 checks/min per IP via in-memory `Map` |
| Admin session | httpOnly cookie, SHA-256 HMAC, constant-time comparison, 6-attempt lockout |
| Export auth | `GET /api/admin/export/creators` returns 401 without valid admin session |
| Import injection | All imported cell values stripped of leading `=`, `+`, `-`, `@` characters |

### Admin Dashboard Tabs

| Tab | What It Does |
|-----|-------------|
| **Orders Queue** | Lists all orders newest-first. Shows coupon badge + discount + commission for creator orders. Quick `Mark Paid` / `Paid` toggle per order. |
| **Creator Partners** | Lists all creators with live stats (orders, gross sales, commission earned, unpaid payout). Add/Edit/Pause/Activate modals. Monthly payout modal marks all delivered orders for a creator in a given IST month as paid or unpaid. |
| **Sales Analytics** | Month picker (YYYY-MM, defaults to current IST month). 6 KPI cards: Gross Revenue, Delivered Orders, AOV, Total Discounts, Creator Commission, Net Revenue. Order status breakdown. Creator performance table. Daily sales SVG bar chart (hover for detail). |
| **Offers Banner** | Daily offer banner management (existing feature, unchanged). |

### Excel Export (`GET /api/admin/export/creators`)

Triggers a `.xlsx` download with:
- **Sheet 1 — Creator Partners:** All creators with stats (orders, sales, paid/unpaid commission).
- **Sheet 2 — Delivered Orders:** All delivered orders with coupon info and payout status.

Auth-gated. Formula injection neutralized.

### Creator Import (`.xlsx` / `.csv`)

- **Column auto-detection** by header keyword (`name`, `code`, `coupon`, `handle`, `upi`, `discount`, `commission`, `notes`).
- **Existing codes preserved** — never deletes existing creators.
- **Per-row error preview** in the admin UI after upload.
- Duplicate codes in the same file are caught individually.

Expected CSV/XLSX header row:
```
name, code, instagramHandle, phoneOrUpi, discountPercent, commissionPercent, notes
```

---

## IST Timezone Handling

All date aggregations in the Sales Analytics and Monthly Payout system use:

```sql
(orders.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'
```

This means month boundaries are calculated in **Indian Standard Time (UTC+5:30)**, not UTC. An order placed at 23:50 IST on 30 September is counted in September, and an order at 00:10 IST on 1 October is counted in October — as expected.

---

## No-Coupon Order Backward Compatibility

Orders placed without a coupon code are **byte-identical** to pre-feature orders:
- `couponCode = null`, `discountAmount = 0`, `influencerId = null`, `commissionAmount = 0`
- WhatsApp receipt output is unchanged (no "Discount" line shown)
- Order tracking page (`/orders/[id]`) only shows the discount line when `couponCode` is present

---

## Rollback Plan

If anything goes wrong after deploying:

1. **Revert code** to `main` previous commit.
2. The new DB columns (`coupon_code`, `discount_amount`, etc.) default to `null`/`0` — existing orders are unaffected.
3. The `influencers` table can be left in place; it has no side effects on the existing order flow.
4. No data loss risk — the migration is purely additive.

---

## Files Changed (Full List)

### New Files
- `app/actions/influencerActions.ts` — Creator CRUD + payout server actions
- `app/actions/salesActions.ts` — IST Sales Analytics SQL aggregation
- `app/actions/influencerImportActions.ts` — `.xlsx`/`.csv` creator import server action
- `app/api/admin/export/creators/route.ts` — Excel export API route
- `lib/couponUtils.ts` — `calculateOrderTotals()` server-side pricing engine
- `lib/adminAuth.ts` — httpOnly session cookie, rate limiter, SHA-256 HMAC
- `scripts/init-test-db.cjs` — Neon TEST branch table initializer

### Modified Files
- `app/actions/adminActions.ts` — Extended `getAllOrders` with coupon/commission fields
- `app/actions/orderActions.ts` — `placeOrder` uses `calculateOrderTotals()`, server-validates coupon
- `app/api/chat/route.ts` — `createOrderRecord` tool uses `calculateOrderTotals()`, no client prices
- `app/admin/AdminDashboardClient.tsx` — Full 4-tab admin dashboard rewrite
- `app/admin/page.tsx` — Fetches influencers + sales stats for dashboard
- `components/CartDrawer.tsx` — Coupon input field + discount preview
- `components/CheckoutForm.tsx` — Re-validates coupon server-side at submit
- `store/useCartStore.ts` — Zustand v2 migration with backward-compatible cart migration
- `lib/schema.ts` — `influencers` table, new `orders` columns
- `lib/whatsapp.ts` — WhatsApp link generator with optional discount line

### Test / Scratch Scripts (not in production bundle)
- `scratch/run-stage-a-security-tests.cjs`
- `scratch/run-stage-b-parity-and-orders.ts`
- `scratch/run-stage-c-chat-tests.ts`
- `scratch/run-stage-e-ist-boundary-tests.ts`
- `scratch/run-stage-e-verification.ts`
- `scratch/stage-g-env-check.ps1`
