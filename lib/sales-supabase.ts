import { KitchenSales } from './types'
import { getBrandDisplayName } from './brands'

const SUPABASE_URL = process.env.HT_PARTNERS_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY!

interface KitchenSalesRow {
  id: string
  brand_slug: string
  date: string
  location: string
  revenue: number
  gross_sales: number
  order_count: number
  avg_order_value: number | null
  imported_at: string
}

interface OperatedSiteDailySalesRow {
  id: string
  brand_slug: string | null
  site_slug: string
  site_name: string
  source_sheet: string
  date: string
  revenue: number
  order_count: number
  avg_order_value: number | null
  imported_at: string
}

const SALES_LOCATION_ALIASES: Record<string, string> = {
  'smsh bn bethnal green': 'SMSH BN - BETHNAL GREEN',
  'smsh bn bethnal green uk': 'SMSH BN - BETHNAL GREEN',
  'smsh bn bethnal green london': 'SMSH BN - BETHNAL GREEN',
  'wsco bethnal green': 'WSCO Bethnal Green',
  'wsco bethnal green uk': 'WSCO Bethnal Green',
  'eggs n stuff bethnal green': 'Eggs n Stuff Bethnal Green',
  'eggs n stuff bethnal green uk': 'Eggs n Stuff Bethnal Green',
}

function toKitchenSales(row: KitchenSalesRow): KitchenSales {
  return {
    id: row.id,
    brandSlug: row.brand_slug,
    brandName: getBrandDisplayName(row.brand_slug) ?? row.brand_slug,
    date: row.date,
    location: row.location,
    revenue: Number(row.revenue),
    grossSales: Number(row.gross_sales),
    count: row.order_count,
    averageOrderValue: row.avg_order_value != null ? Number(row.avg_order_value) : undefined,
    importDate: row.imported_at,
    importSource: 'CSV',
  }
}

function toKitchenSalesFromOperated(row: OperatedSiteDailySalesRow): KitchenSales {
  return {
    id: row.id,
    brandSlug: row.brand_slug ?? undefined,
    brandName: row.brand_slug ? getBrandDisplayName(row.brand_slug) ?? row.brand_slug : undefined,
    date: row.date,
    location: canonicalizeSalesLocation(row.site_name),
    revenue: Number(row.revenue),
    grossSales: Number(row.revenue),
    count: row.order_count,
    averageOrderValue: row.avg_order_value != null ? Number(row.avg_order_value) : undefined,
    importDate: row.imported_at,
    importSource: 'GOOGLE_SHEETS',
  }
}

function normalizeSalesLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalizeSalesLocation(location: string): string {
  const normalized = normalizeSalesLocation(location)
  return SALES_LOCATION_ALIASES[normalized] ?? location
}

function getSalesMergeKey(row: KitchenSales): string {
  return [row.brandSlug ?? '', row.date, normalizeSalesLocation(canonicalizeSalesLocation(row.location))].join('::')
}

function hasMeaningfulSales(row: KitchenSales): boolean {
  return row.revenue > 0 || row.grossSales > 0 || row.count > 0
}

function mergeSalesRows(rows: KitchenSales[]): KitchenSales[] {
  const merged = new Map<string, KitchenSales>()

  for (const row of rows) {
    if (!hasMeaningfulSales(row)) {
      continue
    }

    const key = getSalesMergeKey(row)
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, row)
      continue
    }

    if (row.importSource === 'GOOGLE_SHEETS' && existing.importSource !== 'GOOGLE_SHEETS') {
      merged.set(key, row)
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const dateSort = b.date.localeCompare(a.date)
    if (dateSort !== 0) return dateSort
    return a.location.localeCompare(b.location)
  })
}

async function fetchPaginatedRows<T>(url: string, profile: string): Promise<T[]> {
  const pageSize = 1000
  const allRows: T[] = []

  for (let offset = 0; ; offset += pageSize) {
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept-Profile': profile,
        Range: `${offset}-${offset + pageSize - 1}`,
        'Range-Unit': 'items',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`[${profile}] Fetch failed: ${err}`)
    }

    const rows: T[] = await res.json()
    allRows.push(...rows)

    if (rows.length < pageSize) break
  }

  return allRows
}

function isMissingRelationError(message: string): boolean {
  return message.includes('PGRST205') || message.includes('Could not find the table')
}

export async function getKitchenSalesFromSupabase(
  brandSlug: string | null, // null = admin (all brands)
  startDate?: string,
  endDate?: string
): Promise<KitchenSales[]> {
  let url = `${SUPABASE_URL}/rest/v1/kitchen_sales?select=*&order=date.desc`
  if (brandSlug) {
    url += `&brand_slug=eq.${encodeURIComponent(brandSlug)}`
  }
  if (startDate) url += `&date=gte.${startDate}`
  if (endDate) url += `&date=lte.${endDate}`

  let operatedUrl = `${SUPABASE_URL}/rest/v1/operated_site_daily_sales?select=*&order=date.desc`
  if (brandSlug) {
    operatedUrl += `&brand_slug=eq.${encodeURIComponent(brandSlug)}`
  } else {
    operatedUrl += '&brand_slug=not.is.null'
  }
  if (startDate) operatedUrl += `&date=gte.${startDate}`
  if (endDate) operatedUrl += `&date=lte.${endDate}`

  const kitchenRowsPromise = fetchPaginatedRows<KitchenSalesRow>(url, 'sales')
  const operatedRowsPromise = fetchPaginatedRows<OperatedSiteDailySalesRow>(operatedUrl, 'sales').catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    if (isMissingRelationError(message)) {
      console.warn('[operated_site_daily_sales] Table not available yet, skipping operated sales merge')
      return []
    }
    throw error
  })

  const [kitchenRows, operatedRows] = await Promise.all([kitchenRowsPromise, operatedRowsPromise])

  return mergeSalesRows([...kitchenRows.map(toKitchenSales), ...operatedRows.map(toKitchenSalesFromOperated)])
}

export async function deleteKitchenSales(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const inList = `(${ids.map((id) => `"${id}"`).join(',')})`
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/kitchen_sales?id=in.${inList}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Profile': 'sales',
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[kitchen_sales] Delete failed: ${err}`)
  }
}

export async function insertKitchenSales(
  brandSlug: string,
  rows: Array<{ date: string; location: string; revenue: number; grossSales: number; count: number }>
): Promise<{ imported: number; skipped: number }> {
  const records = rows.map((r) => ({
    brand_slug: brandSlug,
    date: r.date,
    location: r.location,
    revenue: r.revenue,
    gross_sales: r.grossSales,
    order_count: r.count,
    avg_order_value: r.count > 0 ? r.revenue / r.count : null,
  }))

  const onConflict = encodeURIComponent('brand_slug,date,location')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/kitchen_sales?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'sales',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(records),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[kitchen_sales] Insert failed: ${err}`)
  }

  const inserted: KitchenSalesRow[] = await res.json()
  return { imported: inserted.length, skipped: records.length - inserted.length }
}
