# Weekly Report Data Map - week commencing 06/07/2026

## Section → data point → source

| Section | Data point | Source | Auto/Manual |
|---|---|---|---|
| **HERO** | Gross sales | Sum of all platforms | Auto |
| **HERO** | Total orders | Sum of all platforms | Auto |
| **HERO** | AOV | Gross ÷ orders | Auto |
| **HERO** | WoW % change | Prior week from Supabase | Auto |
| **HERO** | Best day + amount | Derived from daily data | Auto |
| **01 Operator Read** | Summary tiles (4 tiles) | Synthesised from all sections | Auto (generated) |
| **02 Daily Rhythm** | Uber sales per day (Mon–Sun) | Uber financials CSV (`great_britain.csv`) | Auto |
| **02 Daily Rhythm** | Deliveroo sales per day | Deliveroo orders CSV (`rs-orders-report`) | Auto |
| **02 Daily Rhythm** | Deliveroo (fallback) | brain Supabase if no CSV | Auto |
| **03 Channel Mix** | Uber total sales, orders, %, AOV | Derived from §02 | Auto |
| **03 Channel Mix** | Deliveroo total sales, orders, %, AOV | Derived from §02 | Auto |
| **03 Channel Mix** | Just Eat sales + orders (Loughton) | Auto-pull from invoicing DB | Auto |
| **04 Item Winners** | Uber top items: name, sales, qty | Uber leaderboard CSV (`sales-leaderboard-items`) | Auto |
| **04 Item Winners** | Uber item quality flags | Uber ratings SKU CSV (`restaurant_rating_sku`) | Auto |
| **04 Item Winners** | Deliveroo top items: name, sales, qty | Deliveroo items CSV (`rs-items_sold-report`) | Auto |
| **05 Speed — Deliveroo** | Avg prep time | `rs-speed-report-prep-time.csv` | Auto |
| **05 Speed — Deliveroo** | Rider wait past target | `rs-speed-report-rider-wait.csv` | Auto |
| **05 Speed — Deliveroo** | Rider wait >5 min % | `rs-speed-report-rider-wait.csv` | Auto |
| **05 Speed — Deliveroo** | Rider wait >10 min % | `rs-speed-report-rider-wait.csv` | Auto |
| **05 Speed — Deliveroo** | Avg total order duration | `rs-speed-report-average-total.csv` | Auto |
| **05 Speed — Deliveroo** | Busy mode usage % | `rs-speed-report-busy-mode.csv` | Auto |
| **05 Speed — Uber** | Avg time to confirm | Uber order history v2 CSV | Auto |
| **05 Speed — Uber** | Avg prep + handoff time | Uber order history v2 CSV | Auto |
| **05 Speed — Uber** | Avg courier wait (restaurant) | Uber order history v2 CSV | Auto |
| **05 Speed — Uber** | Avoidable courier wait | Uber order history v2 CSV | Auto |
| **05 Speed — Uber** | Avg total order duration | Uber order history v2 CSV | Auto |
| **05 Speed — Uber** | Inaccurate order count | Uber order history v2 CSV | Auto |
| **05 Speed — Uber** | Cancellation count + fault | Uber order history v2 CSV | Auto |
| **06 Reviews — Uber** | Overall star rating | Uber ratings overall CSV (`restaurant_rating_local`) | Auto |
| **06 Reviews — Uber** | Rating count | Uber ratings overall CSV | Auto |
| **06 Reviews — Uber** | Rating theme | Admin notes (type it in) | **Manual** |
| **06 Reviews — Deliveroo** | Overall star rating | Admin notes | **Manual** |
| **06 Reviews — Deliveroo** | Rating breakdown (1–5★ %) | Admin notes | **Manual** |
| **06 Reviews — Deliveroo** | Total review count | Admin notes | **Manual** |
| **06 Reviews — Both** | Individual review text | Admin notes | **Manual** |
| **06 Reviews — Items** | Flagged items (low-rated) | Uber ratings SKU CSV | Auto |
| **07 Ads — Uber** | ROAS | Uber ads CSV (`ads-campaigns-list`) | Auto |
| **07 Ads — Uber** | Spend | Uber ads CSV | Auto |
| **07 Ads — Uber** | Ad-attributed sales | Uber ads CSV | Auto |
| **07 Ads — Uber** | Ad orders | Uber ads CSV | Auto |
| **07 Ads — Uber** | Impressions, clicks, CTR | Uber ads CSV | Auto |
| **07 Ads — Deliveroo** | Spend | Deliveroo ads CSV (`rs-adverts-report`) | Auto |
| **07 Ads — Deliveroo** | Click-attributed sales + orders | Deliveroo ads CSV | Auto |
| **07 Ads — Deliveroo** | View-attributed sales + orders | Deliveroo ads CSV | Auto |
| **07 Ads — Deliveroo** | Total views + clicks | Deliveroo ads CSV | Auto |
| **07 Offers — Deliveroo** | Orders using marketer offers | Deliveroo orders CSV | Auto |
| **07 Offers — Deliveroo** | Total discount amount | Deliveroo orders CSV | Auto |
| **07 Conversion — Uber** | Shop views, menu views, cart, orders | Uber conversion CSV (`user-conversion`) | Auto |
| **07 Ads — JE** | Spend, revenue, ROAS, orders | JE CampaignHistory CSV (Loughton) | Auto |
| **08 Focus** | 4 action items | Synthesised from all sections | Auto (generated) |

---

## File checklist per site — week commencing 06/07/2026

### CHATHAM
| File | Status | Notes |
|---|---|---|
| `great_britain.csv` | available | in uber reports folder |
| `order_history_local_v2.csv` | available | in uber reports folder |
| `chatham ads-campaigns-list.csv` | available | named "chatham 2026-07-06 ads-campaigns-list.csv" |
| `restaurant_rating_local.csv` | available | in uber reports folder |
| `restaurant_rating_sku.csv` | available | in uber reports folder |
| `sales-leaderboard.csv` | **MISSING** | only Loughton + Maidstone in folder |
| `user-conversion.csv` | **MISSING** | only Loughton + Maidstone in folder |
| `rs-orders-report.csv` | **MISSING** | export from Deliveroo Hub (needed for §02) |
| `rs-items_sold-report.csv` | available | |
| `rs-adverts-report.csv` | available | |
| Speed CSVs (4 files) | available | inside `rs-speed-report_06/07/2026_06 Jul 2026 - 12 Jul 2026/` folder |
| Deliveroo manual rating | provided | 4.4★, 50+ reviews, breakdown known |

### LOUGHTON
| File | Status |
|---|---|
| `great_britain.csv` | available (shared file) |
| `order_history_local_v2.csv` | available (shared file) |
| `loughton sales-leaderboard.csv` | available |
| `loughton sales-over-time.csv` | available |
| `loughton user-conversion.csv` | available |
| Ratings files | available (shared file) |
| Loughton-specific ads CSV | ? (need to check) |
| Deliveroo files | ? (need to check) |
| JE CampaignHistory.csv | available |
| JE auto-pull | active |

### MAIDSTONE
| File | Status |
|---|---|
| `great_britain.csv` | available (shared file) |
| `order_history_local_v2.csv` | available (shared file) |
| `maidstone sales-leaderboard.csv` | available |
| `maidstone sales-over-time.csv` | available |
| `maidstone user-conversion.csv` | available |
| Ratings files | available (shared file) |
| Maidstone-specific ads CSV | ? (need to check) |
| Deliveroo files | ? (need to check) |
| JE invoice PDF | available |
| JE CampaignHistory | ? |

---

## What sections appear without data

If a file is missing, its section is omitted gracefully rather than showing empty/broken:

| Missing file(s) | Effect |
|---|---|
| Deliveroo orders CSV | §02 Daily Rhythm falls back to brain Supabase for Deliveroo daily |
| Uber leaderboard | §04 shows Deliveroo items only (or is omitted if both missing) |
| Deliveroo items | §04 shows Uber items only |
| Both leaderboard + items | §04 omitted entirely |
| Order history v2 | §05 Uber speed omitted; Deliveroo speed still shows if CSVs present |
| All 4 speed CSVs | §05 Deliveroo speed omitted |
| Both speed sources | §05 omitted entirely |
| Ratings overall | §06 Uber rating omitted; admin notes + flagged items still show |
| No ratings + no admin notes | §06 omitted entirely |
| Uber ads | §07 Uber ads omitted |
| Deliveroo ads | §07 Deliveroo ads omitted |
| User conversion | Conversion funnel omitted from §07 |
