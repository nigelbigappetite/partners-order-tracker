create schema if not exists sales;
create extension if not exists pgcrypto;

create table if not exists sales.supply_order_brand_totals (
  id uuid primary key default gen_random_uuid(),
  source_order_id uuid not null,
  brand_slug text not null,
  site_id uuid,
  site_name text,
  order_created_at timestamptz,
  completed_at timestamptz,
  settled_at timestamptz,
  revenue numeric(12, 2) not null default 0,
  cogs numeric(12, 2) not null default 0,
  item_count integer not null default 0,
  currency text not null default 'GBP',
  synced_at timestamptz not null default now(),
  constraint supply_order_brand_totals_order_brand_key unique (source_order_id, brand_slug),
  constraint supply_order_brand_totals_revenue_nonnegative check (revenue >= 0),
  constraint supply_order_brand_totals_cogs_nonnegative check (cogs >= 0),
  constraint supply_order_brand_totals_item_count_nonnegative check (item_count >= 0)
);

create index if not exists supply_order_brand_totals_brand_date_idx
  on sales.supply_order_brand_totals (brand_slug, completed_at desc);

create index if not exists supply_order_brand_totals_source_order_idx
  on sales.supply_order_brand_totals (source_order_id);

comment on table sales.supply_order_brand_totals is
  'One row per Hungry Tum ordering-platform order and product brand. Revenue and COGS are line-item totals.';

alter table sales.supply_order_brand_totals enable row level security;

revoke all on sales.supply_order_brand_totals from anon, authenticated;
grant all on sales.supply_order_brand_totals to service_role;

notify pgrst, 'reload schema';
