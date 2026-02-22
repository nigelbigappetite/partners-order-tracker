# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-brand Supplier Ordering & Franchise Operations Dashboard for the Hungry Tum restaurant group. **Google Sheets is the entire backend** — there is no traditional database. The app reads/writes a single spreadsheet via the Google Sheets API, with `lib/sheets.ts` as the core data engine.

## Commands

```bash
npm run dev      # Development server at localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

No test suite configured.

## Architecture

### Google Sheets as Database

All data lives in a single Google Spreadsheet with named sheets (`Orders_Header`, `Order_Lines`, `SKU_COGS`, `Franchise_Summary`, `Supplier_Summary`, `Brand_Auth`, `Payments`, `Supplier_Invoices`, `Order_Supplier_Allocations`, etc.).

`lib/sheets.ts` (~3000 lines) is the core engine. It:
- Authenticates via a Google service account
- Fetches rows and transforms them to objects using a **column mapping system** (`columnMapping`) — sheet column headers map to camelCase property names, with multiple acceptable aliases per property
- All API routes use `export const dynamic = 'force-dynamic'` — no caching

**Debugging column issues**: `GET /api/debug/columns?sheet=SheetName` shows actual column names in any sheet. Use `GET /api/debug/sheets-analysis` for broader diagnostics.

When column names in the sheet change, update the mapping in `lib/sheets.ts` under the relevant `columnMapping` key. The mapping supports multiple fallback names per property.

### Brand System & Auth

The app is multi-brand and multi-tenant:
- Routes are scoped under `/brands/[brandSlug]/`
- Brand auth uses HTTP-only cookies (`brand-auth-{slug}`, 30-day expiry) checked against a `Brand_Auth` sheet
- `lib/brandAuth.ts` handles session get/set; brand layout files call `getBrandSession()` server-side
- `admin` is a special brand slug with no password requirement
- Brand logos are mapped in `lib/brandLogos.ts`

### Route Structure

```
app/
├── brand-select/                      # Entry point — pick a brand
├── brands/[brandSlug]/
│   ├── dashboard/                     # KPI overview, active orders
│   ├── orders/                        # Order list
│   ├── locations/                     # Franchise location performance
│   ├── products/                      # SKU catalog
│   ├── suppliers/                     # Supplier metrics
│   └── sales/                         # Sales metrics
├── admin/
│   ├── payments/                      # Payment reconciliation dashboard
│   └── sales/                         # Sales CSV import & analysis
└── api/
    ├── orders/                        # Order CRUD
    ├── payments/                      # Payment tracking + recon
    ├── supplier-invoices/             # Supplier invoice management
    ├── sales/                         # CSV import, kitchen mappings
    ├── brands/[slug]/auth             # Brand password check
    ├── skus/, franchises/, suppliers/ # Reference data
    └── debug/                         # Column/data diagnostics
```

### Payment Reconciliation (Core Feature)

Three-level payment tracking:
1. **Partner pays you** (sales invoice) — tracked on `Payments` sheet
2. **You pay supplier** (supplier invoice) — tracked on `Supplier_Invoices` sheet
3. **Supplier invoices linked to orders** — via `Order_Supplier_Allocations` sheet

Status workflow: `OPEN → PAID_NOT_CLEARED → WAITING_SUPPLIERS → SETTLED`

Recon calculations (linked invoice count, paid/unpaid split, outstanding £ amount) are computed in the app from existing sheet data — no extra columns needed.

### Sales Data

Deliverect CSV import maps kitchen names to franchise codes via a kitchen mapping table. See `SUPPLIER_RECON_FLOW.md`, `MAPPING_GUIDE.md` in the repo for extended workflow docs.

### Component Patterns

- Client components use `'use client'` directive
- Toast notifications via `react-hot-toast` (configured in root layout)
- Icons from `lucide-react`
- `components/payments/` — modal-heavy payment workflow components
- `components/Table.tsx` — generic reusable table used throughout

## Environment Variables

```bash
# Required
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional (supplier invoice file uploads)
BLOB_READ_WRITE_TOKEN=   # Vercel Blob
```

`GOOGLE_PRIVATE_KEY` must preserve `\n` newline characters. The service account must have editor access to the spreadsheet.

## Path Alias

`@/*` maps to `./` (repo root) — configured in `tsconfig.json`.

## Styling

TailwindCSS with a custom brand palette (Hungry Tum orange: `#FF6B35` primary, `#F7931E` secondary). Config in `tailwind.config.js`. 8px spacing grid, Inter font, light mode only.
