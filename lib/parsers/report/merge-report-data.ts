import { WeeklyReportData, ParsedReportFiles, DeliverooReviewInput } from './types'
import { BrandDefinition } from '@/lib/brands'
import { KitchenSales } from '@/lib/types'
import { toLocalDateStr } from '@/lib/utils'

interface DeliverooDay {
  date: string
  grossSales: number
  orders: number
}

interface JustEatWeekData {
  grossSales: number
  orders: number
  netPayout: number
}

export function mergeReportData(
  parsedFiles: ParsedReportFiles,
  brandDef: BrandDefinition,
  weekStart: string,
  weekEnd: string,
  kitchenSalesThisWeek: KitchenSales[],
  kitchenSalesPriorWeek: KitchenSales[],
  deliverooData: DeliverooDay[],
  adminNotes?: string,
  jeData?: JustEatWeekData,
  deliverooReviewInput?: DeliverooReviewInput
): WeeklyReportData {
  const {
    uberSalesOverTime,
    uberLeaderboard = [],
    uberOrderHistory,
    uberFinancials,
    uberAds,
    uberConversion,
    uberRatingsOverall,
    uberRatingsSku = [],
    deliverooOrders,
    deliverooItems = [],
    deliverooAds,
    deliverooSpeedPrep,
    deliverooSpeedRider,
    deliverooSpeedDuration,
    deliverooSpeedBusy,
    deliverooCustomers,
    justEatAds,
    justEatPdf,
  } = parsedFiles

  // ── Build daily sales map ──────────────────────────────────────────────────
  const uberByDate = new Map<string, { sales: number; orders: number }>()
  const deliverooByDate = new Map<string, { sales: number; orders: number }>()
  const jeByDate = new Map<string, { sales: number; orders: number }>()

  // Uber daily: prefer sales-over-time CSV → order-history → financials report → kitchen_sales DB
  if (uberSalesOverTime?.days.length) {
    for (const d of uberSalesOverTime.days) {
      uberByDate.set(d.date, { sales: d.sales, orders: d.orders })
    }
  } else if (uberOrderHistory?.dailySales?.length) {
    for (const d of uberOrderHistory.dailySales) {
      uberByDate.set(d.date, { sales: d.sales, orders: d.orders })
    }
  } else if (uberFinancials?.dailySales?.length) {
    for (const d of uberFinancials.dailySales) {
      uberByDate.set(d.date, { sales: d.sales, orders: d.orders })
    }
  } else {
    for (const row of kitchenSalesThisWeek) {
      if (row.platform === 'uber_eats') {
        const existing = uberByDate.get(row.date) ?? { sales: 0, orders: 0 }
        existing.sales += row.grossSales
        existing.orders += row.count
        uberByDate.set(row.date, existing)
      }
    }
  }

  // Deliveroo daily from CSV or brain Supabase
  if (deliverooOrders?.days.length) {
    for (const d of deliverooOrders.days) {
      deliverooByDate.set(d.date, { sales: d.sales, orders: d.orders })
    }
  } else {
    for (const d of deliverooData) {
      if (d.date >= weekStart && d.date <= weekEnd) {
        deliverooByDate.set(d.date, { sales: d.grossSales, orders: d.orders })
      }
    }
  }

  // Generate 7-day list
  const startDate = new Date(weekStart + 'T12:00:00')
  const dailyRhythm: WeeklyReportData['dailyRhythm'] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const date = toLocalDateStr(d)
    const uber = uberByDate.get(date) ?? { sales: 0, orders: 0 }
    const del = deliverooByDate.get(date) ?? { sales: 0, orders: 0 }
    const je = jeByDate.get(date) ?? { sales: 0, orders: 0 }
    dailyRhythm.push({
      date,
      uberSales: Math.round(uber.sales * 100) / 100,
      deliverooSales: Math.round(del.sales * 100) / 100,
      jeSales: Math.round(je.sales * 100) / 100,
      uberOrders: uber.orders,
      deliverooOrders: del.orders,
      jeOrders: je.orders,
    })
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const uberTotalSales = dailyRhythm.reduce((s, d) => s + d.uberSales, 0)
  const delTotalSales = dailyRhythm.reduce((s, d) => s + d.deliverooSales, 0)

  // JE sales: from PDF or JE invoicing pull
  const jeTotalSales = justEatPdf?.grossSales ?? jeData?.grossSales ?? 0
  const jeOrders = justEatPdf?.orders ?? jeData?.orders ?? 0

  const uberOrdersFromRhythm = dailyRhythm.reduce((s, d) => s + d.uberOrders, 0)
  // V2 order history (weekly summary format) provides orderCount but no per-day rows,
  // so dailyRhythm has zero Uber orders. Fall back to the V2 weekly total.
  const uberOrders = uberOrdersFromRhythm > 0
    ? uberOrdersFromRhythm
    : (uberOrderHistory?.orderCount ?? 0)
  const delOrders = dailyRhythm.reduce((s, d) => s + d.deliverooOrders, 0)

  const grossSales = Math.round((uberTotalSales + delTotalSales + jeTotalSales) * 100) / 100
  const orders = uberOrders + delOrders + jeOrders
  const aov = orders > 0 ? Math.round((grossSales / orders) * 100) / 100 : 0

  // ── WoW ───────────────────────────────────────────────────────────────────
  const priorGross = kitchenSalesPriorWeek.reduce((s, r) => s + r.grossSales, 0)
  const priorOrders = kitchenSalesPriorWeek.reduce((s, r) => s + r.count, 0)
  const priorAov = priorOrders > 0 ? priorGross / priorOrders : 0

  // Also consider uberSalesOverTime lastPeriodTotal if no prior week data
  const priorGrossActual = priorGross > 0 ? priorGross : (uberSalesOverTime?.lastPeriodTotal ?? 0)

  const wowGrossPct = priorGrossActual > 0
    ? Math.round(((grossSales - priorGrossActual) / priorGrossActual) * 10000) / 100
    : null
  const wowAovPct = priorAov > 0
    ? Math.round(((aov - priorAov) / priorAov) * 10000) / 100
    : null

  // ── Best day ──────────────────────────────────────────────────────────────
  const bestDay = dailyRhythm.reduce((best, d) => {
    const total = d.uberSales + d.deliverooSales + d.jeSales
    const bestTotal = best.uberSales + best.deliverooSales + best.jeSales
    return total > bestTotal ? d : best
  }, dailyRhythm[0] ?? { date: weekStart, uberSales: 0, deliverooSales: 0, jeSales: 0, uberOrders: 0, deliverooOrders: 0, jeOrders: 0 })
  const bestDayAmount = Math.round((bestDay.uberSales + bestDay.deliverooSales + bestDay.jeSales) * 100) / 100

  // ── Platforms ─────────────────────────────────────────────────────────────
  const platforms: WeeklyReportData['platforms'] = []
  if (uberTotalSales > 0 || uberOrders > 0) {
    platforms.push({
      platform: 'uber_eats',
      sales: Math.round(uberTotalSales * 100) / 100,
      orders: uberOrders,
      aov: uberOrders > 0 ? Math.round((uberTotalSales / uberOrders) * 100) / 100 : 0,
      adSpend: uberAds?.spend,
      roas: uberAds?.roas,
    })
  }
  if (delTotalSales > 0 || delOrders > 0) {
    platforms.push({
      platform: 'deliveroo',
      sales: Math.round(delTotalSales * 100) / 100,
      orders: delOrders,
      aov: delOrders > 0 ? Math.round((delTotalSales / delOrders) * 100) / 100 : 0,
      adSpend: deliverooAds?.spend,
      roas: deliverooAds?.roas,
    })
  }
  if (jeTotalSales > 0 || jeOrders > 0) {
    platforms.push({
      platform: 'just_eat',
      sales: Math.round(jeTotalSales * 100) / 100,
      orders: jeOrders,
      aov: jeOrders > 0 ? Math.round((jeTotalSales / jeOrders) * 100) / 100 : 0,
      adSpend: justEatAds?.spend,
      roas: justEatAds?.roas,
    })
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  // Get SKU ratings for flagging
  const flaggedSkus = new Map<string, string>()
  for (const sku of uberRatingsSku) {
    if (sku.rating < 3 && sku.count > 0) {
      flaggedSkus.set(sku.name.toLowerCase(), `${sku.rating}★ item rating`)
    }
  }

  const items: WeeklyReportData['items'] = []
  for (const item of uberLeaderboard.slice(0, 8)) {
    const isBundle = /bundle|combo|deal|set/i.test(item.name)
    const flagged = flaggedSkus.get(item.name.toLowerCase())
    items.push({
      name: item.name,
      platform: 'uber_eats',
      qty: item.qty,
      sales: item.sales,
      category: item.category,
      isBundle,
      flagged,
    })
  }
  for (const item of deliverooItems.slice(0, 5)) {
    items.push({
      name: item.name,
      platform: 'deliveroo',
      qty: item.qty,
      sales: item.sales,
    })
  }

  // ── Speed ─────────────────────────────────────────────────────────────────
  const speed: WeeklyReportData['speed'] = {}
  if (uberOrderHistory) {
    speed.uber = {
      confirmMins: uberOrderHistory.confirmMins,
      prepMins: uberOrderHistory.prepMins,
      courierWaitMins: uberOrderHistory.courierWaitMins,
      avoidableWaitMins: uberOrderHistory.avoidableWaitMins,
      orderDurationMins: uberOrderHistory.orderDurationMins,
    }
  }
  if (deliverooSpeedPrep || deliverooSpeedRider || deliverooSpeedDuration || deliverooSpeedBusy) {
    speed.deliveroo = {
      prepMins: deliverooSpeedPrep?.avgPrepMins ?? 0,
      riderWaitMins: deliverooSpeedRider?.avgRiderWaitMins ?? 0,
      riderWaitOver5Pct: deliverooSpeedRider?.over5Pct ?? 0,
      riderWaitOver10Pct: deliverooSpeedRider?.over10Pct ?? 0,
      orderDurationMins: deliverooSpeedDuration?.avgDurationMins ?? 0,
      busyModePct: deliverooSpeedBusy?.busyModePct ?? 0,
    }
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  const flaggedItems: WeeklyReportData['reviews']['flaggedItems'] = []
  for (const sku of uberRatingsSku) {
    if (sku.rating < 3) {
      flaggedItems.push({ item: sku.name, issue: `Uber item rating: ${sku.rating}★ (${sku.count} reviews)` })
    }
  }

  // Deliveroo: populate from structured manual input if provided
  const deliverooReview: WeeklyReportData['reviews']['deliveroo'] =
    deliverooReviewInput?.overallRating
      ? {
          rating: deliverooReviewInput.overallRating,
          totalCount: parseInt(deliverooReviewInput.totalReviews ?? '0') || 0,
          dailyRatings: deliverooReviewInput.dailyRatings,
          individualReviews: deliverooReviewInput.reviews?.filter(r => r.comment || r.ratingValue > 0),
        }
      : undefined

  const reviews: WeeklyReportData['reviews'] = {
    uber: uberRatingsOverall ? {
      rating: uberRatingsOverall.rating,
      ratingCount: uberRatingsOverall.ratingCount,
      individualReviews: uberRatingsOverall.individualReviews?.length
        ? uberRatingsOverall.individualReviews
        : undefined,
    } : undefined,
    deliveroo: deliverooReview,
    adminNotes,
    flaggedItems,
  }

  // ── Ads ───────────────────────────────────────────────────────────────────
  const ads: WeeklyReportData['ads'] = {}
  if (uberAds) ads.uber = { ...uberAds }
  if (deliverooAds) {
    ads.deliveroo = {
      spend: deliverooAds.spend,
      revenue: deliverooAds.clickRevenue + deliverooAds.viewRevenue,
      roas: deliverooAds.roas,
      orders: deliverooAds.clickOrders + deliverooAds.viewOrders,
      viewRevenue: deliverooAds.viewRevenue,
      viewOrders: deliverooAds.viewOrders,
      totalViews: deliverooAds.totalViews,
      totalClicks: deliverooAds.totalClicks,
    }
  }
  if (justEatAds && (jeTotalSales > 0 || jeOrders > 0)) ads.justEat = { ...justEatAds }

  // ── Cancellations ─────────────────────────────────────────────────────────
  const cancellations = {
    count: uberOrderHistory?.cancelCount ?? 0,
    restaurantFault: uberOrderHistory?.restaurantFaultCancels ?? 0,
    customerFault: uberOrderHistory?.customerFaultCancels ?? 0,
  }
  const inaccurateOrders = { count: uberOrderHistory?.inaccurateOrderCount ?? 0 }

  // ── Conversion ────────────────────────────────────────────────────────────
  const conversion = uberConversion ? { ...uberConversion } : undefined

  // ── Offers ────────────────────────────────────────────────────────────────
  const offers: WeeklyReportData['offers'] = {}
  if (uberFinancials && uberFinancials.ordersWithOffers > 0) {
    offers.uber = {
      ordersWithOffers: uberFinancials.ordersWithOffers,
      offerTotal: uberFinancials.offerTotal,
    }
  }
  if (deliverooCustomers && deliverooCustomers.ordersWithOffers > 0) {
    offers.deliveroo = { ordersWithOffers: deliverooCustomers.ordersWithOffers }
  }

  return {
    meta: { kitchenSlug: parsedFiles.kitchenSlug, weekStart, weekEnd, brandDef },
    snapshot: { grossSales, orders, aov, wowGrossPct, wowAovPct, bestDay: bestDay.date, bestDayAmount },
    dailyRhythm,
    platforms,
    items,
    speed,
    reviews,
    ads,
    cancellations,
    inaccurateOrders,
    conversion,
    offers: (offers.uber || offers.deliveroo) ? offers : undefined,
  }
}
