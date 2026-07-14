import { DeliverooAdsResult } from './types'
import { parseCSV, parseMoney, parseNum, findCol } from './csv-utils'

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Parses Deliveroo "rs-adverts-report" CSV.
 * Multi-restaurant format includes a "Site" column — filter by siteNameFilter.
 * Columns: Date, Data Status, Campaign Name, Campaign ID, Campaign Status, Site, Total Clicks, Total Views,
 *          Average Cost Per Click, Total Ad Spend, ROAS (clicks), Total Sales (clicks), Total Orders (clicks), etc.
 */
export function parseDeliverooAds(csvText: string, siteNameFilter?: string): DeliverooAdsResult {
  const { headers, rows } = parseCSV(csvText)

  const siteIdx = findCol(headers, 'site', 'restaurant name', 'restaurant')
  const spendIdx = findCol(headers, 'total ad spend', 'ad spend', 'spend', 'cost', 'total spend')
  const clickRevenueIdx = findCol(headers, 'total sales (clicks)', 'click sales', 'click attributed sales', 'click revenue', 'clicks sales')
  const clickOrdersIdx = findCol(headers, 'total orders (clicks)', 'click orders', 'click attributed orders')
  const viewRevenueIdx = findCol(headers, 'total sales (views)', 'view sales', 'view attributed sales', 'view revenue')
  const viewOrdersIdx = findCol(headers, 'total orders (views)', 'view orders', 'view attributed orders')
  const viewsIdx = findCol(headers, 'total views', 'views', 'impressions')
  const clicksIdx = findCol(headers, 'total clicks', 'clicks')

  const normFilter = siteNameFilter ? normalize(siteNameFilter) : null
  let spend = 0, clickRevenue = 0, clickOrders = 0, viewRevenue = 0, viewOrders = 0, totalViews = 0, totalClicks = 0

  for (const row of rows) {
    if (normFilter && siteIdx >= 0) {
      const site = normalize(row[siteIdx]?.trim() || '')
      const sig = normFilter.split(' ').filter(w => w.length > 5)
      const matchesSig = sig.length > 0 && sig.some(w => site.includes(w))
      if (!site.includes(normFilter) && !normFilter.includes(site) && !matchesSig) continue
    }

    if (spendIdx >= 0) spend += parseMoney(row[spendIdx])
    if (clickRevenueIdx >= 0) clickRevenue += parseMoney(row[clickRevenueIdx])
    if (clickOrdersIdx >= 0) clickOrders += parseNum(row[clickOrdersIdx])
    if (viewRevenueIdx >= 0) viewRevenue += parseMoney(row[viewRevenueIdx])
    if (viewOrdersIdx >= 0) viewOrders += parseNum(row[viewOrdersIdx])
    if (viewsIdx >= 0) totalViews += parseNum(row[viewsIdx])
    if (clicksIdx >= 0) totalClicks += parseNum(row[clicksIdx])
  }

  const revenue = clickRevenue + viewRevenue
  const roas = spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0

  return {
    spend: Math.round(spend * 100) / 100,
    clickRevenue: Math.round(clickRevenue * 100) / 100,
    clickOrders: Math.round(clickOrders),
    viewRevenue: Math.round(viewRevenue * 100) / 100,
    viewOrders: Math.round(viewOrders),
    totalViews: Math.round(totalViews),
    totalClicks: Math.round(totalClicks),
    roas,
  }
}
