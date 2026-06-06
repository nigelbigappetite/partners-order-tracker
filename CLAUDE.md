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

No test suite configured. Dev server runs on port 3002 locally.

## Architecture

### Google Sheets as Database (Orders, Payments, Reference Data)

All orders/payment data lives in a single Google Spreadsheet with named sheets (`Orders_Header`, `Order_Lines`, `SKU_COGS`, `Franchise_Summary`, `Supplier_Summary`, `Brand_Auth`, `Payments`, `Supplier_Invoices`, `Order_Supplier_Allocations`, etc.).

`lib/sheets.ts` (~3000 lines) is the core engine. It:
- Authenticates via a Google service account
- Fetches rows and transforms them to objects using a **column mapping system** (`columnMapping`) — sheet column headers map to camelCase property names, with multiple acceptable aliases per property
- All API routes use `export const dynamic = 'force-dynamic'` — no caching

**Debugging column issues**: `GET /api/debug/columns?sheet=SheetName` shows actual column names in any sheet. Use `GET /api/debug/sheets-analysis` for broader diagnostics.

### Supabase — Sales Data

Sales data lives in `hungry-tum-partners` Supabase project (`rmpdffxjwfgwgstksnzp`), schema `sales`, table `kitchen_sales`.

```sql
sales.kitchen_sales (
  id uuid PRIMARY KEY,
  brand_slug text,       -- 'smsh-bn' | 'wing-shack-co' | 'eggs-nstuff'
  date date,
  location text,         -- raw Deliverect kitchen name
  revenue numeric,
  gross_sales numeric,
  order_count integer,
  avg_order_value numeric,
  imported_at timestamptz,
  UNIQUE (brand_slug, date, location)
)
```

- `lib/sales-supabase.ts` — all Supabase sales reads/writes (uses REST API directly, not Supabase client)
- Headers use `Accept-Profile: sales` (reads) and `Content-Profile: sales` (writes/deletes)
- Upsert uses `Prefer: resolution=ignore-duplicates` — silently skips rows matching the composite unique constraint
- Env vars: `HT_PARTNERS_SUPABASE_URL`, `HT_PARTNERS_SERVICE_ROLE_KEY`

**Brand slugs (canonical, must match URL routing from Brand_Auth sheet):**
- `smsh-bn` — SMSH BN (Dec 2025 onwards, 263 rows)
- `wing-shack-co` — Wing Shack Co (Mar 2025 onwards, 8000 rows, 67 locations)
- `eggs-nstuff` — Eggs n Stuff (Nov 2025 onwards, 324 rows) ← note: no hyphen before 'stuff'

⚠️ `eggs-n-stuff` is WRONG — the routing slug is `eggs-nstuff`. Both are in BRAND_DISPLAY for legacy compat but only `eggs-nstuff` should be used for new uploads.

### Brand System & Auth

The app is multi-brand and multi-tenant:
- Routes are scoped under `/brands/[brandSlug]/`
- Brand auth uses HTTP-only cookies (`brand-auth-{slug}`, 30-day expiry) checked against a `Brand_Auth` sheet
- `lib/brandAuth.ts` handles session get/set; brand layout files call `getBrandSession()` server-side
- `admin` is a special brand slug with no password requirement
- Brand logos mapped in `lib/brandLogos.ts`
- `lib/supply.ts` — `BRAND_DISPLAY` map translates brand_slug → display name for admin views

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
│   └── sales/                         # Sales dashboard (reads from Supabase)
├── admin/
│   ├── payments/                      # Payment reconciliation dashboard
│   └── sales/                         # Sales CSV import, analysis, bulk delete
└── api/
    ├── orders/                        # Order CRUD
    ├── payments/                      # Payment tracking + recon
    ├── supplier-invoices/             # Supplier invoice management
    ├── sales/                         # GET (read from Supabase), import (CSV → Supabase), delete
    ├── sales/import/                  # POST: parse Deliverect CSV → insert to kitchen_sales
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
- CSV upload with brand selector + confirmation modal (pre-import stats + post-import result)
- "Today's Sales" section removed — manually updated data doesn't suit live widget

**Brand sales page** (`app/brands/[brandSlug]/sales/page.tsx`):
- Same filter/table pattern scoped to one brand
- Location filter (not city — full raw location string)

**CSV Upload flow** (`components/sales/CSVUpload.tsx`):
1. Drop/select CSV → 5-row preview shown
2. Click "Import CSV" → client-side full parse → **confirmation modal** shows: brand, row count, total revenue, total orders, date range, unique locations
3. User confirms → POST to `/api/sales/import` with `brand_slug`
4. Modal updates to show: imported (new rows) + skipped (duplicates)

**Location naming:**
- Deliverect exports use two formats:
  - `Brand - City` (space-dash-space, 2 parts) → city = last part e.g. "SMSH BN - BETHNAL GREEN" → "BETHNAL GREEN"
  - `Brand-City-Country` (hyphen, 3 parts) → city = second-to-last e.g. "Chesters-Bolton-UK" → "Bolton"
- `getCityFromLocation()` in both sales pages handles both formats

**Wing Shack Co note:** 8,000 rows (full year history) vs ~600 rows total for SMSH BN + Eggs n Stuff. Wing Shack Co will always dominate aggregate figures until other brands have comparable history uploaded.

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
- `components/sales/CSVUpload.tsx` — file drop + preview + confirmation modal

## Environment Variables

```bash
# Google Sheets (orders, payments, auth)
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase — hungry-tum-partners (sales data)
HT_PARTNERS_SUPABASE_URL=
HT_PARTNERS_SERVICE_ROLE_KEY=

# Optional (supplier invoice file uploads)
BLOB_READ_WRITE_TOKEN=   # Vercel Blob
```

`GOOGLE_PRIVATE_KEY` must preserve `\n` newline characters.

## Path Alias

`@/*` maps to `./` (repo root) — configured in `tsconfig.json`.

## Styling

TailwindCSS with a custom brand palette (Hungry Tum orange: `#FF6B35` primary, `#F7931E` secondary). Config in `tailwind.config.js`. 8px spacing grid, Inter font, light mode only.
