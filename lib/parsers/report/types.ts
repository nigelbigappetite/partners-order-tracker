import { BrandDefinition } from '@/lib/brands'

export interface WeeklyReportData {
  meta: {
    kitchenSlug: string
    weekStart: string
    weekEnd: string
    brandDef: BrandDefinition
  }
  snapshot: {
    grossSales: number
    orders: number
    aov: number
    wowGrossPct: number | null
    wowAovPct: number | null
    bestDay: string
    bestDayAmount: number
  }
  dailyRhythm: Array<{
    date: string
    uberSales: number
    deliverooSales: number
    jeSales: number
    uberOrders: number
    deliverooOrders: number
    jeOrders: number
  }>
  platforms: Array<{
    platform: 'uber_eats' | 'deliveroo' | 'just_eat'
    sales: number
    orders: number
    aov: number
    adSpend?: number
    roas?: number
  }>
  items: Array<{
    name: string
    platform: 'uber_eats' | 'deliveroo' | 'just_eat'
    qty: number
    sales: number
    category?: string
    isBundle?: boolean
    flagged?: string
  }>
  speed: {
    uber?: {
      confirmMins: number
      prepMins: number
      courierWaitMins: number
      avoidableWaitMins: number
      orderDurationMins: number
    }
    deliveroo?: {
      prepMins: number
      riderWaitMins: number
      riderWaitOver5Pct: number
      riderWaitOver10Pct: number
      orderDurationMins: number
      busyModePct: number
    }
  }
  reviews: {
    uber?: {
      rating: number
      ratingCount: number
      weekTheme?: string
      individualReviews?: Array<{
        ratingValue: number
        comment: string
        tags: string[]
        date: string
      }>
    }
    deliveroo?: {
      rating: number
      totalCount: number
      /** Average star rating (1–5) per day: Mon, Tue, Wed, Thu, Fri, Sat, Sun */
      dailyRatings?: Record<string, number>
      individualReviews?: Array<{
        ratingValue: number
        comment: string
        response?: string
      }>
    }
    adminNotes?: string
    flaggedItems: Array<{ item: string; issue: string }>
  }
  ads: {
    uber?: {
      spend: number
      revenue: number
      roas: number
      orders: number
      impressions?: number
      clicks?: number
      ctr?: number
      costPerOrder?: number
    }
    deliveroo?: {
      spend: number
      revenue: number
      roas: number
      orders: number
      viewRevenue?: number
      viewOrders?: number
      totalViews?: number
      totalClicks?: number
    }
    justEat?: {
      spend: number
      revenue: number
      roas: number
      orders: number
    }
  }
  cancellations: {
    count: number
    restaurantFault: number
    customerFault: number
  }
  inaccurateOrders: {
    count: number
  }
  conversion?: {
    shopViews?: number
    menuViews?: number
    addToCart?: number
    ordersPlaced?: number
  }
  offers?: {
    uber?: {
      ordersWithOffers: number
      offerTotal: number
    }
    deliveroo?: {
      ordersWithOffers: number
    }
  }
}

export type ReportFileType =
  | 'uber-sales-over-time'
  | 'uber-leaderboard'
  | 'uber-order-history'
  | 'uber-financials'
  | 'uber-ads'
  | 'uber-conversion'
  | 'uber-ratings-overall'
  | 'uber-ratings-sku'
  | 'deliveroo-orders'
  | 'deliveroo-items'
  | 'deliveroo-ads'
  | 'deliveroo-speed-prep'
  | 'deliveroo-speed-rider'
  | 'deliveroo-speed-duration'
  | 'deliveroo-speed-busy'
  | 'deliveroo-speed-summary'
  | 'deliveroo-customers'
  | 'just-eat-ads'
  | 'just-eat-pdf'
  | 'unknown'
  | 'zip-skip'

export interface ParsedFileResult {
  filename: string
  fileType: ReportFileType
  status: 'ok' | 'error' | 'skipped'
  error?: string
}

export interface ParsedReportFiles {
  kitchenSlug: string
  weekStart: string
  files: ParsedFileResult[]
  uberSalesOverTime?: UberSalesOverTimeResult
  uberLeaderboard?: UberLeaderboardItem[]
  uberOrderHistory?: UberOrderHistoryResult
  uberFinancials?: UberFinancialsResult
  uberAds?: UberAdsResult
  uberConversion?: UberConversionResult
  uberRatingsOverall?: UberRatingsOverallResult
  uberRatingsSku?: UberRatingsSkuItem[]
  deliverooOrders?: DeliverooOrdersResult
  deliverooItems?: DeliverooItemsItem[]
  deliverooAds?: DeliverooAdsResult
  deliverooSpeedPrep?: DeliverooSpeedPrepResult
  deliverooSpeedRider?: DeliverooSpeedRiderResult
  deliverooSpeedDuration?: DeliverooSpeedDurationResult
  deliverooSpeedBusy?: DeliverooSpeedBusyResult
  deliverooCustomers?: DeliverooCustomersResult
  justEatAds?: JustEatAdsResult
  justEatPdf?: JustEatPdfResult
}

export interface UberSalesOverTimeResult {
  days: Array<{ date: string; sales: number; orders: number }>
  thisPeriodTotal: number
  lastPeriodTotal: number
}

export interface UberLeaderboardItem {
  name: string
  sales: number
  qty: number
  category?: string
}

export interface UberOrderHistoryResult {
  restaurantName: string
  confirmMins: number
  prepMins: number
  courierWaitMins: number
  avoidableWaitMins: number
  orderDurationMins: number
  cancelCount: number
  restaurantFaultCancels: number
  customerFaultCancels: number
  inaccurateOrderCount: number
  orderCount: number
  dailySales: Array<{ date: string; sales: number; orders: number }>
  /** All unique restaurant names found in the CSV — used to diagnose filter mismatches */
  allRestaurantNamesInFile: string[]
}

export interface UberFinancialsResult {
  dailySales: Array<{ date: string; sales: number; orders: number }>
  totalSales: number
  totalOrders: number
  offerTotal: number
  ordersWithOffers: number
  /** All unique shop names found in the file — used to diagnose filter mismatches */
  allShopNamesInFile: string[]
}

export interface UberAdsResult {
  spend: number
  revenue: number
  roas: number
  orders: number
  impressions?: number
  clicks?: number
  ctr?: number
  costPerOrder?: number
}

export interface UberConversionResult {
  shopViews: number
  menuViews: number
  addToCart: number
  ordersPlaced: number
}

/** Structured Deliveroo review data entered manually by admin in Step 4 */
export interface DeliverooReviewInput {
  overallRating?: number
  totalReviews?: string
  /** Average star rating (1–5) per day: Mon, Tue, Wed, Thu, Fri, Sat, Sun */
  dailyRatings?: Record<string, number>
  reviews?: Array<{
    ratingValue: number
    comment: string
    response?: string
  }>
}

export interface UberReviewItem {
  ratingValue: number
  comment: string
  tags: string[]
  date: string
}

export interface UberRatingsOverallResult {
  rating: number
  ratingCount: number
  individualReviews: UberReviewItem[]
}

export interface UberRatingsSkuItem {
  name: string
  rating: number
  count: number
}

export interface DeliverooOrdersResult {
  days: Array<{ date: string; sales: number; orders: number }>
  totalSales: number
  totalOrders: number
}

export interface DeliverooItemsItem {
  name: string
  qty: number
  sales: number
}

export interface DeliverooAdsResult {
  spend: number
  clickRevenue: number
  clickOrders: number
  viewRevenue: number
  viewOrders: number
  totalViews: number
  totalClicks: number
  roas: number
}

export interface DeliverooSpeedPrepResult {
  avgPrepMins: number
}

export interface DeliverooSpeedRiderResult {
  avgRiderWaitMins: number
  over5Pct: number
  over10Pct: number
}

export interface DeliverooSpeedDurationResult {
  avgDurationMins: number
}

export interface DeliverooSpeedBusyResult {
  busyModePct: number
}

export interface DeliverooCustomersResult {
  newCount: number
  repeatCount: number
  frequentCount: number
  ordersWithOffers: number
}

export interface JustEatAdsResult {
  spend: number
  revenue: number
  roas: number
  orders: number
}

export interface JustEatPdfResult {
  grossSales: number
  orders: number
  netPayout: number
  commission: number
}
