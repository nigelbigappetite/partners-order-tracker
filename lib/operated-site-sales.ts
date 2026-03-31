import { getSpreadsheetValues } from './googleSheets'

const SUPABASE_URL = process.env.HT_PARTNERS_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY!
const OPERATED_SALES_SPREADSHEET_ID =
  process.env.OPERATED_SALES_SPREADSHEET_ID || '12PviM8-GIxKsAhI_bKGMnMpM1OpaMyBSlc7EpfUAQP8'

export interface OperatedSiteSheetConfig {
  sheetName: string
  siteSlug: string
  siteName: string
  brandSlug: string | null
}

export interface OperatedSiteDailySale {
  brandSlug: string | null
  siteSlug: string
  siteName: string
  sourceSheet: string
  date: string
  revenue: number
  orderCount: number
  averageOrderValue: number | null
}

export interface OperatedSiteSyncPreviewSite {
  siteSlug: string
  siteName: string
  brandSlug: string | null
  sourceSheet: string
  rowCount: number
  totalRevenue: number
  totalOrders: number
  earliestDate: string | null
  latestDate: string | null
}

export interface OperatedSiteSyncPreview {
  totalRows: number
  totalRevenue: number
  totalOrders: number
  earliestDate: string | null
  latestDate: string | null
  sites: OperatedSiteSyncPreviewSite[]
}

export interface OperatedSiteSyncDateRange {
  startDate?: string
  endDate?: string
}

export interface OperatedSiteSyncStatus {
  lastSyncedAt: string | null
}

interface OperatedSiteDailySaleRow {
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
  updated_at: string
}

const OPERATED_SITE_SHEETS: OperatedSiteSheetConfig[] = [
  { sheetName: 'loughton-rev-tracker', siteSlug: 'loughton', siteName: 'Loughton', brandSlug: null },
  { sheetName: 'maidstone-rev-tracker', siteSlug: 'maidstone', siteName: 'Maidstone', brandSlug: null },
  { sheetName: 'chatham-rev-tracker', siteSlug: 'chatham', siteName: 'Chatham', brandSlug: null },
  { sheetName: 'Wanstead_Rev_Tracker', siteSlug: 'wanstead', siteName: 'Wanstead', brandSlug: null },
  { sheetName: 'wsco-bethnal-rev-tracker', siteSlug: 'wsco-bethnal', siteName: 'WSCO Bethnal Green', brandSlug: 'wing-shack-co' },
  { sheetName: 'eggs-n-stuff-bethnal-rev-tracker', siteSlug: 'eggs-bethnal', siteName: 'Eggs n Stuff Bethnal Green', brandSlug: 'eggs-nstuff' },
  { sheetName: 'smsh-bn-bethnal-rev-tracker', siteSlug: 'smsh-bn-bethnal', siteName: 'SMSH BN Bethnal Green', brandSlug: 'smsh-bn' },
]

function parseDecimal(value: string | undefined): number | null {
  const raw = (value || '').trim()
  if (!raw || raw === '#DIV/0!') return null
  const normalized = raw.replace(/,/g, '').replace(/£/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateCell(value: string | undefined): string | null {
  const raw = (value || '').trim()
  if (!raw || raw.toLowerCase() === 'date' || raw.toLowerCase() === 'total') return null

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null

  const [, dd, mm, yy] = match
  const year = yy.length === 2 ? `20${yy}` : yy
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

async function readCombinedRowsFromSheet(config: OperatedSiteSheetConfig): Promise<OperatedSiteDailySale[]> {
  const rows = await getSpreadsheetValues(OPERATED_SALES_SPREADSHEET_ID, config.sheetName, 'A1:E2000')
  const sales: OperatedSiteDailySale[] = []

  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i] || []
    const date = parseDateCell(row[1])
    if (!date) continue

    const revenue = parseDecimal(row[2])
    const orderCount = parseDecimal(row[3])

    if (revenue == null && orderCount == null) continue

    const safeRevenue = revenue ?? 0
    const safeOrderCount = Math.round(orderCount ?? 0)

    sales.push({
      brandSlug: config.brandSlug,
      siteSlug: config.siteSlug,
      siteName: config.siteName,
      sourceSheet: config.sheetName,
      date,
      revenue: safeRevenue,
      orderCount: safeOrderCount,
      averageOrderValue: safeOrderCount > 0 ? safeRevenue / safeOrderCount : null,
    })
  }

  return sales
}

function dedupeOperatedSiteSales(rows: OperatedSiteDailySale[]): OperatedSiteDailySale[] {
  const deduped = new Map<string, OperatedSiteDailySale>()

  for (const row of rows) {
    const key = `${row.siteSlug}::${row.date}`
    const existing = deduped.get(key)

    if (!existing) {
      deduped.set(key, row)
      continue
    }

    deduped.set(key, {
      ...row,
      revenue: Math.max(existing.revenue, row.revenue),
      orderCount: Math.max(existing.orderCount, row.orderCount),
      averageOrderValue:
        Math.max(existing.orderCount, row.orderCount) > 0
          ? Math.max(existing.revenue, row.revenue) / Math.max(existing.orderCount, row.orderCount)
          : null,
    })
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.siteSlug === b.siteSlug) return a.date.localeCompare(b.date)
    return a.siteSlug.localeCompare(b.siteSlug)
  })
}

function filterOperatedSiteSalesByDateRange(
  rows: OperatedSiteDailySale[],
  range: OperatedSiteSyncDateRange = {}
): OperatedSiteDailySale[] {
  const { startDate, endDate } = range

  return rows.filter((row) => {
    if (startDate && row.date < startDate) return false
    if (endDate && row.date > endDate) return false
    return true
  })
}

export async function readOperatedSiteSalesFromGoogleSheet(
  range: OperatedSiteSyncDateRange = {}
): Promise<OperatedSiteDailySale[]> {
  const results = await Promise.all(OPERATED_SITE_SHEETS.map((config) => readCombinedRowsFromSheet(config)))
  return filterOperatedSiteSalesByDateRange(dedupeOperatedSiteSales(results.flat()), range)
}

export async function previewOperatedSiteSalesSync(
  range: OperatedSiteSyncDateRange = {}
): Promise<OperatedSiteSyncPreview> {
  const rows = await readOperatedSiteSalesFromGoogleSheet(range)

  const sitesMap = new Map<string, OperatedSiteSyncPreviewSite>()

  for (const row of rows) {
    const existing = sitesMap.get(row.siteSlug)

    if (!existing) {
      sitesMap.set(row.siteSlug, {
        siteSlug: row.siteSlug,
        siteName: row.siteName,
        brandSlug: row.brandSlug,
        sourceSheet: row.sourceSheet,
        rowCount: 1,
        totalRevenue: row.revenue,
        totalOrders: row.orderCount,
        earliestDate: row.date,
        latestDate: row.date,
      })
      continue
    }

    existing.rowCount += 1
    existing.totalRevenue += row.revenue
    existing.totalOrders += row.orderCount
    existing.earliestDate = !existing.earliestDate || row.date < existing.earliestDate ? row.date : existing.earliestDate
    existing.latestDate = !existing.latestDate || row.date > existing.latestDate ? row.date : existing.latestDate
  }

  const sites = Array.from(sitesMap.values()).sort((a, b) => a.siteName.localeCompare(b.siteName))

  return {
    totalRows: rows.length,
    totalRevenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    totalOrders: rows.reduce((sum, row) => sum + row.orderCount, 0),
    earliestDate: rows.length > 0 ? rows.reduce((min, row) => (row.date < min ? row.date : min), rows[0].date) : null,
    latestDate: rows.length > 0 ? rows.reduce((max, row) => (row.date > max ? row.date : max), rows[0].date) : null,
    sites,
  }
}

export async function upsertOperatedSiteSales(
  rows: OperatedSiteDailySale[]
): Promise<{ rowsWritten: number; total: number }> {
  if (rows.length === 0) {
    return { rowsWritten: 0, total: 0 }
  }

  const records = rows.map((row) => ({
    brand_slug: row.brandSlug,
    site_slug: row.siteSlug,
    site_name: row.siteName,
    source_sheet: row.sourceSheet,
    date: row.date,
    revenue: row.revenue,
    order_count: row.orderCount,
    avg_order_value: row.averageOrderValue,
  }))

  const onConflict = encodeURIComponent('site_slug,date')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/operated_site_daily_sales?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'sales',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(records),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[operated_site_daily_sales] Upsert failed: ${err}`)
  }

  const importedRows: OperatedSiteDailySaleRow[] = await res.json()
  return { rowsWritten: importedRows.length, total: records.length }
}

export async function getOperatedSiteSalesSyncStatus(): Promise<OperatedSiteSyncStatus> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/operated_site_daily_sales?select=updated_at&order=updated_at.desc&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept-Profile': 'sales',
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    const err = await res.text()
    if (err.includes('PGRST205') || err.includes('Could not find the table')) {
      return { lastSyncedAt: null }
    }
    throw new Error(`[operated_site_daily_sales] Status fetch failed: ${err}`)
  }

  const rows: Array<{ updated_at: string }> = await res.json()
  return {
    lastSyncedAt: rows[0]?.updated_at ?? null,
  }
}

export function getOperatedSiteSheetConfigs(): OperatedSiteSheetConfig[] {
  return OPERATED_SITE_SHEETS
}
