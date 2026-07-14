import { UberFinancialsResult } from './types'
import { parseCSV, parseMoney, parseDDMMYYYY, findCol, buildSiteFilter } from './csv-utils'

/**
 * Parses Uber Eats financial/payout report CSV (UUID-named "*-great_britain.csv").
 * Multi-restaurant format — filter by siteNameFilter using the "Shop name" column.
 *
 * Row structure:
 *   Order-level row: non-empty Order ID, Order date, Sales (incl. VAT), Order status
 *   Item-level rows: empty Order ID (same Workflow ID) — skipped to avoid double-counting
 *   Ad spend rows:   empty Order ID, Other payments description = "Ad spend" — also skipped
 */
export function parseUberFinancials(csvText: string, siteNameFilter: string): UberFinancialsResult {
  const { headers, rows } = parseCSV(csvText)

  const orderIdIdx = findCol(headers, 'order id')
  const shopNameIdx = findCol(headers, 'shop name', 'restaurant name', 'restaurant', 'store name')
  const dateIdx = findCol(headers, 'order date', 'date')
  const salesIdx = findCol(headers, 'sales (incl. vat)', 'total order (incl. vat)', 'subtotal', 'sales')
  const statusIdx = findCol(headers, 'order status', 'status')
  const offersOnItemsIdx = findCol(headers, 'offers on items (incl. vat)')
  const offerRedemptionFeeIdx = findCol(headers, 'offer redemption fee (incl. vat)', 'offer redemption fee')

  const allShopNamesSet = new Set<string>()
  const dailyMap = new Map<string, { sales: number; orders: number }>()
  let offerTotal = 0
  let ordersWithOffers = 0

  // Collect all shop names for diagnostics
  for (const row of rows) {
    if (shopNameIdx >= 0) {
      const sname = row[shopNameIdx]?.trim() || ''
      if (sname) allShopNamesSet.add(sname)
    }
  }

  const matchRow = buildSiteFilter(siteNameFilter, shopNameIdx, rows)

  for (const row of rows) {
    // Only process order-level rows (item rows and ad spend rows have empty Order ID)
    const orderId = orderIdIdx >= 0 ? row[orderIdIdx]?.trim() || '' : ''
    if (!orderId) continue

    // Only completed orders
    const status = statusIdx >= 0 ? row[statusIdx]?.trim().toLowerCase() || '' : ''
    if (status && status !== 'completed') continue

    if (!matchRow(row)) continue

    // Aggregate daily sales
    const rawDate = dateIdx >= 0 ? row[dateIdx]?.trim() || '' : ''
    const isoDate = parseDDMMYYYY(rawDate)
    if (!isoDate) continue

    const saleAmt = salesIdx >= 0 ? parseMoney(row[salesIdx]) : 0
    const existing = dailyMap.get(isoDate) ?? { sales: 0, orders: 0 }
    existing.sales += saleAmt
    existing.orders += 1
    dailyMap.set(isoDate, existing)

    const offerAmt = Math.abs(offersOnItemsIdx >= 0 ? parseMoney(row[offersOnItemsIdx]) : 0)
    const redemptionAmt = Math.abs(offerRedemptionFeeIdx >= 0 ? parseMoney(row[offerRedemptionFeeIdx]) : 0)
    if (offerAmt > 0 || redemptionAmt > 0) {
      offerTotal += offerAmt + redemptionAmt
      ordersWithOffers += 1
    }
  }

  const dailySales = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, sales: Math.round(d.sales * 100) / 100, orders: d.orders }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalSales = Math.round(dailySales.reduce((s, d) => s + d.sales, 0) * 100) / 100
  const totalOrders = dailySales.reduce((s, d) => s + d.orders, 0)
  const allShopNamesInFile = Array.from(allShopNamesSet).sort()

  return {
    dailySales,
    totalSales,
    totalOrders,
    offerTotal: Math.round(offerTotal * 100) / 100,
    ordersWithOffers,
    allShopNamesInFile,
  }
}
