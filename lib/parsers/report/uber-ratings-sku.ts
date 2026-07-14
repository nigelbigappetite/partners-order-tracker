import { UberRatingsSkuItem } from './types'
import { parseCSV, parseNum, findCol, buildSiteFilter } from './csv-utils'

/**
 * Parses Uber Eats "restaurant_rating_sku_local" CSV.
 *
 * Two formats exist:
 *   Per-review (common): one row per item per order that received a thumb rating.
 *     Detected by presence of 'Rating value' column.
 *     Columns: Restaurant, Order ID, Item name, Rating value (0 = thumbs down, 1 = thumbs up), …
 *     → group by item name, compute (thumbs_up / total) * 5 as pseudo-star rating.
 *
 *   Summary (rare): one row per item per restaurant.
 *     Columns: Restaurant, Item name, Positive rating count, Negative rating count.
 *     → same thumbs-up-to-star conversion but read from count columns.
 *
 * Items sorted lowest-rated first (to flag problem items in §06 Reviews).
 */
export function parseUberRatingsSku(csvText: string, siteNameFilter?: string): UberRatingsSkuItem[] {
  const { headers, rows } = parseCSV(csvText)

  const restaurantIdx = findCol(headers, 'restaurant', 'shop name', 'store name')
  const nameIdx = findCol(headers, 'item name', 'item', 'name', 'product', 'sku')

  // Per-review format: 'Rating value' column (0 = thumbs down, 1 = thumbs up)
  const ratingValueIdx = findCol(headers, 'rating value')

  const matchRow = buildSiteFilter(siteNameFilter, restaurantIdx, rows)

  if (ratingValueIdx >= 0) {
    // Per-review format: accumulate per item
    const itemMap = new Map<string, { thumbsUp: number; total: number }>()

    for (const row of rows) {
      if (!matchRow(row)) continue
      const name = nameIdx >= 0 ? row[nameIdx]?.trim() || '' : ''
      if (!name) continue

      // Skip rows with no item rating (field is blank/missing)
      const rawVal = row[ratingValueIdx]?.trim() ?? ''
      if (rawVal === '') continue

      const val = parseNum(rawVal) // 0 = thumbs down, 1 = thumbs up
      const existing = itemMap.get(name) ?? { thumbsUp: 0, total: 0 }
      existing.thumbsUp += val
      existing.total += 1
      itemMap.set(name, existing)
    }

    const items: UberRatingsSkuItem[] = []
    for (const [name, { thumbsUp, total }] of Array.from(itemMap.entries())) {
      if (total === 0) continue
      const rating = Math.round((thumbsUp / total) * 5 * 100) / 100
      items.push({ name, rating, count: total })
    }
    return items.sort((a, b) => a.rating - b.rating)
  }

  // Summary format: positive/negative count columns per row
  const posIdx = findCol(headers, 'positive rating count', 'positive count', 'thumbs up')
  const negIdx = findCol(headers, 'negative rating count', 'negative count', 'thumbs down')

  const items: UberRatingsSkuItem[] = []
  for (const row of rows) {
    if (!matchRow(row)) continue
    const name = nameIdx >= 0 ? row[nameIdx]?.trim() || '' : ''
    if (!name) continue
    const pos = posIdx >= 0 ? parseNum(row[posIdx]) : 0
    const neg = negIdx >= 0 ? parseNum(row[negIdx]) : 0
    const total = pos + neg
    if (total === 0) continue
    const rating = Math.round((pos / total) * 5 * 100) / 100
    items.push({ name, rating, count: Math.round(total) })
  }
  return items.sort((a, b) => a.rating - b.rating)
}
