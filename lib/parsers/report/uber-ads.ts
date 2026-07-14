import { UberAdsResult } from './types'
import { parseCSV, parseMoney, parseNum, parsePct, findCol } from './csv-utils'

/**
 * Parses Uber Eats "ads-campaigns-list" CSV.
 * Sums all campaign rows.
 * Columns: Campaign name, Status, Budget, Impressions, Clicks, CTR, Cost, Revenue, ROAS, Orders, Cost per order
 */
export function parseUberAds(csvText: string): UberAdsResult {
  const { headers, rows } = parseCSV(csvText)

  const spendIdx = findCol(headers, 'cost', 'spend', 'ad spend', 'total cost')
  const revenueIdx = findCol(headers, 'revenue', 'attributed sales', 'ad sales', 'attributed revenue')
  const roasIdx = findCol(headers, 'roas', 'return on ad spend')
  const ordersIdx = findCol(headers, 'orders', 'attributed orders', 'ad orders')
  const impressionsIdx = findCol(headers, 'impressions', 'total impressions')
  const clicksIdx = findCol(headers, 'clicks', 'total clicks')
  const ctrIdx = findCol(headers, 'ctr', 'click-through rate', 'click through rate')
  const cpoIdx = findCol(headers, 'cost per order', 'cost / order', 'cpo')

  let spend = 0, revenue = 0, orders = 0, impressions = 0, clicks = 0
  const roasNums: number[] = []
  const ctrNums: number[] = []
  const cpoNums: number[] = []

  for (const row of rows) {
    if (spendIdx >= 0) spend += parseMoney(row[spendIdx])
    if (revenueIdx >= 0) revenue += parseMoney(row[revenueIdx])
    if (ordersIdx >= 0) orders += parseNum(row[ordersIdx])
    if (impressionsIdx >= 0) impressions += parseNum(row[impressionsIdx])
    if (clicksIdx >= 0) clicks += parseNum(row[clicksIdx])
    if (roasIdx >= 0) { const v = parseNum(row[roasIdx]); if (v > 0) roasNums.push(v) }
    if (ctrIdx >= 0) { const v = parsePct(row[ctrIdx]); if (v > 0) ctrNums.push(v) }
    if (cpoIdx >= 0) { const v = parseMoney(row[cpoIdx]); if (v > 0) cpoNums.push(v) }
  }

  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0
  const ctr = clicks > 0 && impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0
  const cpo = orders > 0 ? Math.round((spend / orders) * 100) / 100 : 0

  return {
    spend: Math.round(spend * 100) / 100,
    revenue: Math.round(revenue * 100) / 100,
    roas,
    orders: Math.round(orders),
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    ctr,
    costPerOrder: cpo,
  }
}
