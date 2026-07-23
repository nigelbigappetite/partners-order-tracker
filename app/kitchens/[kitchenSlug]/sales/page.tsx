'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import KPICard from '@/components/KPICard'
import Table from '@/components/Table'
import { KitchenSales } from '@/lib/types'
import { getBrandDefinition } from '@/lib/brands'
import { formatCurrency, toLocalDateStr } from '@/lib/utils'
import type { DeliverooDay } from '@/app/api/sales/deliveroo-site/route'
import type { KitchenOrder } from '@/lib/kitchen-orders-supabase'
import PlatformLogo, { getPlatformLabel } from '@/components/PlatformLogo'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'
import { Download } from 'lucide-react'

// ── Week helpers ───────────────────────────────────────────────────────────────

type Period =
  | { type: 'this_week' }
  | { type: 'last_week' }
  | { type: 'week'; weekStart: string }

function getMonday(weeksAgo: number): Date {
  const today = new Date()
  const daysSinceMonday = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysSinceMonday - 7 * weeksAgo)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function fmtDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function periodToDateRange(period: Period): { startDate: string; endDate: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (period.type === 'this_week') {
    const mon = getMonday(0)
    return { startDate: toLocalDateStr(mon), endDate: toLocalDateStr(today) }
  }
  if (period.type === 'last_week') {
    const mon = getMonday(1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { startDate: toLocalDateStr(mon), endDate: toLocalDateStr(sun) }
  }
  const mon = new Date(period.weekStart + 'T00:00:00')
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { startDate: period.weekStart, endDate: toLocalDateStr(sun) }
}

function getPeriodLabel(period: Period): string {
  const { startDate, endDate } = periodToDateRange(period)
  return `${fmtDMY(startDate)} – ${fmtDMY(endDate)}`
}

function getAvailableWeeks(): { weekStart: string; label: string }[] {
  const weeks: { weekStart: string; label: string }[] = []
  for (let i = 2; i <= 26; i++) {
    const mon = getMonday(i)
    const start = toLocalDateStr(mon)
    weeks.push({ weekStart: start, label: `Week of ${fmtDMY(start)}` })
  }
  return weeks
}

function formatDate(dateString: string): string {
  if (!dateString) return dateString
  const parts = dateString.split('-')
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
  return dateString
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KitchenSalesDashboard() {
  const params = useParams()
  const kitchenSlug = params.kitchenSlug as string
  const brandDef = getBrandDefinition(kitchenSlug)

  const [sales, setSales] = useState<KitchenSales[]>([])
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string | null>('Date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [period, setPeriod] = useState<Period>({ type: 'this_week' })

  const availableWeeks = useMemo(() => getAvailableWeeks(), [])
  const dropdownActive = period.type === 'week'
  const dropdownValue = period.type === 'week' ? period.weekStart : ''

  const fetchSalesIdRef = useRef(0)
  const fetchOrdersIdRef = useRef(0)

  useEffect(() => {
    fetchSales()
    fetchOrders()
  }, [kitchenSlug, period])

  const fetchSales = async () => {
    const fetchId = ++fetchSalesIdRef.current
    try {
      setLoading(true)
      const { startDate, endDate } = periodToDateRange(period)

      const response = await fetch(
        `/api/sales?startDate=${startDate}&endDate=${endDate}&brand=${encodeURIComponent(kitchenSlug)}`
      )
      if (fetchId !== fetchSalesIdRef.current) return
      if (!response.ok) { toast.error('Failed to load sales data'); return }

      const data = await response.json()
      let allSales: KitchenSales[] = (data.sales || []).filter(
        (s: KitchenSales) => s.platform !== 'deliveroo'
      )

      if (brandDef?.deliverooLocationKey) {
        try {
          const dRes = await fetch(
            `/api/sales/deliveroo-site?locationKey=${encodeURIComponent(brandDef.deliverooLocationKey)}`
          )
          if (fetchId !== fetchSalesIdRef.current) return
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

      if (fetchId !== fetchSalesIdRef.current) return

      if (brandDef?.kitchenLocation) {
        allSales = allSales.map((s) => ({ ...s, location: brandDef!.kitchenLocation! }))
      }

      setSales(allSales)
    } catch (error) {
      if (fetchId !== fetchSalesIdRef.current) return
      toast.error('Failed to load sales data')
    } finally {
      if (fetchId === fetchSalesIdRef.current) setLoading(false)
    }
  }

  const fetchOrders = async () => {
    const fetchId = ++fetchOrdersIdRef.current
    try {
      const { startDate, endDate } = periodToDateRange(period)
      const res = await fetch(
        `/api/sales/orders?brand=${encodeURIComponent(kitchenSlug)}&startDate=${startDate}&endDate=${endDate}`
      )
      if (fetchId !== fetchOrdersIdRef.current) return
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (e) {
      console.error('Error fetching orders:', e)
    }
  }

  const uniquePlatforms = useMemo(
    () => Array.from(new Set(sales.map((s) => s.platform || '').filter(Boolean))).sort(),
    [sales]
  )

  const filteredOrders = useMemo(() => {
    if (selectedPlatform === 'all') return orders
    return orders.filter((o) => o.platform === selectedPlatform)
  }, [orders, selectedPlatform])

  const filteredSales = useMemo(() => {
    let filtered = selectedPlatform === 'all'
      ? sales
      : sales.filter((s) => s.platform === selectedPlatform)

    if (!sortColumn) return filtered

    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case 'Date':         aVal = a.date;                          bVal = b.date;                          break
        case 'Platform':     aVal = (a.platform || '').toLowerCase(); bVal = (b.platform || '').toLowerCase(); break
        case 'Orders':       aVal = a.count;                         bVal = b.count;                         break
        case 'Gross Sales':  aVal = a.grossSales || 0;               bVal = b.grossSales || 0;               break
        case 'Platform Fee': aVal = (a.grossSales || 0) - a.revenue; bVal = (b.grossSales || 0) - b.revenue; break
        case 'Net Payout':   aVal = a.revenue;                       bVal = b.revenue;                       break
        default: return 0
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [sales, selectedPlatform, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const totalGross = filteredSales.reduce((sum, s) => sum + (s.grossSales || 0), 0)
  const totalNet   = filteredSales.reduce((sum, s) => sum + s.revenue, 0)
  const totalFees  = totalGross - totalNet
  const totalOrders = filteredSales.reduce((sum, s) => sum + s.count, 0)
  const periodLabel = getPeriodLabel(period)

  const exportToCSV = () => {
    const { startDate, endDate } = periodToDateRange(period)
    const headers = ['Date', 'Platform', 'Orders', 'Gross Sales', 'Platform Fee', 'Net Payout']
    const rows = filteredSales.map((s) => [
      s.date,
      getPlatformLabel(s.platform || ''),
      s.count,
      (s.grossSales || 0).toFixed(2),
      ((s.grossSales || 0) - s.revenue).toFixed(2),
      s.revenue.toFixed(2),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-${startDate}-to-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500">
          Loading sales data…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900">Sales</h1>
            <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 shadow-sm sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Week selector + platform toggle */}
        <div className="mb-4 xs:mb-6 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            {/* Week pills */}
            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              {([
                { type: 'this_week' as const, label: 'This Week' },
                { type: 'last_week' as const, label: 'Last Week' },
              ] as const).map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setPeriod({ type })}
                  className={[
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                    period.type === type
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-900',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
              <select
                value={dropdownValue}
                onChange={(e) => { if (e.target.value) setPeriod({ type: 'week', weekStart: e.target.value }) }}
                className={[
                  'rounded-lg py-2 pl-3 pr-2 text-sm font-medium transition-all cursor-pointer border-0 outline-none appearance-none',
                  dropdownActive
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                    : 'bg-transparent text-gray-500 hover:text-gray-900',
                ].join(' ')}
              >
                <option value="" disabled>Earlier…</option>
                {availableWeeks.map((w) => (
                  <option key={w.weekStart} value={w.weekStart}>{w.label}</option>
                ))}
              </select>
            </div>

            {/* Platform toggle */}
            {uniquePlatforms.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedPlatform('all')}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${
                    selectedPlatform === 'all'
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {uniquePlatforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`rounded-lg border px-3 py-2 shadow-sm transition-colors flex items-center ${
                      selectedPlatform === platform
                        ? 'bg-brand-primary border-brand-primary'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <PlatformLogo platform={platform} height={24} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPI row 1 — financial */}
        <div className="mb-2.5 xs:mb-3 sm:mb-4 grid grid-cols-3 gap-2.5 xs:gap-3 sm:gap-4">
          <KPICard metric={{ label: 'Gross Sales',    value: formatCurrency(totalGross), subtitle: periodLabel }} />
          <KPICard metric={{ label: 'Platform Fees',  value: formatCurrency(totalFees),  subtitle: periodLabel }} />
          <KPICard metric={{ label: 'Net Payout',     value: formatCurrency(totalNet),   subtitle: periodLabel }} />
        </div>

        {/* KPI row 2 — operational */}
        <div className="mb-3 xs:mb-4 sm:mb-6 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4">
          <KPICard metric={{ label: 'Total Orders',     value: totalOrders.toLocaleString(), subtitle: periodLabel }} />
          <KPICard metric={{ label: 'Avg Order Value',  value: totalOrders > 0 ? formatCurrency(totalGross / totalOrders) : '—', subtitle: 'Based on gross' }} />
        </div>

        {/* Daily breakdown table */}
        <div className="mt-6 sm:mt-8">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold text-gray-900">Daily Breakdown</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm">

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredSales.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                  No sales data for this week
                </div>
              ) : (
                <div className="max-h-[35rem] space-y-3 overflow-y-auto pr-1">
                  {filteredSales.map((sale, i) => {
                    const gross = sale.grossSales || 0
                    const fee   = gross - sale.revenue
                    return (
                      <div key={`${sale.date}-${sale.platform}-${i}`} className="rounded-xl border border-gray-200 bg-white p-4">
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
                            <p className="text-xs uppercase tracking-wide text-gray-500">Gross</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(gross)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Fee</p>
                            <p className="font-medium text-gray-500">−{formatCurrency(fee)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Net</p>
                            <p className="font-semibold text-green-700">{formatCurrency(sale.revenue)}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">{sale.count} orders</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table
                headers={['Date', 'Platform', 'Orders', 'Gross Sales', 'Platform Fee', 'Net Payout']}
                maxHeight="520px"
                stickyHeader={true}
                sortable={true}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">
                      No sales data for this week
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, i) => {
                    const gross = sale.grossSales || 0
                    const fee   = gross - sale.revenue
                    return (
                      <tr key={`${sale.date}-${sale.platform}-${i}`} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{formatDate(sale.date)}</td>
                        <td className="whitespace-nowrap px-6 py-3">
                          <PlatformLogo platform={sale.platform || ''} height={28} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">{sale.count}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-gray-900">{formatCurrency(gross)}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">−{formatCurrency(fee)}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm font-semibold text-green-700">{formatCurrency(sale.revenue)}</td>
                      </tr>
                    )
                  })
                )}
              </Table>
            </div>
          </div>
        </div>

        {/* Order history */}
        <div className="mt-6 sm:mt-8">
          <h2 className="mb-1 text-lg sm:text-xl font-semibold text-gray-900">Order History</h2>
          <p className="mb-4 text-sm text-gray-500">Individual orders for this reporting week.</p>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm">

            {/* Mobile */}
            <div className="space-y-2 md:hidden">
              {filteredOrders.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No orders for this week.</p>
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
                      No orders for this week.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, i) => (
                    <tr key={`${order.orderId}-${i}`} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{formatDate(order.date)}</td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <PlatformLogo platform={order.platform} height={24} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-500">{order.orderId}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-gray-900">{formatCurrency(order.grossAmount)}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          order.status === 'Completed' ? 'bg-green-100 text-green-700'
                          : order.status === 'Refund'  ? 'bg-red-100 text-red-700'
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

      </div>
    </div>
  )
}
