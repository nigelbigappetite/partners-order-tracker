import { UberLeaderboardItem } from './types'
import { parseCSV, parseMoney, parseNum, findCol } from './csv-utils'

/**
 * Parses Uber Eats "sales-leaderboard" CSV.
 * Contains top items by sales across restaurants.
 * Columns: Item, Category, Sales, Items sold
 */
export function parseUberLeaderboard(csvText: string): UberLeaderboardItem[] {
  const { headers, rows } = parseCSV(csvText)

  const nameIdx = findCol(headers, 'item', 'item name', 'name', 'product', 'menu item')
  const categoryIdx = findCol(headers, 'category', 'section', 'menu section')
  const salesIdx = findCol(headers, 'gross sales', 'item sales', 'total sales', 'sales (incl. vat)', 'sales', 'revenue', 'total revenue')
  const qtyIdx = findCol(headers, 'items sold', 'units sold', 'total sold', 'number sold', 'quantity', 'qty', 'sold', 'orders')

  const items: UberLeaderboardItem[] = []

  for (const row of rows) {
    const name = row[nameIdx]?.trim() || ''
    if (!name) continue
    const sales = salesIdx >= 0 ? parseMoney(row[salesIdx]) : 0
    const qty = qtyIdx >= 0 ? parseNum(row[qtyIdx]) : 0
    const category = categoryIdx >= 0 ? row[categoryIdx]?.trim() : undefined

    items.push({ name, sales, qty, category: category || undefined })
  }

  // Sort by sales descending
  return items.sort((a, b) => b.sales - a.sales)
}
