# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-brand Supplier Ordering & Franchise Operations Dashboard for the Hungry Tum restaurant group. **Google Sheets backend (`lib/sheets.ts`) has been removed.** The app now focuses on kitchen sites, sales data (Supabase), and weekly partner reports. Orders, payments, franchises, and SKU routes have been deleted as part of this slimdown.

## Commands

```bash
npm run dev      # Development server at localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

No test suite configured. Dev server runs on port 3000 locally (falls back to 3001, 3002, etc. if in use).

## Architecture

### Google Sheets (Removed)

`lib/sheets.ts` has been deleted. All Google Sheets-backed routes (orders, payments, franchises, SKUs, suppliers, debug) have been removed. Google service account env vars are no longer used.

### Supabase — hungry-tum-partners

Project ID `rmpdffxjwfgwgstksnzp`. Contains schema `sales` (sales data) and the `public.kitchen_sites` table (kitchen site config).

**`lib/supabase-client.ts`** — exports `partnersSupabase` (a `@supabase/supabase-js` client for the partners project). Use this for table queries instead of raw fetch where convenient.

**`kitchen_sites` table** (`public` schema):
```sql
kitchen_sites (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  display_name text,
  logo_path text,
  data_brand_slug text,
  location_filter text,
  deliveroo_location_key text,
  kitchen_location text,
  ordering_site_id text,
  data_start_date text,
  password text,
  franchisee_email text,
  active boolean DEFAULT true,
  created_at timestamptz
)
```
`lib/kitchen-sites-db.ts` provides: `getKitchenSitesFromDb()`, `getKitchenSiteBySlug(slug)`, `createKitchenSite(data)`, `updateKitchenSite(slug, data)`, `deactivateKitchenSite(slug)`, and `siteRecordToBrandDef(site)` (converts a row to a `BrandDefinition`).

Kitchen site auth passwords are now stored in this table (the `password` column) rather than Vercel env vars, though `KITCHEN_ADMIN_PASSWORD` still works for any kitchen.

**Sales data** (`sales` schema). Two tables:

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
| `uberRestaurantName` | Exact restaurant name in Uber Eats CSV exports — use when it differs from `kitchenLocation` (e.g. Loughton appears as "Wing Shack Co" with no location suffix) |

**`isKitchenSite` flag** = `!!(brandDef?.deliverooLocationKey || brandDef?.orderingSiteId)` — drives entirely different UI on the brand sales page.

**Admin sites management** (`app/admin/sites/`): UI to create, edit, deactivate kitchen sites stored in `kitchen_sites`. API routes at `/api/admin/sites` (GET list, POST create) and `/api/admin/sites/[slug]` (PATCH update, DELETE deactivate). Includes password visibility toggle, copy-link, and slugify-on-name-entry helpers.

**Kitchen site auth** (`app/kitchens/`): separate login from brand auth. Uses `lib/kitchenAuth.ts` with its own cookies; login page at `/kitchens/login`.

**Homepage** (`app/brand-select/`): shows brands only — kitchens are NOT listed. Each kitchen operator bookmarks their direct URL (`/kitchens/[slug]`) and is redirected to login if unauthenticated. Per-kitchen passwords set via Vercel env vars: `KITCHEN_PASSWORD_[SLUG_UPPERCASE_WITH_UNDERSCORES]`. Admin password `KITCHEN_ADMIN_PASSWORD` works for any kitchen.

### Route Structure

```
app/
├── brand-select/                      # Entry point — pick a brand
├── brands/[brandSlug]/
│   ├── dashboard/                     # KPI overview + sortable brands table (admin) / orders table (brand)
│   └── sales/                         # Sales dashboard — branches on isKitchenSite
├── kitchens/
│   ├── login/                         # Kitchen site login (separate auth from brand auth)
│   └── [kitchenSlug]/
│       ├── layout.tsx                 # Kitchen layout (KitchenNavigation)
│       ├── page.tsx                   # Redirects to /sales
│       ├── dashboard/                 # Kitchen dashboard
│       ├── orders/                    # Kitchen supply orders
│       └── sales/                     # Kitchen sales dashboard (platform toggle, last 7 days default)
├── admin/
│   ├── sites/                         # Kitchen site CRUD (Supabase kitchen_sites table)
│   └── sales/                         # Sales CSV import (Deliverect + Uber), manual entry, bulk delete
└── api/
    ├── orders/kitchen-site/           # Supply orders for kitchen sites (hungry-tum-ordering)
    ├── admin/sites/                   # GET/POST kitchen sites
    ├── admin/sites/[slug]/            # PATCH/DELETE individual kitchen site
    ├── sales/                         # GET daily sales from kitchen_sales
    ├── sales/import/                  # POST: Deliverect CSV → kitchen_sales
    ├── sales/import/uber/             # POST: Uber Eats CSV → kitchen_sales + kitchen_orders
    ├── sales/orders/                  # GET per-order data (kitchen_orders + brain Deliveroo)
    ├── sales/deliveroo-site/          # GET Deliveroo daily aggregates from brain raw_events
    ├── sales/delete/                  # DELETE: bulk delete by id array
    ├── brands/[slug]/auth             # Brand password check
    └── kitchens/auth                  # Kitchen site password check
```

**Removed routes** (deleted with Google Sheets): `/api/orders/`, `/api/payments/`, `/api/supplier-invoices/`, `/api/skus/`, `/api/franchises/`, `/api/suppliers/`, `/api/debug/`, `/api/company-earnings/`.

### Sales Feature — Key Details

**Admin sales page** (`app/admin/sales/page.tsx`):
- Filters: date range (default current pay week), brand dropdown, location dropdown
- KPI cards: Total Revenue, Total Orders, AOV, Active Kitchens
- Daily Sales table with checkboxes for bulk delete
- Three upload paths: Deliverect CSV (`CSVUpload`), Uber Eats CSV (`UberCSVUpload`), Manual entry (`ManualSalesEntryModal`)

**Brand sales page** (`app/brands/[brandSlug]/sales/page.tsx`):
- Branches on `isKitchenSite`:
  - **Standard brands**: Date + Location filter, Revenue/GrossSales/Orders/AOV table, Revenue by Location breakdown
  - **Kitchen sites**: Date filter + platform toggle pills, 3 KPI cards (Gross Sales / Total Orders / AOV), Order History section with individual orders
- **Platform toggle**: pill buttons (All Platforms / Uber Eats / Deliveroo) rendered when 2+ platforms exist in the data; filters both Daily Sales table and Order History simultaneously. `selectedPlatform` state drives `filteredSales` and `filteredOrders` memos.

**Default date range**: All pages default to the current pay week (Mon–today). On Mondays, defaults to last week (Mon–Sun) since there is no current-week data yet. Uses `toLocalDateStr()` from `lib/utils.ts` for all date-to-string conversions — **never use `toISOString().split('T')[0]`** as it converts to UTC and shifts UK BST dates one day back.

**Kitchen site sales flow:**
1. `fetchSales` — fetches `kitchen_sales` (filters out `platform='deliveroo'` rows), then merges live Deliveroo daily data from `/api/sales/deliveroo-site` **filtered to the selected date range**, normalises all locations to `kitchenLocation`
2. `fetchOrders` — fetches `/api/sales/orders` which combines `kitchen_orders` (Uber) + brain `raw_events` (Deliveroo per-order)

⚠️ **Deliveroo date filtering**: The `/api/sales/deliveroo-site` endpoint returns all rows — date range filtering must be applied client-side after the fetch (see `fetchSales` in sales pages).

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
- `components/locations/DateRangePicker.tsx` — shared date range picker used on all pages
  - Presets: **This week** / **Last week** (Mon–Sun pay weeks) / Last 7 days / Last 30 days / Last 90 days / All time / Custom
  - Shows actual date range label below buttons (e.g. "23 Jun 2026 – 29 Jun 2026")
  - `getPayWeek(weeksAgo)` helper computes Mon-based weeks; `weeksAgo=0` = Mon–today, `weeksAgo=1` = previous Mon–Sun
  - `allTimeStartDate` prop used only for display label, not to restrict selectable dates (only future dates are disabled)

### Report Parser System (`lib/parsers/report/`)

A comprehensive library of CSV/PDF parsers that read platform export files and produce typed data for weekly partner reports.

**`types.ts`** — all interfaces. Key types:
- `WeeklyReportData` — the full report data model (snapshot, dailyRhythm, platforms, items, speed, reviews, ads, cancellations, conversion)
- `ParsedReportFiles` — holds all parsed platform results before merging
- `ReportFileType` — union of all known file type identifiers

**Parser modules** (each parses one specific CSV export type):

| Module | Parses |
|---|---|
| `uber-financials.ts` | `great_britain.csv` — daily sales + orders |
| `uber-leaderboard.ts` | `sales-leaderboard-items` — top items by sales |
| `uber-order-history.ts` | Order history v2 — speed metrics, cancels, inaccurate orders |
| `uber-sales-over-time.ts` | Sales over time — daily totals + WoW comparison |
| `uber-ratings-overall.ts` | Overall ratings + individual Uber reviews |
| `uber-ratings-sku.ts` | `restaurant_rating_sku` — per-item ratings |
| `uber-ads.ts` | Uber ad performance (spend, revenue, ROAS) |
| `uber-conversion.ts` | Shop views → menu views → add-to-cart → orders |
| `deliveroo-orders.ts` | `rs-orders-report` — daily Deliveroo sales |
| `deliveroo-items.ts` | `rs-items_sold-report` — top items |
| `deliveroo-speed-prep.ts` | `rs-speed-report-prep-time.csv` |
| `deliveroo-speed-rider.ts` | `rs-speed-report-rider-wait.csv` |
| `deliveroo-speed-duration.ts` | `rs-speed-report-average-total.csv` |
| `deliveroo-speed-busy.ts` | `rs-speed-report-busy-mode.csv` |
| `deliveroo-ads.ts` | Deliveroo ad performance |
| `deliveroo-customers.ts` | New / repeat / frequent customer counts |
| `just-eat-ads.ts` | Just Eat ad performance |
| `just-eat-pdf.ts` | Just Eat PDF statement (gross sales, payout, commission) |
| `detect-file-type.ts` | Sniffs a file and returns its `ReportFileType` |
| `merge-report-data.ts` | Merges all `ParsedReportFiles` into `WeeklyReportData` |
| `csv-utils.ts` | Shared CSV parsing helpers |

**`lib/parsers/generate-html.ts`** — takes `WeeklyReportData` and produces the self-contained HTML report.

**`lib/report-template/`** — HTML/CSS template assets used by the generator.

### Weekly Report System (Added Jul 2026)

Two new pieces of infrastructure for producing and hosting per-kitchen weekly performance reports.

**Hosted static reports** — `public/reports/[YYYY-MM-DD]/[kitchen]/index.html`
- Self-contained HTML files served by Next.js at `/reports/[date]/[kitchen]/`
- Kitchens with reports: `chatham`, `loughton` (Maidstone input folders exist but no report yet)
- Reports cover: hero KPIs, daily rhythm by platform, channel mix, item winners, speed metrics, ratings

**`report-inputs/` — weekly source data staging area**

```
report-inputs/
├── _template/               # Master template — copied each week
│   ├── DATA-MAP.md          # Maps every report section → CSV source file
│   ├── chatham_deliveroo/   # Drop Deliveroo CSVs here
│   ├── chatham_uber-eats/   # Drop Uber Eats CSVs here
│   ├── chatham_manual/      # Manual override JSON/notes
│   ├── loughton_deliveroo/
│   ├── loughton_uber-eats/
│   ├── loughton_just-eat/
│   ├── loughton_manual/
│   ├── maidstone_deliveroo/
│   ├── maidstone_uber-eats/
│   ├── maidstone_just-eat/
│   └── maidstone_manual/
└── week_YYYY-MM-DD/         # Auto-created each Monday (copy of _template)
    └── DATA-MAP.md          # Same map with actual week dates substituted in
```

Each subfolder has a `README.md` documenting exactly which CSV export files belong there (filename patterns, how to download them from Uber/Deliveroo portals).

**GitHub Actions automation** — `.github/workflows/create-weekly-report-inputs.yml`
- Runs every Monday at 06:00 UK time (cron `0 6 * * 1`)
- Calls `scripts/create-weekly-report-inputs.js [ISO-date]` which copies `_template` → `week_YYYY-MM-DD/` and substitutes `TEMPLATE_WEEK_START_UK` placeholders with the actual UK-format week start date
- Commits the new folder directly to the repo via `github-actions[bot]`
- Can be triggered manually via `workflow_dispatch` with optional `week_start` input (DD/MM/YYYY or YYYY-MM-DD)

**`scripts/create-weekly-report-inputs.js`** — the copy/substitution script. Run locally with:
```bash
node scripts/create-weekly-report-inputs.js 2026-07-06
```

## Environment Variables

```bash
# Supabase — hungry-tum-partners (kitchen_sales, kitchen_orders, kitchen_sites)
HT_PARTNERS_SUPABASE_URL=
HT_PARTNERS_SERVICE_ROLE_KEY=

# Supabase — brain (Deliveroo raw_events webhook data)
HT_BRAIN_SUPABASE_URL=
HT_BRAIN_SERVICE_KEY=

# Kitchen admin password (works for any kitchen site, overrides per-site password)
KITCHEN_ADMIN_PASSWORD=

# Optional
NEXT_PUBLIC_APP_URL=   # Used by admin/sites to generate shareable kitchen URLs
```

Google Sheets env vars (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) are no longer used.

## Path Alias

`@/*` maps to `./` (repo root) — configured in `tsconfig.json`.

## Styling

TailwindCSS with a custom brand palette (Hungry Tum orange: `#FF6B35` primary, `#F7931E` secondary). Config in `tailwind.config.js`. 8px spacing grid, Inter font, light mode only.

## Weekly Report — Known Improvements (Future Work)

### Week-on-week comparison
As reports accumulate, the system should be able to pull prior-week data and surface real comparisons — e.g. "sales up 12% vs last week", "prep time improved from 34m to 28m". Until then, avoid subjective qualifiers like "sales are healthy" in report copy unless they are explicitly grounded in a data comparison (e.g. WoW %). The `generatePulseHeadline` function in `lib/report-template/generate-html.ts` already uses `snapshot.wowGrossPct` for this; the same principle should apply to any manually written report copy.

### Report copy must not reference the data pipeline
Phrases like "Daily Deliveroo split uses the orders export and is scaled to..." are internal notes, not operator-facing copy. Kitchen operators do not need to know how the data was assembled. All report copy should speak to the operator about their kitchen, not about the report-generation process.
