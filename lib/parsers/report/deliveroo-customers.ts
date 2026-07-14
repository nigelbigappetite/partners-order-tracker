import { DeliverooCustomersResult } from './types'
import { parseCSV, parseNum, findCol } from './csv-utils'

/**
 * Parses Deliveroo rs-customers-report CSV.
 *
 * The file is wide-format: one row per site with a column per metric.
 * Example headers:
 *   Site, Total orders, Orders from new customers,
 *   Orders from repeat customers (2-4 orders),
 *   Orders from frequent customers (over 4 orders),
 *   Orders with Marketer offers, Orders from Rewards,
 *   Menu conversion (% orders / menu views)
 *
 * For single-site accounts both the "All sites" row and the site row
 * carry identical values — we just take the first data row.
 */
export function parseDeliverooCustomers(csvText: string): DeliverooCustomersResult {
  const { headers, rows } = parseCSV(csvText)

  const newIdx      = findCol(headers, 'orders from new customers', 'new customers')
  const repeatIdx   = findCol(headers, 'orders from repeat customers (2-4 orders)', 'orders from repeat customers', 'repeat customers')
  const frequentIdx = findCol(headers, 'orders from frequent customers (over 4 orders)', 'orders from frequent customers', 'frequent customers')
  const offersIdx   = findCol(headers, 'orders with marketer offers', 'marketer offers', 'orders with offers')

  // Use the first data row that has any numeric content
  const row = rows[0] ?? []

  return {
    newCount:          newIdx >= 0      ? Math.round(parseNum(row[newIdx]))      : 0,
    repeatCount:       repeatIdx >= 0   ? Math.round(parseNum(row[repeatIdx]))   : 0,
    frequentCount:     frequentIdx >= 0 ? Math.round(parseNum(row[frequentIdx])) : 0,
    ordersWithOffers:  offersIdx >= 0   ? Math.round(parseNum(row[offersIdx]))   : 0,
  }
}
