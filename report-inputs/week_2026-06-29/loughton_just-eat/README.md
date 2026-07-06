# Loughton — Just Eat files — Week commencing 29/06/2026

Loughton is the only Wing Shack site on Just Eat. JE data is auto-pulled from the invoicing system at generate time — you may not need to upload anything.

## Auto-pull (no file needed)
Just Eat weekly totals (gross sales, orders, net payout) are fetched automatically from the invoicing Supabase database when generating the Loughton report. No file upload needed if the invoicing system has the data.

## Manual override (if auto-pull fails)
If the auto-pull doesn't work, drop the JE ads CSV here:

| File pattern | Feeds section |
|---|---|
| `CampaignHistory_....csv` | §07 Ads — JE ad spend, revenue, ROAS, orders |

## Notes
- JE gross sales and orders come from invoicing data (auto)
- JE ads come from the CampaignHistory CSV (upload if available)
- JE section only appears in the Loughton report, not Chatham or Maidstone

## Status for week commencing 29/06/2026
- [x] Auto-pull: active (invoicing system)
- [ ] CampaignHistory ads CSV (optional upload)
