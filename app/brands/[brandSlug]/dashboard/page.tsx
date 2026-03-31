'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import KPICard from '@/components/KPICard'
import DateRangePicker from '@/components/locations/DateRangePicker'
import { Order, KPIMetric, KitchenSales, OrderLine } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'
import BrandLogoCell from '@/components/BrandLogoCell'
import { ArrowRight, ChevronUp, ChevronDown, Package, TrendingUp } from 'lucide-react'
import { getCanonicalBrandSlug, getBrandDisplayName } from '@/lib/brands'
import { isAllTimeRange } from '@/components/locations/DateRangePicker'
import { applyOrderLineOverrides } from '@/lib/order-line-overrides'

type BrandSortField = 'name' | 'ordersCount' | 'totalRevenue' | 'grossProfit' | 'grossMargin' | 'lastOrderDate'

function formatCurrencyTwoDecimals(value: number): string {
  return `£${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function BrandDashboard() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const [brandName, setBrandName] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [sales, setSales] = useState<KitchenSales[]>([])
  const [previousSales, setPreviousSales] = useState<KitchenSales[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [salesLoading, setSalesLoading] = useState(true)
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState(() => ({
    start: new Date(0),
    end: new Date(),
  }))
  const [sortField, setSortField] = useState<BrandSortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [adminTableMode, setAdminTableMode] = useState<'supply' | 'kitchen'>('supply')
  const [brandTableMode, setBrandTableMode] = useState<'kitchen' | 'supply'>('kitchen')
  const isAdmin = brandSlug.toLowerCase() === 'admin'
  // All brands present in orders (for admin filter dropdown)
  const uniqueBrands = useMemo(
    () => Array.from(new Set(orders.map((o) => (o.brand || '').trim()).filter(Boolean))).sort(),
    [orders]
  )

  useEffect(() => {
    fetchBrandName()
    fetchOrders()
  }, [brandSlug, brandFilter, dateRange])

  useEffect(() => {
    if (!isAdmin) {
      fetchOrderLines()
    }
  }, [isAdmin])

  useEffect(() => {
    fetchSales()
  }, [brandSlug, dateRange, isAdmin, brandFilter])

  const fetchBrandName = async () => {
    try {
      const canonicalName = getBrandDisplayName(brandSlug)
      if (canonicalName) {
        setBrandName(canonicalName)
        return
      }

      const response = await fetch(`/api/brands/${brandSlug}/name`)
      if (response.ok) {
        const data = await response.json()
        setBrandName(data.brandName || brandSlug)
      }
    } catch (error) {
      console.error('Error fetching brand name:', error)
      setBrandName(brandSlug)
    }
  }

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true)
      const canonicalBrandSlug = isAdmin
        ? brandFilter === 'all'
          ? 'admin'
          : getCanonicalBrandSlug(brandFilter) ?? brandFilter
        : getCanonicalBrandSlug(brandSlug) ?? brandSlug
      const canonicalBrandName = getBrandDisplayName(brandSlug) ?? (brandName || brandSlug)

      if (!brandName && canonicalBrandName) {
        setBrandName(canonicalBrandName)
      }
      
      // For admin, pass "admin" which will be ignored by API (shows all orders)
      const brandParam = isAdmin ? 'admin' : canonicalBrandSlug
      console.log(`[BrandDashboard] Fetching orders for brand: "${brandParam}" (slug: "${brandSlug}")`)
      const response = await fetch(`/api/orders?brand=${encodeURIComponent(brandParam)}`)
      if (response.ok) {
        const data = await response.json()
        const ordersData = Array.isArray(data) ? data : []
        console.log(`[BrandDashboard] Received ${ordersData.length} orders from API`)
        
        const processedOrders = ordersData.map((order: any) => {
          if (!order.daysOpen && order.orderDate) {
            try {
              const orderDate = new Date(order.orderDate)
              const today = new Date()
              const diffTime = Math.abs(today.getTime() - orderDate.getTime())
              order.daysOpen = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            } catch (e) {
              order.daysOpen = 0
            }
          }
          
          return {
            ...order,
            daysOpen: order.daysOpen || 0,
            nextAction: order.nextAction || '',
            orderTotal: order.orderTotal || order['Total Order Value'] || 0,
            franchisee: order.franchisee || order['Franchisee Name'] || order['Franchisee Code'] || '',
          }
        })
        
        // Add client-side filtering as safety measure (especially for non-admin)
        // This ensures only orders matching the brand are shown, even if API returns incorrect data
        let filteredOrders = processedOrders
        if (!isAdmin) {
          console.log(`[BrandDashboard] Filtering orders - expected canonical slug: "${canonicalBrandSlug}"`)
          
          filteredOrders = processedOrders.filter((order: any) => {
            const orderBrandSlug = getCanonicalBrandSlug(order.brand)
            const matches = orderBrandSlug === canonicalBrandSlug
            
            // Log all orders for debugging
            console.log(`[BrandDashboard] Order ${order.orderId || order.invoiceNo}: brand="${order.brand}" (canonical: "${orderBrandSlug}") - ${matches ? 'MATCH' : 'FILTERED OUT'}`)
            
            return matches
          })
          
          console.log(`[BrandDashboard] After filtering: ${filteredOrders.length} orders match brand "${canonicalBrandSlug}"`)
        }
        
        setOrders(filteredOrders)
      }
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setOrdersLoading(false)
    }
  }

  const fetchSales = async () => {
    try {
      setSalesLoading(true)
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      const canonicalBrandSlug = getCanonicalBrandSlug(brandSlug) ?? brandSlug
      const allTime = isAllTimeRange(dateRange.start, dateRange.end)

      const currentRequest = fetch(
        `/api/sales?startDate=${startDate}&endDate=${endDate}&brand=${encodeURIComponent(canonicalBrandSlug)}`
      )

      if (allTime) {
        const response = await currentRequest

        if (!response.ok) {
          throw new Error('Failed to load sales')
        }

        const data = await response.json()
        setSales(data.sales || [])
        setPreviousSales([])
        return
      }

      const startOnly = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate())
      const endOnly = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate())
      const periodDays = Math.max(1, Math.round((endOnly.getTime() - startOnly.getTime()) / (24 * 60 * 60 * 1000)) + 1)
      const previousEnd = new Date(startOnly)
      previousEnd.setDate(previousEnd.getDate() - 1)
      const previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - (periodDays - 1))

      const previousRequest = fetch(
        `/api/sales?startDate=${previousStart.toISOString().split('T')[0]}&endDate=${previousEnd.toISOString().split('T')[0]}&brand=${encodeURIComponent(canonicalBrandSlug)}`
      )

      const [response, previousResponse] = await Promise.all([currentRequest, previousRequest])

      if (!response.ok || !previousResponse.ok) {
        throw new Error('Failed to load sales')
      }

      const data = await response.json()
      const previousData = await previousResponse.json()
      setSales(data.sales || [])
      setPreviousSales(previousData.sales || [])
    } catch (error) {
      toast.error('Failed to load sales')
    } finally {
      setSalesLoading(false)
    }
  }

  const fetchOrderLines = async () => {
    try {
      const response = await fetch('/api/order-lines')
      if (!response.ok) {
        throw new Error('Failed to load order lines')
      }

      const data = await response.json()
      setOrderLines(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching order lines:', error)
    }
  }

  const correctedOrders = useMemo(
    () => (isAdmin ? orders : applyOrderLineOverrides(orders, orderLines)),
    [isAdmin, orders, orderLines]
  )

  // Filter orders — brand + date range (admin only for brand/date; non-admin already pre-filtered)
    const filteredOrders = useMemo(() => {
    let result = correctedOrders

    if (isAdmin) {
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      result = result.filter((o) => o.orderDate >= startDate && o.orderDate <= endDate)
    } else {
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      result = result.filter((o) => o.orderDate >= startDate && o.orderDate <= endDate)
    }

    return result
  }, [correctedOrders, dateRange, isAdmin])

  // Per-brand summary table (admin only)
  const brandSummaries = useMemo(() => {
    if (!isAdmin) return []
    const map: Record<string, { revenue: number; cogs: number; orders: number; lastOrderDate: string }> = {}
    filteredOrders.forEach((o) => {
      const b = (o.brand || '').trim()
      if (!b) return
      if (!map[b]) map[b] = { revenue: 0, cogs: 0, orders: 0, lastOrderDate: '' }
      map[b].revenue += Number(o.orderTotal) || 0
      map[b].cogs += Number(o.totalCOGS) || 0
      map[b].orders += 1
      if (o.orderDate && o.orderDate > map[b].lastOrderDate) map[b].lastOrderDate = o.orderDate
    })
    return Object.entries(map).map(([brand, d]) => ({
      brand,
      revenue: d.revenue,
      cogs: d.cogs,
      grossProfit: d.revenue - d.cogs,
      grossMargin: d.revenue > 0 ? ((d.revenue - d.cogs) / d.revenue) * 100 : 0,
      orders: d.orders,
      lastOrderDate: d.lastOrderDate,
    }))
  }, [filteredOrders, isAdmin])

  const kitchenBrandSummaries = useMemo(() => {
    if (!isAdmin) return []
    const latestSalesDate = sales.reduce<Date | null>((latest, sale) => {
      if (!sale.date) return latest
      const saleDate = new Date(`${sale.date}T00:00:00`)
      if (Number.isNaN(saleDate.getTime())) return latest
      if (!latest || saleDate > latest) return saleDate
      return latest
    }, null)
    const activeKitchenThreshold = latestSalesDate ? new Date(latestSalesDate) : new Date()
    activeKitchenThreshold.setDate(activeKitchenThreshold.getDate() - 30)

    const map: Record<
      string,
      { revenue: number; orders: number; locations: Set<string>; activeLocations30d: Set<string>; lastSaleDate: string }
    > = {}

    sales.forEach((sale) => {
      const brand = (sale.brandName || sale.brandSlug || '').trim()
      if (!brand) return
      if (!map[brand]) {
        map[brand] = {
          revenue: 0,
          orders: 0,
          locations: new Set<string>(),
          activeLocations30d: new Set<string>(),
          lastSaleDate: '',
        }
      }
      map[brand].revenue += Number(sale.revenue) || 0
      map[brand].orders += Number(sale.count) || 0
      if (sale.location) {
        map[brand].locations.add(sale.location)
        if (sale.date) {
          const saleDate = new Date(`${sale.date}T00:00:00`)
          if (!Number.isNaN(saleDate.getTime()) && saleDate >= activeKitchenThreshold) {
            map[brand].activeLocations30d.add(sale.location)
          }
        }
      }
      if (sale.date && sale.date > map[brand].lastSaleDate) {
        map[brand].lastSaleDate = sale.date
      }
    })

    return Object.entries(map).map(([brand, data]) => {
      const estimatedGp = data.revenue * 0.039
      return {
        brand,
        revenue: data.revenue,
        orders: data.orders,
        activeKitchens: data.activeLocations30d.size,
        averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
        estimatedGp,
        estimatedGpMargin: data.revenue > 0 ? (estimatedGp / data.revenue) * 100 : 0,
        lastSaleDate: data.lastSaleDate,
      }
    })
  }, [sales, isAdmin])

  const handleBrandSort = (field: BrandSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedBrandSummaries = [...brandSummaries].sort((a, b) => {
    const aVal: any = sortField === 'name' ? a.brand : sortField === 'ordersCount' ? a.orders : sortField === 'lastOrderDate' ? a.lastOrderDate : (a as any)[sortField]
    const bVal: any = sortField === 'name' ? b.brand : sortField === 'ordersCount' ? b.orders : sortField === 'lastOrderDate' ? b.lastOrderDate : (b as any)[sortField]
    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1
    if (typeof aVal === 'number' && typeof bVal === 'number') return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    return sortDirection === 'asc' ? (aStr < bStr ? -1 : aStr > bStr ? 1 : 0) : (aStr > bStr ? -1 : aStr < bStr ? 1 : 0)
  })

  const SortIcon = ({ field }: { field: BrandSortField }) => {
    if (sortField !== field) return <ChevronUp className="ml-1 h-3 w-3 opacity-30" />
    return sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
  }

  // Calculate metrics from filtered orders
  const productRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.orderTotal) || 0), 0)
  const totalCOGS = filteredOrders.reduce((sum, o) => sum + (Number(o.totalCOGS) || 0), 0)
  const grossProfit = productRevenue - totalCOGS
  const grossMargin = productRevenue > 0 ? (grossProfit / productRevenue) * 100 : 0
  const kitchenRevenue = sales.reduce((sum, s) => sum + s.revenue, 0)
  const kitchenOrders = sales.reduce((sum, s) => sum + s.count, 0)
  const kitchenAOV = kitchenOrders > 0 ? kitchenRevenue / kitchenOrders : 0
  const estimatedKitchenGP = kitchenRevenue * 0.039
  const estimatedKitchenGPPct = kitchenRevenue > 0 ? (estimatedKitchenGP / kitchenRevenue) * 100 : 0
  const productOrders = filteredOrders.length
  const supplierOrders = filteredOrders.filter((order) => order.supplierOrdered).length
  const supplyOrders = filteredOrders.length
  const productOrderAOV = productOrders > 0 ? productRevenue / productOrders : 0
  const totalBrandRevenue = kitchenRevenue + productRevenue
  const estimatedTotalGrossProfit = estimatedKitchenGP + grossProfit
  const estimatedTotalGrossMargin = totalBrandRevenue > 0 ? (estimatedTotalGrossProfit / totalBrandRevenue) * 100 : 0
  const hasComparablePeriod = !isAdmin && !isAllTimeRange(dateRange.start, dateRange.end)
  const startDateOnly = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate())
  const endDateOnly = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate())
  const periodDays = Math.max(1, Math.round((endDateOnly.getTime() - startDateOnly.getTime()) / (24 * 60 * 60 * 1000)) + 1)
  const previousEndDateOnly = new Date(startDateOnly)
  previousEndDateOnly.setDate(previousEndDateOnly.getDate() - 1)
  const previousStartDateOnly = new Date(previousEndDateOnly)
  previousStartDateOnly.setDate(previousStartDateOnly.getDate() - (periodDays - 1))
  const previousOrders = hasComparablePeriod
    ? correctedOrders.filter((o) => o.orderDate >= previousStartDateOnly.toISOString().split('T')[0] && o.orderDate <= previousEndDateOnly.toISOString().split('T')[0])
    : []
  const previousProductRevenue = previousOrders.reduce((sum, o) => sum + (Number(o.orderTotal) || 0), 0)
  const previousProductCOGS = previousOrders.reduce((sum, o) => sum + (Number(o.totalCOGS) || 0), 0)
  const previousProductProfit = previousProductRevenue - previousProductCOGS
  const previousProductOrders = previousOrders.length
  const previousSupplierOrders = previousOrders.filter((order) => order.supplierOrdered).length
  const previousProductAOV = previousProductOrders > 0 ? previousProductRevenue / previousProductOrders : 0
  const previousProductMargin = previousProductRevenue > 0 ? (previousProductProfit / previousProductRevenue) * 100 : 0
  const previousKitchenRevenue = previousSales.reduce((sum, s) => sum + s.revenue, 0)
  const previousTotalBrandRevenue = previousKitchenRevenue + previousProductRevenue
  const previousKitchenOrders = previousSales.reduce((sum, s) => sum + s.count, 0)
  const previousKitchenAOV = previousKitchenOrders > 0 ? previousKitchenRevenue / previousKitchenOrders : 0
  const previousEstimatedKitchenGP = previousKitchenRevenue * 0.039
  const previousEstimatedKitchenGPPct = previousKitchenRevenue > 0 ? (previousEstimatedKitchenGP / previousKitchenRevenue) * 100 : 0
  const loading = ordersLoading || salesLoading
  const kitchenRevenueShare = totalBrandRevenue > 0 ? (kitchenRevenue / totalBrandRevenue) * 100 : 0
  const productRevenueShare = totalBrandRevenue > 0 ? (productRevenue / totalBrandRevenue) * 100 : 0
  const revenueSplitStyle = {
    background: `conic-gradient(#2563eb 0% ${kitchenRevenueShare}%, #f97316 ${kitchenRevenueShare}% 100%)`,
  }

  const getTrend = (current: number, previous: number) => {
    if (!hasComparablePeriod) {
      return { trendLabel: 'All time', trendDirection: 'neutral' as const }
    }
    if (previous === 0 && current === 0) {
      return { trendLabel: 'No change vs previous period', trendDirection: 'neutral' as const }
    }
    if (previous === 0) {
      return { trendLabel: 'New vs previous period', trendDirection: 'up' as const }
    }
    const deltaPct = ((current - previous) / previous) * 100
    const direction = deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'neutral'
    return {
      trendLabel: `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs previous period`,
      trendDirection: direction as 'up' | 'down' | 'neutral',
    }
  }

  const brandKitchenRows = useMemo(
    () =>
      [...sales]
        .sort((a, b) => b.date.localeCompare(a.date) || a.location.localeCompare(b.location))
        .slice(0, 12),
    [sales]
  )

  const brandSupplyRows = useMemo(
    () =>
      [...filteredOrders]
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
        .slice(0, 12),
    [filteredOrders]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAdmin ? <Navigation /> : <BrandNavigation brandSlug={brandSlug} brandName={brandName} />}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading from Hungry Tum OS</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? <Navigation /> : <BrandNavigation brandSlug={brandSlug} brandName={brandName} />}
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">
        <div className="mb-4 xs:mb-6 sm:mb-8">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">{isAdmin ? 'Admin Dashboard' : `${brandName} Dashboard`}</h1>
        </div>

        {!isAdmin && (
          <div className="mb-6 xs:mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-700">Date Range</div>
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onChange={(start, end) => setDateRange({ start, end })}
            />
          </div>
        )}

        {/* Admin filters + brand cards */}
        {isAdmin && (
          <>
            <div className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="w-full lg:max-w-[220px]">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Brand
                  </label>
                  <select
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="all">All Brands</option>
                    {uniqueBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full lg:flex-1">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date Range
                  </label>
                  <DateRangePicker
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onChange={(start, end) => setDateRange({ start, end })}
                  />
                </div>
              </div>
            </div>
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Operations Overview</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                  {formatCurrencyTwoDecimals(totalBrandRevenue)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">Total business revenue across kitchen sales and supply orders</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <KPICard
                    metric={{
                      label: 'Kitchen Revenue',
                      value: formatCurrencyNoDecimals(kitchenRevenue),
                    }}
                  />
                  <KPICard
                    metric={{
                      label: 'Supply Revenue',
                      value: formatCurrencyNoDecimals(productRevenue),
                    }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Revenue Split</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-24 flex-shrink-0 rounded-full" style={revenueSplitStyle}>
                        <div className="absolute inset-4 rounded-full bg-white" />
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">Kitchen Sales</p>
                            <p className="text-gray-500">{formatCurrencyTwoDecimals(kitchenRevenue)} · {kitchenRevenueShare.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                          <div>
                            <p className="font-medium text-gray-900">Supply Orders</p>
                            <p className="text-gray-500">{formatCurrencyTwoDecimals(productRevenue)} · {productRevenueShare.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Link
                      href="/locations"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                    >
                      <span>Open Supply Orders</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </Link>
                    <Link
                      href="/admin/sales"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                    >
                      <span>Open Sales Management</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}

        {isAdmin ? (
          <div className="mb-3 xs:mb-4 sm:mb-6 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 lg:grid-cols-4">
            <KPICard
              metric={{
                label: 'Total Kitchen Orders',
                value: kitchenOrders.toLocaleString(),
              }}
            />
            <KPICard
              metric={{
                label: 'Total Supply Orders',
                value: supplyOrders.toLocaleString(),
              }}
            />
            <KPICard
              metric={{
                label: 'Estimated Total Gross Profit',
                value: formatCurrencyNoDecimals(estimatedTotalGrossProfit),
              }}
            />
            <KPICard
              metric={{
                label: 'Estimated Total Gross Margin',
                value: `${Number(estimatedTotalGrossMargin).toFixed(1)}%`,
              }}
            />
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Brand Gross Revenue</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                    {formatCurrencyTwoDecimals(totalBrandRevenue)}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">{getTrend(totalBrandRevenue, previousTotalBrandRevenue).trendLabel}</p>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="grid grid-cols-2 gap-3">
                  <KPICard metric={{ label: 'Kitchen Revenue', value: formatCurrencyTwoDecimals(kitchenRevenue), ...getTrend(kitchenRevenue, previousKitchenRevenue) }} />
                  <KPICard metric={{ label: 'Supply Revenue', value: formatCurrencyTwoDecimals(productRevenue), ...getTrend(productRevenue, previousProductRevenue) }} />
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Revenue Split</h3>
                    </div>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 rounded-full" style={revenueSplitStyle}>
                      <div className="absolute inset-4 rounded-full bg-white" />
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">Kitchen Sales</p>
                          <p className="text-gray-500">{formatCurrencyTwoDecimals(kitchenRevenue)} · {kitchenRevenueShare.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                        <div>
                          <p className="font-medium text-gray-900">Supply Orders</p>
                          <p className="text-gray-500">{formatCurrencyTwoDecimals(productRevenue)} · {productRevenueShare.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Sales</h2>
                </div>
                <Link
                  href={`/brands/${brandSlug}/sales`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  <span>View details</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="col-span-2">
                  <KPICard metric={{ label: 'Kitchen Revenue', value: formatCurrencyTwoDecimals(kitchenRevenue), ...getTrend(kitchenRevenue, previousKitchenRevenue) }} />
                </div>
                <KPICard metric={{ label: 'Kitchen Orders', value: kitchenOrders.toLocaleString(), ...getTrend(kitchenOrders, previousKitchenOrders) }} />
                <KPICard metric={{ label: 'Kitchen Order AOV', value: formatCurrencyTwoDecimals(kitchenAOV), ...getTrend(kitchenAOV, previousKitchenAOV) }} />
                <KPICard metric={{ label: 'Estimated GP %', value: `${estimatedKitchenGPPct.toFixed(1)}%`, ...getTrend(estimatedKitchenGPPct, previousEstimatedKitchenGPPct) }} />
                <KPICard metric={{ label: 'Estimated GP £', value: formatCurrencyTwoDecimals(estimatedKitchenGP), ...getTrend(estimatedKitchenGP, previousEstimatedKitchenGP) }} />
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Supply Orders</h2>
                </div>
                <Link
                  href={`/brands/${brandSlug}/orders`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  <span>View details</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="col-span-2">
                  <KPICard metric={{ label: 'Supply Revenue', value: formatCurrencyTwoDecimals(productRevenue), ...getTrend(productRevenue, previousProductRevenue) }} />
                </div>
                <KPICard metric={{ label: 'Supply Orders', value: supplierOrders.toLocaleString(), ...getTrend(supplierOrders, previousSupplierOrders) }} />
                <KPICard metric={{ label: 'Supply Order AOV', value: formatCurrencyTwoDecimals(productOrderAOV), ...getTrend(productOrderAOV, previousProductAOV) }} />
                <KPICard metric={{ label: 'GP %', value: `${grossMargin.toFixed(1)}%`, ...getTrend(grossMargin, previousProductMargin) }} />
                <KPICard metric={{ label: 'GP £', value: formatCurrencyTwoDecimals(grossProfit), ...getTrend(grossProfit, previousProductProfit) }} />
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Performance Detail</h2>
                  <p className="mt-1 text-sm text-gray-500">Quick drilldown for kitchen sales and supply orders.</p>
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                  <button
                    onClick={() => setBrandTableMode('kitchen')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      brandTableMode === 'kitchen' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Kitchen Sales
                  </button>
                  <button
                    onClick={() => setBrandTableMode('supply')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      brandTableMode === 'supply' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Supply Orders
                  </button>
                </div>
              </div>

              {brandTableMode === 'kitchen' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Revenue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Orders</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">AOV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {brandKitchenRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                            No kitchen sales found
                          </td>
                        </tr>
                      ) : (
                        brandKitchenRows.map((row) => (
                          <tr key={`${row.date}-${row.location}`} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{row.date}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.location}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatCurrencyTwoDecimals(row.revenue)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{row.count}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatCurrencyTwoDecimals(row.averageOrderValue || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Franchise</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">GP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {brandSupplyRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                            No supply orders found
                          </td>
                        </tr>
                      ) : (
                        brandSupplyRows.map((row) => {
                          const rowGrossProfit =
                            typeof row.grossProfit === 'number'
                              ? row.grossProfit
                              : (Number(row.orderTotal) || 0) - (Number(row.totalCOGS) || 0)

                          return (
                            <tr key={row.invoiceNo || row.orderId} className="hover:bg-gray-50">
                              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{row.orderDate}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{row.franchisee}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatCurrencyTwoDecimals(Number(row.orderTotal) || 0)}</td>
                              <td className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${rowGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyTwoDecimals(rowGrossProfit)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Brands Table (admin only) */}
        {isAdmin && (
          <div className="mt-6 sm:mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Brands</h2>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                  <button
                    onClick={() => setAdminTableMode('supply')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      adminTableMode === 'supply' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Supply Orders
                  </button>
                  <button
                    onClick={() => setAdminTableMode('kitchen')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      adminTableMode === 'kitchen' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Kitchen Sales
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                {adminTableMode === 'supply' ? sortedBrandSummaries.length : kitchenBrandSummaries.length} brands
              </p>
            </div>
            {adminTableMode === 'supply' && sortedBrandSummaries.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
                No data found
              </div>
            ) : adminTableMode === 'kitchen' && kitchenBrandSummaries.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
                No data found
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                {adminTableMode === 'supply' ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {([
                          { field: 'name' as BrandSortField, label: 'Brand' },
                          { field: 'ordersCount' as BrandSortField, label: 'Supply Orders' },
                          { field: 'totalRevenue' as BrandSortField, label: 'Supply Revenue' },
                          { field: 'grossProfit' as BrandSortField, label: 'Gross Profit' },
                          { field: 'grossMargin' as BrandSortField, label: 'Gross Margin %' },
                          { field: 'lastOrderDate' as BrandSortField, label: 'Last Order' },
                        ]).map(({ field, label }) => (
                          <th
                            key={field}
                            onClick={() => handleBrandSort(field)}
                            className="cursor-pointer px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                          >
                            <div className="flex items-center">
                              {label}
                              <SortIcon field={field} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {sortedBrandSummaries.map((b) => (
                        <tr key={b.brand} className="hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4">
                            <BrandLogoCell brandName={b.brand} />
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-500">
                            {b.orders}
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-900">
                            {formatCurrencyNoDecimals(b.revenue)}
                          </td>
                          <td className={`whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-medium ${b.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyNoDecimals(b.grossProfit)}
                          </td>
                          <td className={`whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-medium ${b.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {b.grossMargin.toFixed(1)}%
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-500">
                            {b.lastOrderDate || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kitchen Orders</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kitchen Revenue</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Kitchen AOV</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Active Kitchens (30d)</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Estimated GP £</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Sale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {kitchenBrandSummaries.map((b) => (
                        <tr key={b.brand} className="hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4">
                            <BrandLogoCell brandName={b.brand} />
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-500">
                            {b.orders}
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-900">
                            {formatCurrencyNoDecimals(b.revenue)}
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-900">
                            {formatCurrencyNoDecimals(b.averageOrderValue)}
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-500">
                            {b.activeKitchens}
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-medium text-green-600">
                            {formatCurrencyNoDecimals(b.estimatedGp)}
                          </td>
                          <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-500">
                            {b.lastSaleDate || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
