import { JustEatAdsResult } from './types'
import { parseCSV, parseMoney, parseNum, findCol } from './csv-utils'

/**
 * Parses Just Eat "CampaignHistory" CSV.
 * Columns: Campaign Name, Start Date, End Date, Spend, Revenue, ROAS, Orders, etc.
 */
export function parseJustEatAds(csvText: string): JustEatAdsResult {
  const { headers, rows } = parseCSV(csvText)

  const spendIdx = findCol(headers, 'spend', 'cost', 'budget spent', 'ad spend')
  const revenueIdx = findCol(headers, 'revenue', 'sales', 'attributed revenue', 'attributed sales')
  const roasIdx = findCol(headers, 'roas', 'return on ad spend')
  const ordersIdx = findCol(headers, 'orders', 'attributed orders', 'order count')

  let spend = 0, revenue = 0, orders = 0

  for (const row of rows) {
    if (spendIdx >= 0) spend += parseMoney(row[spendIdx])
    if (revenueIdx >= 0) revenue += parseMoney(row[revenueIdx])
    if (ordersIdx >= 0) orders += parseNum(row[ordersIdx])
  }

  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0

  return {
    spend: Math.round(spend * 100) / 100,
    revenue: Math.round(revenue * 100) / 100,
    roas,
    orders: Math.round(orders),
  }
}
