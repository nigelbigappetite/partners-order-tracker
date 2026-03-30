create schema if not exists sales;

create table if not exists sales.operated_site_daily_sales (
  id uuid primary key default gen_random_uuid(),
  brand_slug text,
  site_slug text not null,
  site_name text not null,
  source_sheet text not null,
  date date not null,
  revenue numeric(12,2) not null default 0,
  order_count integer not null default 0,
  avg_order_value numeric(12,2),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_slug, date)
);

create index if not exists operated_site_daily_sales_brand_slug_idx
  on sales.operated_site_daily_sales (brand_slug);

create index if not exists operated_site_daily_sales_date_idx
  on sales.operated_site_daily_sales (date desc);

create or replace function sales.set_operated_site_daily_sales_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists operated_site_daily_sales_set_updated_at
  on sales.operated_site_daily_sales;

create trigger operated_site_daily_sales_set_updated_at
before update on sales.operated_site_daily_sales
for each row
execute function sales.set_operated_site_daily_sales_updated_at();
