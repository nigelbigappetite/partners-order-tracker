# Supply Brand Sync Rollout

The Hungry Tum ordering platform is the source of truth for supply orders.
The partners dashboard reads a per-order, per-brand snapshot from the partners
Supabase `sales` schema.

## Data contract

Each completed ordering-platform order creates one snapshot row for every brand
present in its line items:

- `source_order_id`
- `brand_slug`
- `site_id` / `site_name`
- `order_created_at`
- `completed_at`
- `settled_at`
- `revenue`
- `cogs`
- `item_count`
- `synced_at`

The unique key is `(source_order_id, brand_slug)`.

## Deployment order

1. Rotate the partners Supabase service-role key that appeared in historical SQL.
2. Apply `partners-order-tracker/supabase/migrations/20260606_create_supply_order_brand_totals.sql`.
3. Store the partners URL and rotated key in the ordering Supabase Vault:

   ```sql
   select vault.create_secret(
     'https://<partners-project>.supabase.co',
     'partners_supabase_url'
   );

   select vault.create_secret(
     '<rotated partners service-role key>',
     'partners_service_role_key'
   );
   ```

4. Apply `hungry-tum-ordering/supabase/migrations/088_partner_supply_brand_totals.sql`.
5. Apply `hungry-tum-ordering/supabase/migrations/089_allow_unattributed_supply_lines.sql`.
6. Apply `hungry-tum-ordering/supabase/migrations/090_support_modern_partner_api_keys.sql`.
7. Apply `hungry-tum-ordering/supabase/migrations/091_supply_order_item_adjustments.sql`.
8. Run `select * from public.partner_supply_unmapped_items();` and review the
   shared products that will be excluded from partner-brand revenue.
9. Review `select * from public.partner_supply_brand_reconciliation();`.
10. Run `hungry-tum-ordering/supabase/backfill_partner_supply_brand_totals.sql`.
11. Wait for `pg_net` requests to complete and inspect failures.
12. Compare partners snapshot totals with
    `public.partner_supply_brand_reconciliation()`.
13. Deploy the partners dashboard. It already prefers the new table and falls
    back to the legacy source while the table is absent.

## Brand mapping

Authoritative branded SKU mapping:

- `SBN-%` -> `smsh-bn`
- `WS-%` -> `wing-shack-co`
- `ENS-%` -> `eggs-nstuff`

Products without a branded prefix use `product_brands` only when exactly one
brand is linked. Shared products with no brand or multiple possible brands
appear in `partner_supply_unmapped_items()` and are reported as `unattributed`
in reconciliation. They are excluded from partner-brand revenue without
blocking branded lines from the same order.
