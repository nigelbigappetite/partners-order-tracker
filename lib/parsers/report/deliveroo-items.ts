import { DeliverooItemsItem } from './types'
import { parseCSV, parseMoney, parseNum, findCol } from './csv-utils'

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Parses Deliveroo "rs-items_sold-report" CSV.
 * Multi-restaurant format includes a "Restaurant name" column — filter by siteNameFilter.
 * Columns: Restaurant name, Category, Item name, Quantity, Subtotal, etc.
 */
export function parseDeliverooItems(csvText: string, siteNameFilter?: string): DeliverooItemsItem[] {
  const { headers, rows } = parseCSV(csvText)

  const restaurantIdx = findCol(headers, 'restaurant name', 'restaurant', 'site')
  const nameIdx = findCol(headers, 'item name', 'item', 'name', 'product', 'menu item')
  const qtyIdx = findCol(headers, 'quantity', 'qty', 'items sold', 'count', 'total quantity')
  const salesIdx = findCol(headers, 'subtotal', 'revenue', 'sales', 'total', 'gross')

  const normFilter = siteNameFilter ? normalize(siteNameFilter) : null
  const items: DeliverooItemsItem[] = []

  for (const row of rows) {
    if (normFilter && restaurantIdx >= 0) {
      const restaurant = normalize(row[restaurantIdx]?.trim() || '')
      const sig = normFilter.split(' ').filter(w => w.length > 5)
      const matchesSig = sig.length > 0 && sig.some(w => restaurant.includes(w))
      if (!restaurant.includes(normFilter) && !normFilter.includes(restaurant) && !matchesSig) continue
    }

    const name = row[nameIdx]?.trim() || ''
    if (!name) continue
    const qty = qtyIdx >= 0 ? parseNum(row[qtyIdx]) : 0
    const sales = salesIdx >= 0 ? parseMoney(row[salesIdx]) : 0
    items.push({ name, qty: Math.round(qty), sales: Math.round(sales * 100) / 100 })
  }

  return items.sort((a, b) => b.sales - a.sales)
}
