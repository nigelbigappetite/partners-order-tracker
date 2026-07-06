# Chatham — Uber Eats files — Week commencing 29/06/2026

Drop the following Uber Eats export files here. All come from Uber Restaurant Manager.

## Files needed

| File pattern | What to name it | Feeds section |
|---|---|---|
| `..._great_britain.csv` | keep original name | §02 Daily Rhythm, §03 Channel Mix (sales per day) |
| `..._order_history_local_v2_....csv` | keep original name | §05 Speed (confirm, prep, courier wait, duration), §05 cancellations |
| `chatham ...-ads-campaigns-list.csv` | keep original name | §07 Ads (ROAS, spend, revenue, orders, impressions, clicks) |
| `..._restaurant_rating_local_....csv` | keep original name | §06 Reviews (Uber overall rating + count) |
| `..._restaurant_rating_sku_local_....csv` | keep original name | §04 Items (quality flags), §06 Reviews (flagged items) |
| `chatham sales-leaderboard-items_....csv` | keep original name | §04 Item Winners — Uber top items by sales |
| `chatham ...-user-conversion_....csv` | keep original name | §07 Ads — conversion funnel |

## Notes
- The `great_britain.csv` and `order_history_local_v2` files contain all Wing Shack sites — the parser filters to Chatham automatically using "Wing Shack Co- Chatham"
- The `restaurant_rating_local` and `restaurant_rating_sku` files also contain all sites — same filter applies
- Chatham may not have a leaderboard export this week (low volume) — if missing, §04 will show Deliveroo items only
- Chatham has no Just Eat — no JE folder needed

## Status for week commencing 29/06/2026
- [ ] great_britain.csv
- [ ] order_history_local_v2.csv
- [ ] ads-campaigns-list.csv
- [ ] restaurant_rating_local.csv
- [ ] restaurant_rating_sku.csv
- [ ] sales-leaderboard (may not exist)
- [ ] user-conversion (may not exist for Chatham)
