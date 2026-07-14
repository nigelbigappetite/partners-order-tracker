import { NextResponse } from 'next/server'
import { insertKitchenSales } from '@/lib/sales-supabase'
import { insertKitchenOrders } from '@/lib/kitchen-orders-supabase'

export const dynamic = 'force-dynamic'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseMoney(value: string | undefined): number {
  if (!value) return 0
  const trimmed = value.trim()
  if (!trimmed) return 0

  const isParenthesizedNegative = trimmed.startsWith('(') && trimmed.endsWith(')')
  const parsed = parseFloat(trimmed.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed)) return 0

  return isParenthesizedNegative ? -Math.abs(parsed) : parsed
}

interface AggregatedRow {
  date: string
  location: string
  revenue: number
  grossSales: number
  count: number
  platform: string
}

interface RawOrder {
  orderId: string
  date: string
  location: string
  grossAmount: number
  status: string
  platform: string
}

function parseUberCSV(csvText: string): { aggregated: AggregatedRow[]; orders: RawOrder[] } {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return { aggregated: [], orders: [] }

  // Row 1 may be a verbose description row — skip if first cell starts with "Order ID as per"
  let headerLineIndex = 0
  const firstCell = parseCSVLine(lines[0])[0] || ''
  if (firstCell.startsWith('Order ID as per')) {
    headerLineIndex = 1
  }

  if (lines.length <= headerLineIndex + 1) return { aggregated: [], orders: [] }

  const headers = parseCSVLine(lines[headerLineIndex]).map((h) => h.toLowerCase().trim())

  const orderIdIdx = headers.indexOf('order id')
  const shopNameIdx = headers.indexOf('shop name')
  const orderDateIdx = headers.indexOf('order date')
  const salesInclVATIdx = headers.indexOf('sales (incl. vat)')
  const offersOnItemsIdx = headers.indexOf('offers on items (incl. vat)')
  const offerRedemptionFeeIdx = headers.indexOf('offer redemption fee (incl. vat)')
  const orderStatusIdx = headers.indexOf('order status')

  if (orderIdIdx === -1 || shopNameIdx === -1 || orderDateIdx === -1 || salesInclVATIdx === -1) {
    throw new Error(
      'CSV missing required Uber Eats columns: "Order ID", "Shop name", "Order date", "Sales (incl. VAT)"'
    )
  }

  const aggregated = new Map<string, AggregatedRow>()
  const orders: RawOrder[] = []

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    // Skip ad-spend / adjustment rows (blank Order ID)
    const orderId = values[orderIdIdx]?.trim() || ''
    if (!orderId) continue

    const shopName = values[shopNameIdx]?.trim() || ''
    const rawDate = values[orderDateIdx]?.trim() || ''
    const date = parseDDMMYYYY(rawDate)
    if (!date || !shopName) continue

    const salesInclVAT = parseMoney(values[salesInclVATIdx])
    const offersOnItems = offersOnItemsIdx >= 0 ? Math.abs(parseMoney(values[offersOnItemsIdx])) : 0
    const offerRedemptionFee =
      offerRedemptionFeeIdx >= 0 ? Math.abs(parseMoney(values[offerRedemptionFeeIdx])) : 0
    const orderStatus = orderStatusIdx >= 0 ? values[orderStatusIdx]?.trim() || '' : ''
    const isCompleted = orderStatus === 'Completed'
    const customerSpendAfterOffers = isCompleted
      ? Math.max(0, salesInclVAT - offersOnItems - offerRedemptionFee)
      : 0

    // Raw per-order record
    orders.push({
      orderId,
      date,
      location: shopName,
      grossAmount: salesInclVAT,
      status: orderStatus,
      platform: 'uber_eats',
    })

    // Daily aggregate
    const key = `${date}::${shopName}`
    const existing = aggregated.get(key)
    if (!existing) {
      aggregated.set(key, {
        date,
        location: shopName,
        platform: 'uber_eats',
        revenue: customerSpendAfterOffers,
        grossSales: isCompleted ? salesInclVAT : 0,
        count: isCompleted ? 1 : 0,
      })
    } else {
      if (isCompleted) {
        existing.revenue += customerSpendAfterOffers
        existing.grossSales += salesInclVAT
        existing.count += 1
      }
    }
  }

  return { aggregated: Array.from(aggregated.values()), orders }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const brandSlug = (formData.get('brand_slug') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!brandSlug) {
      return NextResponse.json({ error: 'brand_slug is required' }, { status: 400 })
    }

    const text = await file.text()
    const { aggregated, orders } = parseUberCSV(text)

    if (aggregated.length === 0) {
      return NextResponse.json({ error: 'No valid order rows found in CSV' }, { status: 400 })
    }

    const salesResult = await insertKitchenSales(brandSlug, aggregated, { onDuplicate: 'merge' })

    // Best-effort: write raw orders — silent if kitchen_orders table doesn't exist yet
    let ordersResult = { imported: 0, skipped: 0 }
    try {
      ordersResult = await insertKitchenOrders(brandSlug, orders)
    } catch (e: any) {
      console.error('[Uber CSV Import] kitchen_orders insert failed:', e?.message ?? e)
    }

    return NextResponse.json({
      success: true,
      imported: salesResult.imported,
      skipped: salesResult.skipped,
      ordersImported: ordersResult.imported,
      ordersSkipped: ordersResult.skipped,
      message: `Successfully imported or updated ${salesResult.imported} daily rows and imported ${ordersResult.imported} individual orders.`,
    })
  } catch (error: any) {
    console.error('[Uber CSV Import API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import Uber CSV' },
      { status: 500 }
    )
  }
}
