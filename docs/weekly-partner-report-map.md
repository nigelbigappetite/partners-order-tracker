# Weekly Partner Report Map

## Purpose

Give kitchen partners a weekly visual update that makes them feel involved in the brand without overwhelming them with finance or admin detail.

The report should answer four simple questions:

1. How did the brand do this week?
2. What helped performance?
3. What needs attention from the kitchen?
4. What are we trying next week?

## Audience

Primary audience: kitchen operators and fulfilment teams.

They need clear operational signals, not a finance dashboard. The tone should feel light, visual, and brand-led, but every section should connect back to what they can influence: prep, quality, speed, consistency, stock, packaging, and menu execution.

## Data Sources

### Partners Order Tracker

Use for:

- Weekly gross sales
- Orders
- Average order value
- Platform mix where available
- Daily sales rhythm
- Order-level status
- Item/order line detail if available
- Kitchen/site filtering for Wing Shack Co Chatham

Relevant existing source:

- `/api/sales?brand=wing-shack-chatham`
- `/api/sales/orders?brand=wing-shack-chatham`
- `kitchen_sales`
- `operated_site_daily_sales`
- kitchen order/order line data if item lines are available

### Hungry Tum Invoicing / Deliveroo Invoice Data

Use for:

- Deliveroo net payout
- Deliveroo commission
- Deliveroo fees
- Deliveroo ads
- Deliveroo-funded or restaurant-funded offers
- Promo/order adjustment breakdown

This should not dominate the kitchen report, but it can power a small commercial insight block.

### Reviews Source

Use when available:

- Weekly review count
- Average rating
- Positive phrases
- Repeated issues
- Specific quality complaints
- Partner-facing action note

Reviews are important because they translate customer sentiment into kitchen actions.

## Weekly Report Structure

### 1. Header

Goal: make it instantly clear which brand, site, and week this is.

Content:

- Brand name
- Site name
- Week date range
- Brand logo
- One short headline

Example:

`Wing Shack Co Chatham: week in motion`

### 2. Weekly Pulse

Goal: give the top-level result in 5 seconds.

Metrics:

- Gross sales
- Total orders
- Average order value
- Change vs previous week

Kitchen-facing interpretation:

- Are we busier?
- Are customers spending more?
- Is the week improving or slipping?

Source:

- Partners Order Tracker sales rows
- Previous week comparison from the same source

### 3. Daily Rhythm

Goal: show when the kitchen was busiest and where demand dropped.

Metrics:

- Sales by day
- Orders by day
- Best day
- Quietest meaningful day

Kitchen-facing interpretation:

- Prep heavier around the strongest day pattern
- Watch staffing/stock on repeat peak days
- Use quiet days for offer tests or menu refreshes

Source:

- Partners Order Tracker daily sales aggregation

### 4. Platform Mix

Goal: show where orders are coming from without making it a platform finance report.

Metrics:

- Uber Eats share
- Deliveroo share
- Just Eat/other share if available
- Orders by platform
- AOV by platform

Kitchen-facing interpretation:

- Which platform is driving the kitchen workload?
- Does one platform bring higher-value orders?
- Does one platform need more attention due to volume?

Source:

- Partners Order Tracker sales rows
- Deliveroo live/invoice feed for Deliveroo rows

### 5. Item Winners

Goal: show what customers are choosing.

Metrics:

- Top 3 selling items
- Fastest riser vs previous week
- Low mover or item to watch
- Attach rate if useful, for example loaded fries, drinks, dips

Kitchen-facing interpretation:

- Keep stock/prep ready for top sellers
- Watch consistency on hero items
- Identify items that may need photos, offer support, or removal

Source:

- Order line/item data from Partners Order Tracker if available
- Otherwise add as phase two

### 6. Quality And Reviews

Goal: connect customer feedback to kitchen actions.

Metrics:

- Number of reviews this week
- Average rating
- Best customer quote/theme
- Repeated issue/theme
- One action for next week

Kitchen-facing interpretation:

- What customers noticed
- What the kitchen should repeat
- What the kitchen should fix

Source:

- Reviews feed, once connected
- Manual placeholder until connected

### 7. Offers And Ads

Goal: show whether commercial activity is helping without overloading the partner.

Metrics:

- Active offer this week
- Orders using offer
- Offer-funded sales if available
- Ad spend if available
- Sales attributed to ads if available
- Simple ROI/ROAS only if clean enough

Kitchen-facing interpretation:

- Offers may increase volume, so prep needs to match
- Ads can explain spikes in demand
- If offer orders are low, the menu/offer may need adjustment

Source:

- Deliveroo invoice data
- Uber reports/imports if available
- Platform ad exports if available

Keep this as a small block unless the data is clean.

### 8. Operational Focus

Goal: turn the report into one or two clear actions.

Content:

- What to keep doing
- What to improve
- What Hungry Tum will test next
- What the kitchen should watch

Example:

- Keep: strong prep on best-selling wings and loaded sides.
- Improve: watch packaging consistency on peak evenings.
- Test: quiet-day offer on Tuesday/Wednesday.
- Watch: review mentions around temperature or missing dips.

Source:

- Generated from sales, item, platform, and review signals
- Can start rule-based before becoming AI-assisted

## First Version Scope

The first version should only use data we already have working today. Anything else should be tracked as a future data point, not forced into the first report.

Include:

- Header
- Weekly pulse
- Daily rhythm
- Platform mix
- Best day / quiet day
- Simple next-week focus
- A small "coming next" area for data points we want to add later

Do not include yet:

- Item winners, unless order-line data is confirmed clean for the site
- Reviews, unless a reliable review feed is connected
- Ads/offers, unless platform invoice/ad data is mapped cleanly
- Net payout/commission detail, unless we decide it is useful for partners to see

This gives us a complete scrollable weekly story while making the missing data obvious.

## V1 Data Points

These are the data points available enough to build with now.

### Gross Sales

What it tells the partner:

- Overall demand for the brand this week
- Whether the kitchen had a stronger or quieter week

Use in report:

- Big headline number
- Compare to previous week

Source:

- Partners Order Tracker sales API

### Total Orders

What it tells the partner:

- Actual fulfilment workload
- Whether higher sales came from more orders or bigger baskets

Use in report:

- Big secondary number
- Daily order bars

Source:

- Partners Order Tracker sales API

### Average Order Value

What it tells the partner:

- Whether customers are buying larger baskets
- Whether mix/offer/menu changes may be affecting basket size

Use in report:

- Small headline stat
- Compare to previous week

Source:

- Gross sales divided by order count

### Week-on-Week Movement

What it tells the partner:

- Simple direction of travel
- Whether momentum is up, flat, or down

Use in report:

- One visual indicator only
- Avoid over-explaining if data is thin

Source:

- Current week sales vs previous week sales

### Sales By Day

What it tells the partner:

- Which days were busiest
- Which days were quietest
- Where prep and staffing need attention

Use in report:

- Rounded bar chart
- Best day callout
- Quiet day callout

Source:

- Partners Order Tracker daily sales aggregation

### Orders By Day

What it tells the partner:

- Kitchen workload pattern across the week
- Whether a high-sales day was also a high-volume day

Use in report:

- Add order count to the daily rhythm visual

Source:

- Partners Order Tracker daily sales aggregation

### Platform Mix

What it tells the partner:

- Where the workload is coming from
- Whether one platform is carrying most demand

Use in report:

- Bubble or simple share visual
- Orders and sales by platform

Source:

- Partners Order Tracker sales rows
- Deliveroo rows where available through current Deliveroo endpoint

### Simple Operational Focus

What it tells the partner:

- One thing to keep doing
- One thing to watch next week

Use in report:

- End-of-report action strip

Source:

- Rule-based summary from current sales/order patterns

Example rules:

- If sales are up and orders are up: keep prep strong on peak days.
- If sales are down but AOV is stable: focus on demand/visibility, not kitchen basket quality.
- If orders are up but AOV is down: watch offer-driven or smaller-basket demand.
- If one day dominates: call out prep and stock readiness for that day pattern.

## V1 Report Flow

The first scrollable version should be:

1. Brand/week header
2. Big weekly pulse
3. Week-on-week movement
4. Daily rhythm
5. Platform mix
6. What worked
7. What to watch next week
8. Data we want next

## Data We Want Next

This should appear internally as a backlog and optionally as a small final section in the prototype.

Priority order:

1. Item-level winners and low movers
2. Reviews and customer themes
3. Offers used this week
4. Ad spend and attributed sales
5. Platform fees, commission, and net payout
6. Cancellation/refund reasons
7. Prep or stock issue notes from the kitchen

## Phase Two Scope

Add once data is confirmed:

- Top items
- Item movement vs previous week
- Review themes
- Offer performance
- Ad spend and attributed sales
- Deliveroo fee/net payout context
- Export/share flow

## Suggested Visual Blocks

Use visual language inspired by Hungry Tum style:

- Big circles for headline numbers
- Soft rounded bars for daily rhythm
- Bubble chart for platform mix
- Small callout tiles for what worked / what to work on
- Review quote card
- One simple action strip at the end

Avoid:

- Dense tables
- Full finance reconciliation
- Too many percentages
- Long paragraphs
- Admin dashboard styling

## Open Questions

- Do we have reliable item-level order lines for Wing Shack Co Chatham across all platforms?
- Where will review data come from first?
- Which platform has the cleanest ad/offer data today?
- Should the report show gross customer sales only, or also net payout in a small commercial block?
- Should partners see exact ad spend, or only a light summary of what Hungry Tum is doing?
