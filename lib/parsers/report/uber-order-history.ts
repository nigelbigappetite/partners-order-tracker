import { UberOrderHistoryResult } from './types'
import { parseCSV, parseNum, parseDDMMYYYY, findCol, avg, buildSiteFilter } from './csv-utils'

/**
 * Parses Uber Eats "order_history_local" CSV — supports two formats:
 *
 * V2 (order_history_local_v2): One summary row per restaurant per fulfilment type.
 * Columns include: Restaurant, Completed orders, Average time to accept,
 *   Average courier waiting time (restaurant), Average avoidable courier waiting time (restaurant),
 *   Average prep and handoff time, Average order duration.
 *
 * V1 (per-order): One row per order.
 * Columns include: Restaurant, Order status, Date, Subtotal,
 *   Time to accept (mins), Prep time (mins), Courier wait time (mins),
 *   Avoidable courier wait (mins), Total order duration (mins),
 *   Cancellation cause, Inaccurate order.
 */
export function parseUberOrderHistory(csvText: string, siteNameFilter: string): UberOrderHistoryResult {
  const { headers, rows } = parseCSV(csvText)

  const restaurantIdx = findCol(headers, 'restaurant', 'shop name', 'store name', 'restaurant name')
  const allRestaurantNamesSet = new Set<string>()

  // Detect V2 summary format by presence of "completed orders" or "average time to accept" column
  const isV2 = findCol(headers, 'completed orders', 'average time to accept') >= 0

  if (isV2) {
    const completedIdx = findCol(headers, 'completed orders')
    const acceptAvgIdx = findCol(headers, 'average time to accept', 'time to accept')
    const courierWaitRestIdx = findCol(headers, 'average courier waiting time (restaurant)', 'courier waiting time (restaurant)', 'courier waiting time restaurant')
    const avoidableIdx = findCol(headers, 'average avoidable courier waiting time (restaurant)', 'avoidable courier waiting time', 'avoidable courier wait')
    const prepHandoffIdx = findCol(headers, 'average prep and handoff time', 'prep and handoff time')
    const durationIdx = findCol(headers, 'average order duration', 'total order duration', 'order duration')
    const fulfilmentIdx = findCol(headers, 'fulfilment type', 'fulfillment type', 'order type', 'service type', 'fulfilment')

    // Collect all restaurant names for diagnostics
    for (const row of rows) {
      if (restaurantIdx >= 0) {
        const rname = row[restaurantIdx]?.trim() || ''
        if (rname) allRestaurantNamesSet.add(rname)
      }
    }

    const matchRow = buildSiteFilter(siteNameFilter, restaurantIdx, rows)

    // Find the matching row (prefer Delivery fulfilment type)
    let deliveryRow: string[] | null = null
    let firstMatchRow: string[] | null = null

    for (const row of rows) {
      if (!matchRow(row)) continue

      const fulfilment = fulfilmentIdx >= 0 ? row[fulfilmentIdx]?.trim().toLowerCase() || '' : ''
      if (fulfilment === 'delivery') {
        deliveryRow = row
      } else if (!firstMatchRow) {
        firstMatchRow = row
      }
    }

    const row = deliveryRow ?? firstMatchRow
    const empty: UberOrderHistoryResult = {
      restaurantName: siteNameFilter,
      confirmMins: 0, prepMins: 0, courierWaitMins: 0, avoidableWaitMins: 0, orderDurationMins: 0,
      cancelCount: 0, restaurantFaultCancels: 0, customerFaultCancels: 0, inaccurateOrderCount: 0,
      orderCount: 0, dailySales: [], allRestaurantNamesInFile: Array.from(allRestaurantNamesSet).sort(),
    }
    if (!row) return empty

    const restaurantName = restaurantIdx >= 0 ? row[restaurantIdx]?.trim() || siteNameFilter : siteNameFilter
    return {
      restaurantName,
      confirmMins: acceptAvgIdx >= 0 ? Math.round(parseNum(row[acceptAvgIdx]) * 100) / 100 : 0,
      prepMins: prepHandoffIdx >= 0 ? Math.round(parseNum(row[prepHandoffIdx]) * 100) / 100 : 0,
      courierWaitMins: courierWaitRestIdx >= 0 ? Math.round(parseNum(row[courierWaitRestIdx]) * 100) / 100 : 0,
      avoidableWaitMins: avoidableIdx >= 0 ? Math.round(parseNum(row[avoidableIdx]) * 100) / 100 : 0,
      orderDurationMins: durationIdx >= 0 ? Math.round(parseNum(row[durationIdx]) * 100) / 100 : 0,
      cancelCount: 0, restaurantFaultCancels: 0, customerFaultCancels: 0, inaccurateOrderCount: 0,
      orderCount: completedIdx >= 0 ? Math.round(parseNum(row[completedIdx])) : 0,
      dailySales: [],
      allRestaurantNamesInFile: Array.from(allRestaurantNamesSet).sort(),
    }
  }

  // V1: per-order format
  const statusIdx = findCol(headers, 'order status', 'status')
  const dateIdx = findCol(headers, 'order date', 'date ordered', 'date', 'order_date')
  const salesIdx = findCol(headers, 'sales (incl. vat)', 'ticket size', 'subtotal', 'gross sales', 'sales', 'amount')
  // confirmIdx: 'Time to confirm' (Loughton v1) or 'Time to accept (mins)' (standard v1)
  const confirmIdx = findCol(headers,
    'time to confirm', 'confirm time',
    'time to accept (mins)', 'time to accept', 'accept time', 'confirm time (mins)'
  )
  // prepIdx: 'Total prep & hand-off time' (Loughton v1, includes handoff) or standard prep columns
  const prepIdx = findCol(headers,
    'total prep & hand-off time', 'total prep and hand-off time',
    'prep time (mins)', 'original prep time (mins)', 'prep time', 'preparation time (mins)'
  )
  // courierWaitIdx: 'Courier waiting time (restaurant)' (Loughton v1) or standard columns
  const courierWaitIdx = findCol(headers,
    'courier waiting time',
    'courier wait time (mins)', 'courier wait (mins)', 'avg courier wait'
  )
  // avoidWaitIdx: 'Avoidable courier waiting time (restaurant)' (Loughton v1) or standard
  const avoidWaitIdx = findCol(headers,
    'avoidable courier waiting time',
    'avoidable courier wait (mins)', 'avoidable courier wait time (mins)', 'avoidable wait'
  )
  const durationIdx = findCol(headers, 'total order duration (mins)', 'order duration (mins)', 'order duration', 'total duration (mins)')
  const cancelCauseIdx = findCol(headers, 'cancellation cause', 'cancellation fault', 'cancel cause', 'cancelled by')
  const inaccurateIdx = findCol(headers, 'inaccurate order', 'order accuracy', 'inaccurate')

  const confirmNums: number[] = []
  const prepNums: number[] = []
  const courierWaitNums: number[] = []
  const avoidWaitNums: number[] = []
  const durationNums: number[] = []
  const dailyMap = new Map<string, { sales: number; orders: number }>()
  let cancelCount = 0
  let restaurantFaultCancels = 0
  let customerFaultCancels = 0
  let inaccurateCount = 0
  let orderCount = 0
  let restaurantName = siteNameFilter

  // Collect all restaurant names for diagnostics
  for (const row of rows) {
    if (restaurantIdx >= 0) {
      const rname = row[restaurantIdx]?.trim() || ''
      if (rname) allRestaurantNamesSet.add(rname)
    }
  }

  const matchRow = buildSiteFilter(siteNameFilter, restaurantIdx, rows)

  for (const row of rows) {
    if (restaurantIdx >= 0) {
      if (!matchRow(row)) continue
      const restaurant = row[restaurantIdx]?.trim() || ''
      if (restaurant && restaurantName === siteNameFilter) restaurantName = restaurant
    }

    const status = statusIdx >= 0 ? row[statusIdx]?.trim().toLowerCase() || '' : ''

    if (status === 'cancelled' || status === 'canceled') {
      cancelCount++
      const cause = cancelCauseIdx >= 0 ? row[cancelCauseIdx]?.trim().toLowerCase() || '' : ''
      if (cause.includes('restaurant') || cause.includes('store')) restaurantFaultCancels++
      else if (cause.includes('customer') || cause.includes('eater')) customerFaultCancels++
      continue
    }

    orderCount++

    if (dateIdx >= 0 && salesIdx >= 0) {
      const rawDate = row[dateIdx]?.trim() || ''
      const isoDate = parseDDMMYYYY(rawDate)
      const saleAmt = parseNum(row[salesIdx])
      if (isoDate && saleAmt >= 0) {
        const existing = dailyMap.get(isoDate) ?? { sales: 0, orders: 0 }
        existing.sales += saleAmt
        existing.orders += 1
        dailyMap.set(isoDate, existing)
      }
    }

    if (confirmIdx >= 0) { const v = parseNum(row[confirmIdx]); if (v > 0) confirmNums.push(v) }
    if (prepIdx >= 0) { const v = parseNum(row[prepIdx]); if (v > 0) prepNums.push(v) }
    if (courierWaitIdx >= 0) { const v = parseNum(row[courierWaitIdx]); if (v > 0) courierWaitNums.push(v) }
    if (avoidWaitIdx >= 0) { const v = parseNum(row[avoidWaitIdx]); if (v > 0) avoidWaitNums.push(v) }
    if (durationIdx >= 0) { const v = parseNum(row[durationIdx]); if (v > 0) durationNums.push(v) }
    if (inaccurateIdx >= 0) {
      const val = row[inaccurateIdx]?.trim().toLowerCase() || ''
      if (val === 'true' || val === 'yes' || val === '1') inaccurateCount++
    }
  }

  const dailySales = Array.from(dailyMap.entries()).map(([date, d]) => ({
    date,
    sales: Math.round(d.sales * 100) / 100,
    orders: d.orders,
  })).sort((a, b) => a.date.localeCompare(b.date))

  return {
    restaurantName,
    confirmMins: Math.round(avg(confirmNums) * 100) / 100,
    prepMins: Math.round(avg(prepNums) * 100) / 100,
    courierWaitMins: Math.round(avg(courierWaitNums) * 100) / 100,
    avoidableWaitMins: Math.round(avg(avoidWaitNums) * 100) / 100,
    orderDurationMins: Math.round(avg(durationNums) * 100) / 100,
    cancelCount, restaurantFaultCancels, customerFaultCancels,
    inaccurateOrderCount: inaccurateCount,
    orderCount, dailySales, allRestaurantNamesInFile: Array.from(allRestaurantNamesSet).sort(),
  }
}
