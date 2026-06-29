'use client'

import { useEffect, useState, useMemo } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import KPICard from '@/components/KPICard'
import Table from '@/components/Table'
import DateRangePicker, { isAllTimeRange } from '@/components/locations/DateRangePicker'
import { KitchenSales } from '@/lib/types'
import { getCanonicalBrandSlug, getBrandDefinition } from '@/lib/brands'
import { formatCurrency, toLocalDateStr } from '@/lib/utils'
import type { DeliverooDay } from '@/app/api/sales/deliveroo-site/route'
import type { KitchenOrder } from '@/lib/kitchen-orders-supabase'
import PlatformLogo, { getPlatformLabel } from '@/components/PlatformLogo'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'
import { Download, Filter } from 'lucide-react'

function formatDateForSubtitle(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function getSalesPeriodLabel(start: Date, end: Date): string {
  const startLabel = formatDateForSubtitle(start)
  const endLabel = formatDateForSubtitle(end)
  return startLabel === endLabel ? startLabel : `${startLabel} to ${endLabel}`
}

export default function SalesDashboard() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const canonicalBrandSlug = getCanonicalBrandSlug(brandSlug)
  const brandDef = getBrandDefinition(canonicalBrandSlug)
  const isKitchenSite = !!(brandDef?.deliverooLocationKey || brandDef?.orderingSiteId)

  const [brandName, setBrandName] = useState<string>('')
  const [sales, setSales] = useState<KitchenSales[]>([])
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string | null>('Date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const isAdmin = canonicalBrandSlug === 'admin'
  const hideGrossProfitCard = isKitchenSite || ['wing-shack-co', 'eggs-nstuff'].includes(canonicalBrandSlug || '')

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const daysSinceMonday = (today.getDay() + 6) % 7
    const isMonday = daysSinceMonday === 0
    const start = new Date(today)
    start.setDate(today.getDate() - (isMonday ? 7 : daysSinceMonday))
    const end = isMonday ? new Date(today.getTime() - 24 * 60 * 60 * 1000) : new Date()
    return { start, end }
  })

  useEffect(() => {
    fetchBrandName()
    fetchSales()
    if (isKitchenSite) fetchOrders()
  }, [brandSlug, dateRange, selectedLocation])

  const fetchBrandName = async () => {
    try {
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

  const fetchSales = async () => {
    try {
      setLoading(true)
      const startDate = toLocalDateStr(dateRange.start)
      const endDate = toLocalDateStr(dateRange.end)

      const response = await fetch(
        `/api/sales?startDate=${startDate}&endDate=${endDate}&brand=${encodeURIComponent(brandSlug)}`
      )
      if (!response.ok) {
        toast.error('Failed to load sales data')
        return
      }
      const data = await response.json()
      // Exclude stale deliveroo rows from kitchen_sales — brain is the source of truth
      let allSales: KitchenSales[] = (data.sales || []).filter(
        (s: KitchenSales) => s.platform !== 'deliveroo'
      )

      // Merge live Deliveroo data from brain Supabase for kitchen sites
      if (brandDef?.deliverooLocationKey) {
        try {
          const dRes = await fetch(
            `/api/sales/deliveroo-site?locationKey=${encodeURIComponent(brandDef.deliverooLocationKey)}`
          )
          if (dRes.ok) {
            const dData = await dRes.json()
            const rows: DeliverooDay[] = dData.rows || []
            const startCutoff = brandDef.dataStartDate ?? null
            const deliverooSales: KitchenSales[] = rows
              .filter((r) => (!startCutoff || r.date >= startCutoff) && r.date >= startDate && r.date <= endDate)
              .map((r) => ({
                id: `deliveroo-${r.date}`,
                date: r.date,
                location: r.location,
                revenue: r.netPayout,
                grossSales: r.grossSales,
                count: r.orders,
                averageOrderValue: r.orders > 0 ? r.netPayout / r.orders : 0,
                platform: 'deliveroo',
                importDate: r.date,
                importSource: 'WEBHOOK' as const,
              }))
            allSales = [...allSales, ...deliverooSales]
          }
        } catch (e) {
          console.error('Error fetching Deliveroo data:', e)
        }
      }

      // Normalise all rows to one canonical location name for kitchen sites
      if (brandDef?.kitchenLocation) {
        allSales = allSales.map((s) => ({ ...s, location: brandDef!.kitchenLocation! }))
      }

      setSales(allSales)
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast.error('Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const startDate = toLocalDateStr(dateRange.start)
      const endDate = toLocalDateStr(dateRange.end)
      const res = await fetch(
        `/api/sales/orders?brand=${encodeURIComponent(brandSlug)}&startDate=${startDate}&endDate=${endDate}`
      )
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (e) {
      console.error('Error fetching orders:', e)
    }
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return dateString
    const parts = dateString.split('-')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    return dateString
  }

  const getCityFromLocation = (location: string, city?: string): string => {
    if (city) return city
    if (location.includes(' - ')) {
      const parts = location.split(' - ')
      return parts[parts.length - 1].trim()
    }
    const hyphenParts = location.split('-')
    if (hyphenParts.length >= 2) return hyphenParts[hyphenParts.length - 2].trim()
    return location
  }

  const uniqueLocations = useMemo(
    () => Array.from(new Set(sales.map((s) => s.location))).sort(),
    [sales]
  )

  const uniquePlatforms = useMemo(
    () => Array.from(new Set(sales.map((s) => s.platform || '').filter(Boolean))).sort(),
    [sales]
  )

  const filteredOrders = useMemo(() => {
    if (selectedPlatform === 'all') return orders
    return orders.filter((order) => order.platform === selectedPlatform)
  }, [orders, selectedPlatform])

  const filteredSales = useMemo(() => {
    let filtered =
      selectedLocation === 'all'
        ? sales
        : sales.filter((sale) => sale.location === selectedLocation)

    if (isKitchenSite && selectedPlatform !== 'all') {
      filtered = filtered.filter((sale) => sale.platform === selectedPlatform)
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortColumn) {
          case 'Date':
            aVal = a.date
            bVal = b.date
            break
          case 'Platform':
            aVal = (a.platform || '').toLowerCase()
            bVal = (b.platform || '').toLowerCase()
            break
          case 'Location':
            aVal = a.location.toLowerCase()
            bVal = b.location.toLowerCase()
            break
          case 'City':
            aVal = getCityFromLocation(a.location, a.city).toLowerCase()
            bVal = getCityFromLocation(b.location, b.city).toLowerCase()
            break
          case 'Revenue':
          case 'Net Payout':
            aVal = a.revenue
            bVal = b.revenue
            break
          case 'Gross Sales':
            aVal = a.grossSales
            bVal = b.grossSales
            break
          case 'Commission':
            aVal = a.grossSales - a.revenue
            bVal = b.grossSales - b.revenue
            break
          case 'Orders':
            aVal = a.count
            bVal = b.count
            break
          case 'Avg Order Value':
            aVal = a.averageOrderValue || 0
            bVal = b.averageOrderValue || 0
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [sales, selectedLocation, selectedPlatform, isKitchenSite, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.revenue, 0)
  const totalGrossSales = filteredSales.reduce((sum, s) => sum + s.grossSales, 0)
  const totalCommission = totalGrossSales - totalRevenue
  const totalOrders = filteredSales.reduce((sum, s) => sum + s.count, 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const latestSalesDate = sales.reduce<Date | null>((latest, sale) => {
    if (!sale.date) return latest
    const saleDate = new Date(`${sale.date}T00:00:00`)
    if (Number.isNaN(saleDate.getTime())) return latest
    if (!latest || saleDate > latest) return saleDate
    return latest
  }, null)
  const activeKitchenThreshold = latestSalesDate ? new Date(latestSalesDate) : new Date()
  activeKitchenThreshold.setDate(activeKitchenThreshold.getDate() - 30)
  const activeKitchens = new Set(
    sales
      .filter((sale) => {
        if (!sale.date) return false
        const saleDate = new Date(`${sale.date}T00:00:00`)
        return !Number.isNaN(saleDate.getTime()) && saleDate >= activeKitchenThreshold
      })
      .map((sale) => sale.location)
  ).size

  const earliestFilteredSalesDate = filteredSales.reduce<Date | null>((earliest, sale) => {
    if (!sale.date) return earliest
    const saleDate = new Date(`${sale.date}T00:00:00`)
    if (Number.isNaN(saleDate.getTime())) return earliest
    if (!earliest || saleDate < earliest) return saleDate
    return earliest
  }, null)
  const periodStartDate =
    isAllTimeRange(dateRange.start, dateRange.end) && earliestFilteredSalesDate
      ? earliestFilteredSalesDate
      : dateRange.start
  const selectedPeriodLabel = getSalesPeriodLabel(periodStartDate, dateRange.end)
  const activeKitchenPeriodLabel = `Last 30 days to ${formatDateForSubtitle(latestSalesDate ?? new Date())}`
  const grossProfit = totalRevenue * 0.039

  const locationBreakdown = useMemo(() => {
    const grouped = new Map<string, { revenue: number; orders: number; franchiseCode?: string }>()
    filteredSales.forEach((sale) => {
      const existing = grouped.get(sale.location) || {
        revenue: 0,
        orders: 0,
        franchiseCode: sale.franchiseCode,
      }
      grouped.set(sale.location, {
        revenue: existing.revenue + sale.revenue,
        orders: existing.orders + sale.count,
        franchiseCode: sale.franchiseCode || existing.franchiseCode,
      })
    })
    return Array.from(grouped.entries())
      .map(([location, data]) => ({ location, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  const exportToCSV = () => {
    const headers = isKitchenSite
      ? ['Date', 'Platform', 'Orders', 'Gross Sales', 'Commission', 'Net Payout']
      : ['Date', 'Location', 'City', 'Revenue', 'GrossSales', 'Count', 'Average Order Value']
    const rows = isKitchenSite
      ? filteredSales.map((sale) => [
          sale.date,
          getPlatformLabel(sale.platform || ''),
          sale.count,
          sale.grossSales,
          (sale.grossSales - sale.revenue).toFixed(2),
          sale.revenue,
        ])
      : filteredSales.map((sale) => [
          sale.date,
          sale.location,
          getCityFromLocation(sale.location, sale.city),
          sale.revenue,
          sale.grossSales,
          sale.count,
          sale.averageOrderValue?.toFixed(2) || '',
        ])

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${toLocalDateStr(dateRange.start)}-to-${toLocalDateStr(dateRange.end)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAdmin ? <Navigation /> : <BrandNavigation brandSlug={brandSlug} brandName={brandName} />}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading sales data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? <Navigation /> : <BrandNavigation brandSlug={brandSlug} brandName={brandName} />}
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">
        <div className="mb-6 xs:mb-8 sm:mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isKitchenSite ? 'Sales and order activity by platform' : 'Real-time sales analytics and insights'}
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex w-full items-center justify-center space-x-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 shadow-sm hover:shadow sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 xs:mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Filters:</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            <div className="w-full sm:flex-1 sm:min-w-[320px]">
              <DateRangePicker
                startDate={dateRange.start}
                endDate={dateRange.end}
                onChange={(start, end) => setDateRange({ start, end })}
              />
            </div>
            {isKitchenSite && uniquePlatforms.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedPlatform('all')}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedPlatform === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Platforms
                </button>
                {uniquePlatforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedPlatform === platform
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getPlatformLabel(platform)}
                  </button>
                ))}
              </div>
            )}
            {!isKitchenSite && uniqueLocations.length > 0 && (
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 sm:w-auto sm:min-w-[220px] sm:flex-1"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        {isKitchenSite ? (
          <div className="mb-3 xs:mb-4 sm:mb-6 grid grid-cols-3 gap-2.5 xs:gap-3 sm:gap-4">
            <KPICard
              metric={{ label: 'Gross Sales', value: formatCurrency(totalGrossSales), subtitle: selectedPeriodLabel }}
            />
            <KPICard
              metric={{ label: 'Total Orders', value: totalOrders.toLocaleString(), subtitle: selectedPeriodLabel }}
            />
            <KPICard
              metric={{ label: 'Avg Order Value', value: formatCurrency(averageOrderValue), subtitle: selectedPeriodLabel }}
            />
          </div>
        ) : (
          <div
            className={`mb-3 xs:mb-4 sm:mb-6 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 ${
              hideGrossProfitCard ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
            }`}
          >
            <div>
              <KPICard
                metric={{ label: 'Total Revenue', value: formatCurrency(totalRevenue), subtitle: selectedPeriodLabel }}
              />
            </div>
            <div>
              <KPICard
                metric={{ label: 'Total Orders', value: totalOrders.toLocaleString(), subtitle: selectedPeriodLabel }}
              />
            </div>
            <div>
              <KPICard
                metric={{ label: 'Average Order Value', value: formatCurrency(averageOrderValue), subtitle: selectedPeriodLabel }}
              />
            </div>
            {!hideGrossProfitCard && (
              <div>
                <KPICard
                  metric={{ label: 'Gross Profit', value: formatCurrency(grossProfit), subtitle: selectedPeriodLabel }}
                />
              </div>
            )}
            <div className="col-span-2 mx-auto w-full max-w-[15rem] lg:col-span-1 lg:mx-0 lg:max-w-none">
              <KPICard
                metric={{
                  label: 'Active Kitchens (30d)',
                  value: activeKitchens.toString(),
                  subtitle: activeKitchenPeriodLabel,
                }}
              />
            </div>
          </div>
        )}

        {/* Daily Sales Table */}
        <div className="mt-6 sm:mt-8">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Sales</h2>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm">
            {isKitchenSite ? (
              <>
                {/* Kitchen site — mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredSales.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                      No sales data found for the selected period
                    </div>
                  ) : (
                    <div className="max-h-[35rem] space-y-3 overflow-y-auto pr-1">
                      {filteredSales.map((sale, index) => (
                        <div
                          key={`${sale.date}-${sale.platform}-${index}`}
                          className="rounded-xl border border-gray-200 bg-white p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {formatDate(sale.date)}
                            </p>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 flex items-center">
                              <PlatformLogo platform={sale.platform || ''} height={20} />
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Orders</p>
                              <p className="font-semibold text-gray-900">{sale.count}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Gross Sales</p>
                              <p className="font-medium text-gray-900">{formatCurrency(sale.grossSales)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">AOV</p>
                              <p className="font-medium text-gray-600">
                                {sale.count > 0 ? formatCurrency(sale.grossSales / sale.count) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Kitchen site — desktop table */}
                <div className="hidden md:block">
                  <Table
                    headers={['Date', 'Platform', 'Orders', 'Gross Sales', 'Avg Order Value']}
                    maxHeight="520px"
                    stickyHeader={true}
                    sortable={true}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400"
                        >
                          No sales data found for the selected period
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale, index) => (
                        <tr
                          key={`${sale.date}-${sale.platform}-${index}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {formatDate(sale.date)}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4">
                            <PlatformLogo platform={sale.platform || ''} height={28} />
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {sale.count}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm font-medium text-gray-900">
                            {formatCurrency(sale.grossSales)}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-600">
                            {sale.count > 0 ? formatCurrency(sale.grossSales / sale.count) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </Table>
                </div>
              </>
            ) : (
              <>
                {/* Standard brand — mobile cards */}
                <div className="space-y-3 md:hidden">
                  {filteredSales.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                      No sales data found for the selected period
                    </div>
                  ) : (
                    <div className="max-h-[35rem] space-y-3 overflow-y-auto pr-1">
                      {filteredSales.map((sale, index) => (
                        <div
                          key={`${sale.date}-${sale.location}-${index}`}
                          className="rounded-xl border border-gray-200 bg-white p-4"
                        >
                          <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {formatDate(sale.date)}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{sale.location}</p>
                            <p className="text-xs text-gray-500">
                              {getCityFromLocation(sale.location, sale.city)}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Revenue</p>
                              <p className="font-semibold text-gray-900">{formatCurrency(sale.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Gross</p>
                              <p className="font-medium text-gray-700">{formatCurrency(sale.grossSales)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">Orders</p>
                              <p className="font-medium text-gray-900">{sale.count}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">AOV</p>
                              <p className="font-medium text-gray-900">
                                {sale.averageOrderValue ? formatCurrency(sale.averageOrderValue) : '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Standard brand — desktop table */}
                <div className="hidden md:block">
                  <Table
                    headers={['Date', 'Location', 'City', 'Revenue', 'Gross Sales', 'Orders', 'Avg Order Value']}
                    maxHeight="520px"
                    stickyHeader={true}
                    sortable={true}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400"
                        >
                          No sales data found for the selected period
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale, index) => (
                        <tr
                          key={`${sale.date}-${sale.location}-${index}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {formatDate(sale.date)}
                          </td>
                          <td className="px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {sale.location}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {getCityFromLocation(sale.location, sale.city)}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm font-medium text-gray-900">
                            {formatCurrency(sale.revenue)}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-600">
                            {formatCurrency(sale.grossSales)}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {sale.count}
                          </td>
                          <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                            {sale.averageOrderValue ? formatCurrency(sale.averageOrderValue) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order History — kitchen sites only */}
        {isKitchenSite && (
          <div className="mt-6 sm:mt-8">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order History</h2>
              <p className="mt-1 text-sm text-gray-500">Individual orders by platform.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm">
              {/* Mobile */}
              <div className="space-y-2 md:hidden">
                {filteredOrders.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No orders found for this period.</p>
                ) : (
                  <div className="max-h-[40rem] space-y-2 overflow-y-auto pr-1">
                    {filteredOrders.map((order, i) => (
                      <div key={`${order.orderId}-${i}`} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <PlatformLogo platform={order.platform} height={20} />
                          <div>
                            <p className="text-xs font-medium text-gray-900">{formatDate(order.date)}</p>
                            <p className="text-xs text-gray-500">{order.orderId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.grossAmount)}</p>
                          {order.status && order.status !== 'Completed' && (
                            <p className="text-xs text-red-500">{order.status}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table
                  headers={['Date', 'Platform', 'Order ID', 'Gross Amount', 'Status']}
                  maxHeight="520px"
                  stickyHeader={true}
                  sortable={false}
                >
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                        No orders found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order, i) => (
                      <tr key={`${order.orderId}-${i}`} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">
                          {formatDate(order.date)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3">
                          <PlatformLogo platform={order.platform} height={24} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-500">
                          {order.orderId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(order.grossAmount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            order.status === 'Completed'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'Refund'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {order.status || '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Location Breakdown — standard brands only */}
        {!isKitchenSite && locationBreakdown.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Revenue by Location</h2>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm">
              <Table
                headers={['Location', 'City', 'Revenue', 'Orders', 'Avg Order Value']}
                maxHeight="400px"
                stickyHeader={true}
                sortable={true}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                {locationBreakdown.map((item, index) => {
                  const firstSale = filteredSales.find((s) => s.location === item.location)
                  return (
                    <tr key={`${item.location}-${index}`} className="hover:bg-gray-50">
                      <td className="px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                        {item.location}
                      </td>
                      <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                        {firstSale ? getCityFromLocation(firstSale.location, firstSale.city) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm font-medium text-gray-900">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                        {item.orders}
                      </td>
                      <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                        {item.orders > 0 ? formatCurrency(item.revenue / item.orders) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
