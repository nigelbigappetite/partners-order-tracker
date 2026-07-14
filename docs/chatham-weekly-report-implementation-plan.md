# Chatham Weekly Partner Report Implementation Plan

## Objective

Build the full weekly partner report for `Wing Shack Co - Chatham` for the week `2026-06-22` to `2026-06-28`.

This report is for the site operator. It should help them quickly understand:

- How busy the site was.
- Where the demand came from.
- What sold well.
- Whether service speed/readiness was good.
- What customers said.
- Whether ads/offers helped.
- What the kitchen should focus on next week.

This is not a finance pack. It should be a visual, scrollable Hungry Tum-style weekly update that a kitchen operator can digest quickly.

## Primary Project To Edit

Use this project:

`/Users/nigel/partners-order-tracker`

Important files:

- Existing weekly report page:
  `/Users/nigel/partners-order-tracker/app/kitchens/[kitchenSlug]/weekly-report/page.tsx`

- Public preview route:
  `/Users/nigel/partners-order-tracker/app/weekly-report/[kitchenSlug]/page.tsx`

- Brand definitions:
  `/Users/nigel/partners-order-tracker/lib/brands.ts`

- Sales API:
  `/Users/nigel/partners-order-tracker/app/api/sales/route.ts`

- Deliveroo live daily endpoint:
  `/Users/nigel/partners-order-tracker/app/api/sales/deliveroo-site/route.ts`

- Existing data types:
  `/Users/nigel/partners-order-tracker/lib/types.ts`

- Brand tokens/global styling:
  `/Users/nigel/partners-order-tracker/styles/brand-tokens.css`
  `/Users/nigel/partners-order-tracker/app/globals.css`
  `/Users/nigel/partners-order-tracker/tailwind.config.js`

- Existing report map:
  `/Users/nigel/partners-order-tracker/docs/weekly-partner-report-map.md`

## Secondary Projects To Read For Context

Read only as needed.

- Ordering/supply app brand style and tokens:
  `/Users/nigel/hungry-tum-ordering/app/globals.css`
  `/Users/nigel/hungry-tum-ordering/packages/hungry-tum-brand-tokens/tokens.css`
  `/Users/nigel/hungry-tum-ordering/tailwind.config.ts`

- Invoicing app, if building future ingestion around Deliveroo statements:
  `/Users/nigel/hungry-tum-invoicing`

## Current Report URL

Local preview:

`http://localhost:3000/weekly-report/wing-shack-chatham`

Authenticated kitchen route:

`http://localhost:3000/kitchens/wing-shack-chatham/weekly-report`

## Existing Report State

The current page already has:

- White hero slide.
- Hungry Tum weekly branding.
- Gross sales, AOV, orders, and direction.
- Operator-read section.
- Daily rhythm section.
- Platform mix section.
- Next-run focus section.
- Coming soon section.

The next implementation should replace the placeholder `Coming soon` state with real report sections where data is now available.

## Source Data For This Week

Use the week:

`2026-06-22` to `2026-06-28`

### Deliveroo Reports

Directory:

`/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/deliveroo reports/22-28 june chat del reports`

Files:

- Deliveroo item sales:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/deliveroo reports/22-28 june chat del reports/rs-items_sold-report_22-06-2026_28-06-2026.csv`

- Deliveroo ads:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/deliveroo reports/22-28 june chat del reports/rs-adverts-report_22-06-2026_28-06-2026.csv`

- Deliveroo customers/conversion/offers:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/deliveroo reports/22-28 june chat del reports/rs-customers-report_22-06-2026_28-06-2026.csv`

- Deliveroo speed report directory:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/deliveroo reports/22-28 june chat del reports/rs-speed-report_22-06-2026_28-06-2026`

Speed files inside:

- `rs-speed-report-speed-summary_22-06-2026_28-06-2026.csv`
- `rs-speed-report-prep-time_22-06-2026_28-06-2026.csv`
- `rs-speed-report-rider-wait-time-past-target_22-06-2026_28-06-2026.csv`
- `rs-speed-report-average-total-order-duration_22-06-2026_28-06-2026.csv`
- `rs-speed-report-busy-mode-usage_22-06-2026_28-06-2026.csv`

### Deliveroo Statement PDF

Use for fee, refund, ad fee, cancelled order, and marketer offer discount notes.

`/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/chat 2 platfotm invoivr/chat deliveroo/SVAYA_LIMITED_20260629_statement.pdf`

Useful facts found from this statement:

- Total order value: `£357.31`
- Total payable: `£257.34`
- Marketer offer discount notes: 9
- Marketer offer discount total from notes: `£70.65`
- Ad fee lines appear for `2026/06/22`, `2026/06/23`, `2026/06/24`, `2026/06/25`
- Includes customer refund and cancelled order charge notes

The PDF is useful, but it is not a clean item-level offer export. Parse cautiously or manually summarize for this first version.

### Uber Reports

Directory:

`/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat`

Files:

- Uber item sales:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/sales-leaderboard-items_2026-06-22_2026-06-28.csv`

- Uber conversion:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/user-conversion_2026-06-22_2026-06-28.csv`

- Uber sales over time:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/sales-over-time_2026-06-22_2026-06-28.csv`

- Uber reviews:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/c2a338a4-1b89-4317-81f6-1e713728da42_restaurant_rating_local_2026-06-22_2026-06-28.csv`

- Uber item-level ratings:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/988d2838-8ba8-4b15-8f79-fc59bbeaafad_restaurant_rating_sku_local_2026-06-22_2026-06-28.csv`

- Uber order history/speed:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/f41374b3-e821-4c2d-a8de-1285a41bcb7b_order_history_local_v2_2026-06-22_2026-06-28.csv`

- Uber inaccurate orders:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/6203e11e-71c7-438a-a6d4-808bcc04ee45_inaccurate_orders_v3_2026-06-22_2026-06-28.csv`

- Uber top inaccurate items:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/d34688cb-e20a-470e-88a1-439bb82e8b85_top_inaccurate_items_v3_2026-06-22_2026-06-28.csv`

- Uber order accuracy workbook:
  `/Users/nigel/Desktop/Desktop - Nigel’s MacBook Air/Big Appetite/Hungry Tum/franchises/CHATHAM 2/uber reports chatham/22-28 jul uber reports chat/0f02f19e-5b98-4310-a107-641e590dca35_order_accuracy_analytics_2026-06-22_2026-06-28.xlsx`

### Manual Data Required From User

The IDE should ask Nigel for these if not already provided in a structured local file.

#### Uber Ads Manual Entry

Uber does not appear to provide an export for the marketing/ad-performance page. Use manual screenshot values for this week.

Ask for:

- ROAS
- Ad sales
- Ad spend
- Impressions
- Clicks
- Ad orders
- Click-to-order rate
- Average CPC
- Average cost per order
- CTR
- Average order value
- Daily sales/orders/clicks/impressions trend if available

Known values from screenshot:

- ROAS: `7.75x`
- Ad sales: `£796.34`
- Ad spend: `£102.76`
- Impressions: `6,377`
- Clicks: `454`
- Orders: `28`
- Click-to-order rate: `6.17%`
- Average CPC: `£0.23`
- Average cost per order: `£3.67`
- CTR: `7.12%`
- Average order value: `£28.44`

If the screenshot is enough, hardcode these in the Chatham weekly report data fixture for this one report.

#### Deliveroo Reviews Manual Entry

Deliveroo does not appear to provide review export data.

Ask for:

- Overall rating
- Review count
- Rating distribution
- Weekly/new reviews in date range
- Review text/date/rating
- Reply/voucher status if useful

Known values from screenshot:

- Overall rating: `4.4`
- Review count visible: `50+ reviews`
- Total reviews panel: `19`
- Rating distribution:
  - 5 star: `73%`
  - 4 star: `11%`
  - 3 star: `5%`
  - 2 star: `3%`
  - 1 star: `9%`
- Visible review examples include:
  - `2nd Jul 2026`, 1 star, "Probably the worst takeout I've ever had..."
  - `26th Jun 2026`, 1 star, "Awful"
  - `23rd Jun 2026`, 3 star, "Got food poisoning"
  - `14th Feb 2026`, 5 star, "you nailed it 😀 thank you"
  - `1st Feb 2026`, 3 star, mentions wings/boneless bites hard and dry, delivery time, cold salad, price concerns
  - `16th Nov 2025`, 5 star, "Delicious food.. wings are Delicious as always. The burgers need less sauce..."

For the weekly report, only include reviews in the week where possible. The screenshot includes old reviews and should not be treated as weekly data unless the date is inside `2026-06-22` to `2026-06-28`.

## Known Parsed Figures

Use these as validation targets after parsing.

### Deliveroo Items

From `rs-items_sold-report`:

- Rows for Wing Shack Co - Chatham: `55`
- Quantity: `91`
- Subtotal: `£427.96`
- Top visible items by quantity/sales include:
  - Original Chicken Wrap: 6 sold, £47.70
  - Banging Buffalo Chicken Wrap: 4 sold, £31.80
  - Smokey BBQ Chicken Wrap: 4 sold, £31.80
  - Cajun Fries: 4 sold, £15.96
  - Banging Buffalo Loaded Fries: 4 sold, £30.00

Note: Deliveroo item subtotal includes pre-discount menu item totals. Statement order value is lower because marketer offer discounts total `£70.65`.

### Deliveroo Ads

From `rs-adverts-report`:

- Spend: `£49.64`
- Clicks: `87`
- Views: `1,003`
- Click-attributed sales: `£161.99`
- Click-attributed orders: `8`
- View-attributed sales: `£239.88`
- View-attributed orders: `10`

### Deliveroo Customers / Offers

From `rs-customers-report`:

- Total orders: `18`
- New customer orders: `8`
- Repeat customer orders: `6`
- Frequent customer orders: `4`
- Orders with Marketer offers: `9`
- Orders from Rewards: `0`
- Menu conversion: `9.79%`

### Deliveroo Speed

From speed summary:

- Busy mode usage: `0.0%`
- Prep time: `25.00 mins`
- Rider wait time past target: `2.08 mins`
- `% rider wait >5 mins`: `0.0%`
- `% rider wait >10 mins`: `0.0%`
- Average total order duration: `26.82 mins`

### Uber Items

From `sales-leaderboard-items`:

- Uber item sales total: `£1,023.39`
- Items sold: `112`
- Rows: `29`
- Top by sales:
  - Mac N Cheese Bites: £190.40, 32 sold
  - Deluxe Bundle for 1: £179.55, 9 sold
  - Banging Buffalo Loaded Fries: £150.00, 20 sold
  - Wings (5 Set): £116.05, 4 sold
  - Snuggle Bundle for 2: £71.90, 2 sold

### Uber Conversion

From `user-conversion`:

This period:

- Shop views: `4,069`
- Menu views: `499`
- Added item: `149`
- Orders: `55`
- Shop-to-menu conversion: `12.3%`
- Menu-to-order conversion: `11.0%`
- Add-to-order conversion: `36.9%`

Last period:

- Shop views: `2,148`
- Menu views: `247`
- Added item: `53`
- Orders: `12`
- Menu-to-order conversion: `4.9%`
- Add-to-order conversion: `22.6%`

### Uber Sales Over Time

From `sales-over-time`:

- This period sales: `£1,056.09`
- This period orders: `36`
- Last period sales: `£279.10`
- Last period orders: `9`

Daily current period:

- 2026-06-22: £99.65, 4 orders
- 2026-06-23: £147.95, 4 orders
- 2026-06-24: £210.05, 6 orders
- 2026-06-25: £102.35, 4 orders
- 2026-06-26: £194.35, 7 orders
- 2026-06-27: £191.54, 7 orders
- 2026-06-28: £110.20, 4 orders

### Uber Reviews

From `restaurant_rating_local` after deduping duplicate order/rating rows:

- Unique ratings: `5`
- Average rating: `3.4`
- Ratings: `5, 5, 1, 1, 5`
- Negative theme: `restaurant_too_slow`
- Comments:
  - "food never got delivered ordered £20 worth of food that never showed up."
  - "Better communication and quicker delivery time"

### Uber Item Ratings

From `restaurant_rating_sku_local`:

- Banging Buffalo Loaded Fries: rating `1`, tag `item_good_portion`
- Mac N Cheese Bites: rating `0`, tag `item_cold_melted`

### Uber Order History / Speed

From `order_history_local_v2`:

- Rows: `37`
- Completed orders: `35`
- Cancelled orders: `2`
- Completed ticket size: `£1,023.39`
- Average time to confirm: `1.29 mins`
- Average original prep time: `18.05 mins`
- Average courier wait where present: `7.93 mins`
- Average avoidable courier wait where present: `3.04 mins`
- Average order duration where present: `47.86 mins`
- Cancellations:
  - 2026-06-23, order `A7451`, cancelled by restaurant
  - 2026-06-23, order `A591B`, cancelled by customer

### Uber Accuracy

From inaccurate orders and top inaccurate items:

- No inaccurate order rows for this week.
- No top inaccurate item rows for this week.

This can be shown as a positive quality signal if desired.

## Recommended Report Flow

The report should be a scrollable infographic, not a table dashboard.

### 1. Cover / Weekly Snapshot

Purpose:

Give the operator the fastest possible read.

Include:

- Brand/site/week
- Gross sales
- Total orders
- AOV
- Direction vs previous week

Avoid repeating these exact KPI cards later.

### 2. Operator Read

Purpose:

Translate the headline numbers into plain language.

Include:

- Workload: how many orders the kitchen fulfilled.
- Basket: whether customers were buying bigger baskets.
- Momentum: whether the site was up/down vs previous week.
- One-sentence interpretation.

### 3. Daily Rhythm

Purpose:

Show when the kitchen was busiest.

Include:

- Sales/orders by day, combined across platforms if possible.
- Best day.
- Quietest day.
- Operational note: prep/staffing/stock readiness.

### 4. Platform Mix

Purpose:

Show where demand came from.

Include:

- Uber sales/orders/share.
- Deliveroo sales/orders/share.
- AOV by platform.
- Simple read: which platform drove workload and which drove basket size.

### 5. Item Winners

Purpose:

Show what customers actually bought.

Include:

- Top items by sales.
- Top items by quantity.
- Notable fast risers where `%Δ` exists.
- Platform source split if possible.

Use:

- Uber `sales-leaderboard-items`
- Deliveroo `rs-items_sold-report`

Keep it kitchen-facing:

- "Keep these prepped."
- "Watch consistency on these hero items."

### 6. Speed & Readiness

Purpose:

Show whether the kitchen was ready for demand.

Include:

- Deliveroo prep time.
- Deliveroo rider wait past target.
- Uber time to confirm.
- Uber prep time.
- Uber courier wait/order duration where available.
- Cancellations and accuracy issues.

Keep it simple:

- "Good signal"
- "Watch point"
- "Action for next week"

### 7. Reviews & Quality

Purpose:

Show customer sentiment and issues.

Include:

- Uber average rating for the week.
- Uber review count.
- Positive tags.
- Negative tags/comments.
- Uber item rating issues.
- Deliveroo manual review summary if provided.

Do not overload the operator with every review. Use 1-3 short themes.

### 8. Ads, Offers & Conversion

Purpose:

Show what Hungry Tum did to create demand and whether it helped.

Include:

- Deliveroo ad spend/sales/orders.
- Uber ad metrics from manual screenshot.
- Deliveroo marketer offer orders and discount total.
- Uber conversion funnel.
- Deliveroo menu conversion.

Keep operator-facing:

- "Ads helped generate demand."
- "Offers drove X orders."
- "Conversion improved from last week."
- Avoid making this a finance reconciliation.

### 9. Next Week Focus

Purpose:

Finish with 2-4 practical actions.

Examples:

- Keep Mac N Cheese Bites and Banging Buffalo Loaded Fries prepped; they are high-volume items.
- Watch delivery speed/communication because Uber low ratings mentioned slow delivery.
- Keep packaging/temperature tight on Mac N Cheese Bites because one item rating tagged cold/melted.
- Use Friday/Saturday demand patterns for prep planning if those were the strongest days.

## Implementation Recommendation

For this first full report, implement a local fixture/parser layer rather than a database ingestion flow.

Create:

`/Users/nigel/partners-order-tracker/lib/weekly-report/chatham-2026-06-22.ts`

or:

`/Users/nigel/partners-order-tracker/lib/weekly-report/chathamFixture.ts`

This module should:

- Read/parse the local CSV/PDF-derived/manual data, or hardcode parsed values for this one report.
- Export a normalized report object.
- Keep platform-specific source quirks out of the React page.

Suggested normalized shape:

```ts
export interface WeeklyPartnerReport {
  siteName: string
  brandName: string
  startDate: string
  endDate: string
  snapshot: {
    grossSales: number
    orders: number
    averageOrderValue: number
    salesChangePercent: number
  }
  platforms: Array<{
    platform: 'uber' | 'deliveroo'
    sales: number
    orders: number
    averageOrderValue: number
  }>
  daily: Array<{
    date: string
    sales: number
    orders: number
  }>
  items: {
    topBySales: Array<{ item: string; sales: number; quantity: number; platform?: string }>
    topByQuantity: Array<{ item: string; sales: number; quantity: number; platform?: string }>
    watchItems: Array<{ item: string; reason: string; platform?: string }>
  }
  speed: {
    deliveroo?: Record<string, number | string>
    uber?: Record<string, number | string>
    summary: string[]
  }
  reviews: {
    uber?: {
      averageRating: number
      ratingCount: number
      positiveThemes: string[]
      negativeThemes: string[]
      comments: Array<{ rating: number; comment: string; date: string }>
    }
    deliverooManual?: {
      overallRating?: number
      reviewCount?: string | number
      weeklyReviews?: Array<{ rating: number; comment: string; date: string }>
    }
  }
  adsAndOffers: {
    deliverooAds?: Record<string, number | string>
    uberAdsManual?: Record<string, number | string>
    offers?: Record<string, number | string>
    conversion?: Record<string, number | string>
  }
  nextWeekFocus: string[]
}
```

Then edit:

`/Users/nigel/partners-order-tracker/app/kitchens/[kitchenSlug]/weekly-report/page.tsx`

to consume this normalized object for `wing-shack-chatham` and render the full weekly report.

## Design Direction

Keep the current Hungry Tum scroll/infographic direction, but make it more operator-facing.

Use:

- White first slide.
- Hungry Tum orange accents.
- Organic bubbles for headline numbers.
- Rounded rhythm bars.
- Visual cards for items/reviews/speed/ads.
- Short plain-English explanations.

Avoid:

- Repeating the same KPIs in multiple sections.
- Internal phrases like "V1 uses..."
- Data engineering language.
- Dense tables.
- Long finance explanations.

## Questions The IDE Should Ask Nigel

Ask only if needed.

1. Uber ads:
   Should the report use the screenshot values listed in this document, or will you provide the full daily trend values too?

2. Deliveroo reviews:
   Which reviews from the Deliveroo screenshot belong to `2026-06-22` to `2026-06-28`? The visible screenshot includes older and newer reviews.

3. Platform totals:
   Should the headline gross sales use:
   - current Partners Order Tracker totals,
   - platform report totals,
   - or a reconciled total from Uber + Deliveroo files?

4. Operator sensitivity:
   Should negative review text be shown verbatim, or summarized into themes only?

5. Ads/offers visibility:
   Should the operator see ad spend/ROAS, or only the simpler message that ads/offers generated demand?

## Verification

After implementation:

Run:

```bash
cd /Users/nigel/partners-order-tracker
npm run build
```

Then start dev server:

```bash
npm run dev
```

Preview:

`http://localhost:3000/weekly-report/wing-shack-chatham`

Check:

- No repeated KPI section after the cover.
- Gross value fits in the bubble.
- Coming soon is removed or only used for sections still genuinely missing.
- Operator can understand the weekly story without needing raw tables.
- Mobile and desktop text does not overlap.
