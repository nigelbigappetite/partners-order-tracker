# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-brand Supplier Ordering & Franchise Operations Dashboard for the Hungry Tum restaurant group. Originally Google Sheets-only backend; **sales data has now migrated to Supabase** (`hungry-tum-partners` project). Orders, payments, and reference data still use Google Sheets via `lib/sheets.ts`.

## Commands

```bash
npm run dev      # Development server at localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

No test suite configured. Dev server runs on port 3000 locally (falls back to 3001, 3002, etc. if in use).

## Architecture

### Google Sheets as Database (Orders, Payments, Reference Data)

All orders/payment data lives in a single Google Spreadsheet with named sheets (`Orders_Header`, `Order_Lines`, `SKU_COGS`, `Franchise_Summary`, `Supplier_Summary`, `Brand_Auth`, `Payments`, `Supplier_Invoices`, `Order_Supplier_Allocations`, etc.).

`lib/sheets.ts` (~3000 lines) is the core engine. It:
- Authenticates via a Google service account
- Fetches rows and transforms them to objects using a **column mapping system** (`columnMapping`) — sheet column headers map to camelCase property names, with multiple acceptable aliases per property
- All API routes use `export const dynamic = 'force-dynamic'` — no caching

**Debugging column issues**: `GET /api/debug/columns?sheet=SheetName` shows actual column names in any sheet. Use `GET /api/debug/sheets-analysis` for broader diagnostics.

### Supabase — Sales Data

Sales data lives in `hungry-tum-partners` Supabase project (`rmpdffxjwfgwgstksnzp`), schema `sales`. Two tables:

```sql
sales.kitchen_sales (
  id uuid PRIMARY KEY,
  brand_slug text,       -- 'smsh-bn' | 'wing-shack-co' | 'eggs-nstuff'
  date date,
  location text,         -- raw kitchen name
  platform text,         -- 'uber_eats' | 'deliveroo' | null (Deliverect rows have null)
  revenue numeric,
  gross_sales numeric,
  order_count integer,
  avg_order_value numeric,
  imported_at timestamptz,
  UNIQUE (brand_slug, date, location)
)

sales.kitchen_orders (
  id uuid PRIMARY KEY,
  brand_slug text,
  platform text,         -- 'uber_eats' | 'deliveroo'
  order_id text,
  date date,
  location text,
  gross_amount numeric,
  status text,
  imported_at timestamptz,
  UNIQUE (platform, order_id)
)
```

- `lib/sales-supabase.ts` — kitchen_sales reads/writes
- `lib/kitchen-orders-supabase.ts` — kitchen_orders reads/writes
- Headers use `Accept-Profile: sales` (reads) and `Content-Profile: sales` (writes)
- Upsert uses `Prefer: resolution=ignore-duplicates`
- Env vars: `HT_PARTNERS_SUPABASE_URL`, `HT_PARTNERS_SERVICE_ROLE_KEY`

⚠️ **PostgREST date filter bug**: `date=lte.CURRENT_UTC_DATE` can silently return 0 rows for records dated that same day. Always use `date=lt.NEXT_DAY` instead. This is implemented in `getKitchenOrders`.

**Second Supabase project — brain** (`jbqyzfaxhkkgggvvzobz`):
- Contains `raw_events` table with per-order Deliveroo webhook data
- Queried by `/api/sales/deliveroo-site` and `/api/sales/orders` for kitchen sites
- Env vars: `HT_BRAIN_SUPABASE_URL`, `HT_BRAIN_SERVICE_KEY`

**Brand slugs (canonical, must match URL routing from Brand_Auth sheet):**
- `smsh-bn` — SMSH BN (Dec 2025 onwards)
- `wing-shack-co` — Wing Shack Co (Mar 2025 onwards, 8000+ rows, 67 locations)
- `eggs-nstuff` — Eggs n Stuff (Nov 2025 onwards) ← note: no hyphen before 'stuff'
- `wing-shack-chatham` — Wing Shack Chatham kitchen site (Jun 2026 onwards)

⚠️ `eggs-n-stuff` is WRONG — the routing slug is `eggs-nstuff`.

### Brand System & Auth

The app is multi-brand and multi-tenant:
- Routes are scoped under `/brands/[brandSlug]/`
- Brand auth uses HTTP-only cookies (`brand-auth-{slug}`, 30-day expiry) checked against a `Brand_Auth` sheet
- `lib/brandAuth.ts` handles session get/set; brand layout files call `getBrandSession()` server-side
- `admin` is a special brand slug with no password requirement
- Brand logos mapped in `lib/brandLogos.ts`
- `lib/supply.ts` — `BRAND_DISPLAY` map translates brand_slug → display name for admin views
- `lib/brands.ts` — `BrandDefinition` registry with `canonicalSlug`, `dataBrandSlug`, `locationFilter`, `dataStartDate`, `deliverooLocationKey`, `kitchenLocation`, `orderingSiteId`

**BrandDefinition fields relevant to kitchen sites:**
| Field | Purpose |
|---|---|
| `dataBrandSlug` | Query kitchen_sales under a different slug (e.g. `wing-shack-chatham` queries as `wing-shack-co`) |
| `locationFilter` | PostgREST `ilike.*VALUE*` filter on location column |
| `dataStartDate` | Ignore sales before this date (prior-operator data) |
| `deliverooLocationKey` | Key for brain Supabase Deliveroo webhook lookup |
| `kitchenLocation` | Canonical location name — normalises all rows to one string |
| `orderingSiteId` | Links to hungry-tum-ordering site for supply orders |

**`isKitchenSite` flag** = `!!(brandDef?.deliverooLocationKey || brandDef?.orderingSiteId)` — drives entirely different UI on the brand sales page.

### Route Structure

```
app/
├── brand-select/                      # Entry point — pick a brand
├── brands/[brandSlug]/
│   ├── dashboard/                     # KPI overview + sortable brands table (admin) / orders table (brand)
│   ├── orders/                        # Order list
│   ├── locations/                     # Franchise location performance
│   ├── products/                      # SKU catalog
│   ├── suppliers/                     # Supplier metrics
│   └── sales/                         # Sales dashboard — branches on isKitchenSite
├── admin/
│   ├── payments/                      # Payment reconciliation dashboard
│   └── sales/                         # Sales CSV import (Deliverect + Uber), manual entry, bulk delete
└── api/
    ├── orders/                        # Order CRUD (Google Sheets)
    ├── orders/kitchen-site/           # Supply orders for kitchen sites (hungry-tum-ordering)
    ├── payments/                      # Payment tracking + recon
    ├── supplier-invoices/             # Supplier invoice management
    ├── sales/                         # GET daily sales from kitchen_sales
    ├── sales/import/                  # POST: Deliverect CSV → kitchen_sales
    ├── sales/import/uber/             # POST: Uber Eats CSV → kitchen_sales + kitchen_orders
    ├── sales/orders/                  # GET per-order data (kitchen_orders + brain Deliveroo)
    ├── sales/deliveroo-site/          # GET Deliveroo daily aggregates from brain raw_events
    ├── sales/delete/                  # DELETE: bulk delete by id array
    ├── brands/[slug]/auth             # Brand password check
    ├── skus/, franchises/, suppliers/ # Reference data
    └── debug/                         # Column/data diagnostics
```

### Sales Feature — Key Details

**Admin sales page** (`app/admin/sales/page.tsx`):
- Filters: date range (default All Time), brand dropdown, location dropdown
- KPI cards: Total Revenue, Total Orders, AOV, Active Kitchens
- Daily Sales table with checkboxes for bulk delete
- Three upload paths: Deliverect CSV (`CSVUpload`), Uber Eats CSV (`UberCSVUpload`), Manual entry (`ManualSalesEntryModal`)

**Brand sales page** (`app/brands/[brandSlug]/sales/page.tsx`):
- Branches on `isKitchenSite`:
  - **Standard brands**: Date + Location filter, Revenue/GrossSales/Orders/AOV table, Revenue by Location breakdown
  - **Kitchen sites**: Platform logos instead of location, 3 KPI cards (Gross Sales / Total Orders / AOV), Order History section with individual orders

**Kitchen site sales flow:**
1. `fetchSales` — fetches `kitchen_sales` (filters out `platform='deliveroo'` rows), then merges live Deliveroo daily data from `/api/sales/deliveroo-site`, normalises all locations to `kitchenLocation`
2. `fetchOrders` — fetches `/api/sales/orders` which combines `kitchen_orders` (Uber) + brain `raw_events` (Deliveroo per-order)

**Uber Eats CSV import** (`components/sales/UberCSVUpload.tsx` → `/api/sales/import/uber`):
- Parses per-order rows, skips blank Order ID rows (ad spend)
- Aggregates to daily totals → `kitchen_sales`
- Also writes raw per-order rows → `kitchen_orders` (non-blocking, silent if table missing)
- Date format: `DD/MM/YYYY` → `YYYY-MM-DD`
- `brand_slug` passed from admin upload form (default: `wing-shack-co`)

**Deliveroo order data** — sourced from brain Supabase `raw_events` table, NOT from `kitchen_sales`. The `/api/sales/deliveroo-site` route aggregates brain events by date; `/api/sales/orders` returns individual events. Any Deliveroo rows in `kitchen_sales` are filtered out on the frontend.

**Platform logos**: `/public/uber eats logo.png`, `/public/deliveroo logo.png`, `/public/just eat logo.png`. Rendered via `components/PlatformLogo.tsx`. Heights: 28px desktop table, 24px order history, 20px mobile.

**CSV Upload flow (Deliverect)** (`components/sales/CSVUpload.tsx`):
1. Drop/select CSV → 5-row preview shown
2. Click "Import CSV" → confirmation modal (brand, row count, revenue, orders, date range, locations)
3. User confirms → POST to `/api/sales/import` with `brand_slug`
4. Shows imported (new) + skipped (duplicates)

**Location naming:**
- Deliverect: `Brand - City` → city = last part; `Brand-City-Country` → city = second-to-last
- Kitchen sites: all rows normalised to `kitchenLocation` string from `BrandDefinition`

**Wing Shack Co note:** 8,000+ rows. `wing-shack-chatham` uses `dataBrandSlug: 'wing-shack-co'` + `locationFilter: 'Chatham'` to scope to Chatham rows only. `/api/sales/orders` queries both `wing-shack-co` AND `wing-shack-chatham` slugs and deduplicates, to handle records stored under either slug.

### Admin Dashboard (`app/brands/[brandSlug]/dashboard/page.tsx`)

- **Admin view:** sortable brands performance table (Brand, Orders, Revenue, Gross Profit, Margin %, Last Order) — no orders table
- **Brand view:** orders table scoped to that brand
- Brand summary cards removed; "Brands" nav tab removed from Navigation.tsx

### Payment Reconciliation (Core Feature)

Three-level payment tracking:
1. **Partner pays you** (sales invoice) — tracked on `Payments` sheet
2. **You pay supplier** (supplier invoice) — tracked on `Supplier_Invoices` sheet
3. **Supplier invoices linked to orders** — via `Order_Supplier_Allocations` sheet

Status workflow: `OPEN → PAID_NOT_CLEARED → WAITING_SUPPLIERS → SETTLED`

### Component Patterns

- Client components use `'use client'` directive
- Toast notifications via `react-hot-toast` (configured in root layout)
- Icons from `lucide-react`
- `components/payments/` — modal-heavy payment workflow components
- `components/Table.tsx` — generic reusable sortable table used throughout
- `components/sales/CSVUpload.tsx` — Deliverect CSV: file drop + preview + confirmation modal
- `components/sales/UberCSVUpload.tsx` — Uber Eats CSV upload (same 3-stage pattern)
- `components/sales/ManualSalesEntryModal.tsx` — manual single-day sales entry
- `components/PlatformLogo.tsx` — renders platform logo img or text fallback; exports `getPlatformLabel()`
- `components/partners/WSCChathamPartnerAccount.tsx` — Wing Shack Chatham partner dashboard (sales reporting only, no payout figures)

## Environment Variables

```bash
# Google Sheets (orders, payments, auth)
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase — hungry-tum-partners (kitchen_sales, kitchen_orders)
HT_PARTNERS_SUPABASE_URL=
HT_PARTNERS_SERVICE_ROLE_KEY=

# Supabase — brain (Deliveroo raw_events webhook data)
HT_BRAIN_SUPABASE_URL=
HT_BRAIN_SERVICE_KEY=

# Optional (supplier invoice file uploads)
BLOB_READ_WRITE_TOKEN=   # Vercel Blob
```

`GOOGLE_PRIVATE_KEY` must preserve `\n` newline characters.

## Path Alias

`@/*` maps to `./` (repo root) — configured in `tsconfig.json`.

## Styling

TailwindCSS with a custom brand palette (Hungry Tum orange: `#FF6B35` primary, `#F7931E` secondary). Config in `tailwind.config.js`. 8px spacing grid, Inter font, light mode only.
