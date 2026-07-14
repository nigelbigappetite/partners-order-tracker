import { ReportFileType } from './types'

/**
 * Detect file type from CSV column headers when filename-based detection fails.
 * Reads the first 3 lines to find the header row (Uber payout files have 2 description rows
 * before the real headers, so we check all three).
 */
export function detectFileTypeByContent(csvText: string): ReportFileType {
  const lines = csvText.slice(0, 2000).split('\n').slice(0, 3)

  for (const line of lines) {
    const h = line.toLowerCase()

    // Uber Eats payout/financial report: Order ID + Shop name + Order status
    if (h.includes('order id') && h.includes('shop name') && h.includes('order status')) {
      return 'uber-financials'
    }
    // Uber order history V2 (weekly summary): completed orders per restaurant
    if (h.includes('completed orders') && h.includes('restaurant')) return 'uber-order-history'
    if (h.includes('average time to accept') && h.includes('restaurant')) return 'uber-order-history'
    // Uber order history V1 (per-order): confirmation/confirm time + prep time
    if ((h.includes('confirmation time') || h.includes('time to confirm')) && h.includes('prep time') && h.includes('restaurant')) {
      return 'uber-order-history'
    }
    // Uber sales-over-time (daily breakdown): gross sales + orders + date
    if (h.includes('gross sales') && h.includes('orders') && h.includes('date')) {
      return 'uber-sales-over-time'
    }
    // Uber leaderboard (top items by revenue): items sold + any sales column
    if ((h.includes('items sold') || h.includes('units sold')) && (h.includes('sales') || h.includes('revenue'))) {
      return 'uber-leaderboard'
    }
    // Uber item-level ratings (SKU): item name + rating + count
    if (h.includes('item name') && h.includes('rating') && h.includes('count')) {
      return 'uber-ratings-sku'
    }
    // Uber restaurant rating (overall per site): restaurant + rating + count
    if (h.includes('restaurant') && h.includes('rating') && h.includes('count') && !h.includes('item name')) {
      return 'uber-ratings-overall'
    }
    // Deliveroo orders: restaurant name + order status + date submitted
    if (h.includes('restaurant name') && h.includes('order status') && h.includes('date submitted')) {
      return 'deliveroo-orders'
    }
    // Deliveroo items sold: restaurant name + item name + quantity
    if (h.includes('restaurant name') && h.includes('item name') && h.includes('quantity')) {
      return 'deliveroo-items'
    }
    // Deliveroo ads: total ad spend + roas columns
    if (h.includes('total ad spend') && h.includes('roas')) {
      return 'deliveroo-ads'
    }
    // Deliveroo speed — busy mode
    if (h.includes('busy mode')) return 'deliveroo-speed-busy'
    // Deliveroo speed — rider wait (vs Uber which has "confirmation time")
    if (h.includes('rider wait') && !h.includes('confirmation time')) return 'deliveroo-speed-rider'
    // Deliveroo speed — total order duration
    if (h.includes('total order duration')) return 'deliveroo-speed-duration'
    // Deliveroo speed — prep time (exclude Uber order history which also has prep time)
    if (h.includes('prep time') && !h.includes('confirmation time') && !h.includes('order id')) {
      return 'deliveroo-speed-prep'
    }
  }

  return 'unknown'
}

export function detectFileType(filename: string): ReportFileType {
  const lower = filename.toLowerCase()

  if (lower.endsWith('.zip')) return 'zip-skip'

  // Uber Eats
  if (lower.includes('great_britain') || lower.includes('great-britain')) return 'uber-financials'
  if (lower.includes('sales-leaderboard') || lower.includes('sales_leaderboard')) return 'uber-leaderboard'
  if (lower.includes('order_history_local') || lower.includes('order-history-local') || (lower.includes('order') && lower.includes('history') && !lower.includes('rs-'))) return 'uber-order-history'
  if (lower.includes('ads-campaigns-list') || lower.includes('ads_campaigns_list') || lower.includes('ads-campaigns')) return 'uber-ads'
  if (lower.includes('user-conversion') || lower.includes('user_conversion')) return 'uber-conversion'
  if (lower.includes('restaurant_rating_local') || lower.includes('restaurant-rating-local')) return 'uber-ratings-overall'
  if (lower.includes('restaurant_rating_sku') || lower.includes('restaurant-rating-sku')) return 'uber-ratings-sku'
  if (lower.includes('sales-over-time') || lower.includes('sales_over_time')) return 'uber-sales-over-time'

  // Deliveroo (rs- prefix)
  if (lower.includes('rs-orders-report') || lower.includes('rs_orders_report')) return 'deliveroo-orders'
  if (lower.includes('rs-items_sold-report') || lower.includes('rs-items-sold') || lower.includes('rs_items_sold')) return 'deliveroo-items'
  if (lower.includes('rs-adverts-report') || lower.includes('rs_adverts_report')) return 'deliveroo-ads'
  if (lower.includes('rs-speed-report-prep-time') || lower.includes('rs_speed_report_prep_time')) return 'deliveroo-speed-prep'
  if (lower.includes('rs-speed-report-rider-wait') || lower.includes('rs_speed_report_rider_wait')) return 'deliveroo-speed-rider'
  if (lower.includes('rs-speed-report-average-total') || lower.includes('rs_speed_report_average_total')) return 'deliveroo-speed-duration'
  if (lower.includes('rs-speed-report-busy-mode') || lower.includes('rs_speed_report_busy_mode')) return 'deliveroo-speed-busy'
  if (lower.includes('rs-speed-report-speed-summary') || lower.includes('rs_speed_report_speed_summary')) return 'deliveroo-speed-summary'
  if (lower.includes('rs-customers-report') || lower.includes('rs_customers_report')) return 'deliveroo-customers'

  // Just Eat
  if (lower.includes('campaignhistory') || lower.includes('campaign_history') || lower.includes('campaign-history')) return 'just-eat-ads'
  if ((lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.html')) &&
      (lower.includes('je') || lower.includes('just') || lower.includes('eat') ||
       lower.includes('invoice'))) return 'just-eat-pdf'

  return 'unknown'
}
