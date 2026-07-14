import { DeliverooOrdersResult } from './types'
import { parseCSV, parseMoney, parseNum, parseDDMMYYYY, findCol } from './csv-utils'

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Parses Deliveroo "rs-orders-report" CSV.
 * Multi-restaurant format includes a "Restaurant name" column — filter by siteNameFilter.
 * Columns: Restaurant name, Order number, Order status, Date submitted, Subtotal, etc.
 */
export function parseDeliverooOrders(csvText: string, siteNameFilter?: string): DeliverooOrdersResult {
  const { headers, rows } = parseCSV(csvText)

  const restaurantIdx = findCol(headers, 'restaurant name', 'restaurant', 'site')
  const dateIdx = findCol(headers, 'date submitted', 'date', 'order date', 'submission date')
  const subtotalIdx = findCol(headers, 'subtotal', 'order total', 'gross', 'total', 'revenue')
  const statusIdx = findCol(headers, 'order status', 'status')

  const normFilter = siteNameFilter ? normalize(siteNameFilter) : null

  const byDate = new Map<string, { sales: number; orders: number }>()

  for (const row of rows) {
    // Filter by restaurant if column exists and filter is set
    if (normFilter && restaurantIdx >= 0) {
      const restaurant = normalize(row[restaurantIdx]?.trim() || '')
      const sig = normFilter.split(' ').filter(w => w.length > 5)
      const matchesSig = sig.length > 0 && sig.some(w => restaurant.includes(w))
      if (!restaurant.includes(normFilter) && !normFilter.includes(restaurant) && !matchesSig) continue
    }

    const status = statusIdx >= 0 ? row[statusIdx]?.trim().toLowerCase() || '' : 'completed'
    if (status && status !== 'completed') continue

    const rawDate = dateIdx >= 0 ? row[dateIdx]?.trim() || '' : ''
    const date = parseDDMMYYYY(rawDate) || rawDate.split(' ')[0] || rawDate
    if (!date || date.length < 8) continue

    const sales = subtotalIdx >= 0 ? parseMoney(row[subtotalIdx]) : 0

    const existing = byDate.get(date) ?? { sales: 0, orders: 0 }
    existing.sales += sales
    existing.orders += 1
    byDate.set(date, existing)
  }

  const days = Array.from(byDate.entries())
    .map(([date, data]) => ({ date, sales: Math.round(data.sales * 100) / 100, orders: data.orders }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalSales = days.reduce((s, d) => s + d.sales, 0)
  const totalOrders = days.reduce((s, d) => s + d.orders, 0)

  return { days, totalSales: Math.round(totalSales * 100) / 100, totalOrders }
}
