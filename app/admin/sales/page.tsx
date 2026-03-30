'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import CSVUpload from '@/components/sales/CSVUpload'
import DateRangePicker from '@/components/locations/DateRangePicker'
import Table from '@/components/Table'
import KPICard from '@/components/KPICard'
import { KitchenSales } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { getCanonicalBrands } from '@/lib/brands'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle, Download, Filter, RefreshCw, XCircle } from 'lucide-react'

interface OperatedSalesPreviewSite {
  siteSlug: string
  siteName: string
  brandSlug: string | null
  sourceSheet: string
  rowCount: number
  totalRevenue: number
  totalOrders: number
  earliestDate: string | null
  latestDate: string | null
}

interface OperatedSalesPreview {
  totalRows: number
  totalRevenue: number
  totalOrders: number
  earliestDate: string | null
  latestDate: string | null
  sites: OperatedSalesPreviewSite[]
}

interface OperatedSalesStatus {
  lastSyncedAt: string | null
}

function getPreviousDayRange() {
  const start = new Date()
  start.setDate(start.getDate() - 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

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

export default function AdminSalesPage() {
  const brandOptions = getCanonicalBrands()
  const [sales, setSales] = useState<KitchenSales[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadBrand, setUploadBrand] = useState<string>('smsh-bn')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSyncingOperatedSales, setIsSyncingOperatedSales] = useState(false)
  const [showOperatedSyncModal, setShowOperatedSyncModal] = useState(false)
  const [operatedSalesPreview, setOperatedSalesPreview] = useState<OperatedSalesPreview | null>(null)
  const [operatedSyncResult, setOperatedSyncResult] = useState<{ rowsWritten: number; total: number } | null>(null)
  const [operatedSalesStatus, setOperatedSalesStatus] = useState<OperatedSalesStatus | null>(null)
  const [operatedSyncDateRange, setOperatedSyncDateRange] = useState(getPreviousDayRange)
  const [sortColumn, setSortColumn] = useState<string | null>('Date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Date range state - default to all time
  const [dateRange, setDateRange] = useState(() => ({
    start: new Date(0),
    end: new Date(),
  }))

  useEffect(() => {
    fetchSales()
  }, [dateRange, selectedLocation, selectedBrand])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      
      const params = new URLSearchParams({ startDate, endDate })
      if (selectedBrand !== 'all') params.set('brand', selectedBrand)
      const response = await fetch(`/api/sales?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSales(data.sales || [])
      } else {
        toast.error('Failed to load sales data')
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast.error('Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }

  const handleImportComplete = () => {
    fetchSales()
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return dateString
    const parts = dateString.split('-')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateString
  }

  const handlePreviewOperatedSalesSync = async () => {
    setIsSyncingOperatedSales(true)

    try {
      const params = new URLSearchParams({
        startDate: operatedSyncDateRange.start.toISOString().split('T')[0],
        endDate: operatedSyncDateRange.end.toISOString().split('T')[0],
      })
      const response = await fetch(`/api/operated-sales/sync?${params.toString()}`)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to preview operated sales sync')
      }

      setOperatedSalesPreview(result.preview || null)
      setOperatedSalesStatus(result.status || null)
      setOperatedSyncResult(null)
      setShowOperatedSyncModal(true)
    } catch (error: any) {
      console.error('Error previewing operated sales sync:', error)
      toast.error(error.message || 'Failed to preview operated sales sync')
    } finally {
      setIsSyncingOperatedSales(false)
    }
  }

  const refreshOperatedSalesPreview = async () => {
    setIsSyncingOperatedSales(true)

    try {
      const params = new URLSearchParams({
        startDate: operatedSyncDateRange.start.toISOString().split('T')[0],
        endDate: operatedSyncDateRange.end.toISOString().split('T')[0],
      })
      const response = await fetch(`/api/operated-sales/sync?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh operated sales preview')
      }

      setOperatedSalesPreview(result.preview || null)
      setOperatedSalesStatus(result.status || null)
    } catch (error: any) {
      console.error('Error refreshing operated sales preview:', error)
      toast.error(error.message || 'Failed to refresh operated sales preview')
    } finally {
      setIsSyncingOperatedSales(false)
    }
  }

  const handleConfirmOperatedSalesSync = async () => {
    setIsSyncingOperatedSales(true)

    try {
      const response = await fetch('/api/operated-sales/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: operatedSyncDateRange.start.toISOString().split('T')[0],
          endDate: operatedSyncDateRange.end.toISOString().split('T')[0],
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync operated sales')
      }

      setOperatedSyncResult({ rowsWritten: result.rowsWritten, total: result.total })
      setOperatedSalesStatus(result.status || null)
      await fetchSales()
      toast.success(`Wrote ${result.rowsWritten} operated sales row${result.rowsWritten === 1 ? '' : 's'}`)
    } catch (error: any) {
      console.error('Error syncing operated sales:', error)
      toast.error(error.message || 'Failed to sync operated sales')
      setShowOperatedSyncModal(false)
    } finally {
      setIsSyncingOperatedSales(false)
    }
  }

  const handleCloseOperatedSyncModal = () => {
    setShowOperatedSyncModal(false)
    setOperatedSalesPreview(null)
    setOperatedSyncResult(null)
  }

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Never'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} row${selectedIds.size > 1 ? 's' : ''}?`)) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/sales/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setSelectedIds(new Set())
      fetchSales()
      toast.success(`Deleted ${selectedIds.size} row${selectedIds.size > 1 ? 's' : ''}`)
    } catch (e: any) {
      toast.error(e.message || 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const allIds = filteredSales.map((s) => s.id).filter(Boolean) as string[]
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  // Helper function to extract city from location
  const getCityFromLocation = (location: string, city?: string): string => {
    if (city) return city
    // "Brand - City" format (space-dash-space): take the last segment
    if (location.includes(' - ')) {
      const parts = location.split(' - ')
      return parts[parts.length - 1].trim()
    }
    // "Brand-City-Country" format (no spaces): take second-to-last segment
    const hyphenParts = location.split('-')
    if (hyphenParts.length >= 2) {
      return hyphenParts[hyphenParts.length - 2].trim()
    }
    return location
  }

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(sales.map((s) => s.location))).sort()

  // Filter and sort sales
  const filteredSales = (() => {
    let filtered = selectedLocation === 'all'
      ? sales
      : sales.filter((sale) => sale.location === selectedLocation)
    
    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any
        
        switch (sortColumn) {
          case 'Date':
            aVal = a.date
            bVal = b.date
            break
          case 'Brand':
            aVal = (a.brandName || a.brandSlug || '').toLowerCase()
            bVal = (b.brandName || b.brandSlug || '').toLowerCase()
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
            aVal = a.revenue
            bVal = b.revenue
            break
          case 'Gross Sales':
            aVal = a.grossSales
            bVal = b.grossSales
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
  })()

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Calculate metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.revenue, 0)
  const totalGrossSales = filteredSales.reduce((sum, s) => sum + s.grossSales, 0)
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
  const selectedPeriodLabel = getSalesPeriodLabel(dateRange.start, dateRange.end)
  const activeKitchenPeriodLabel = `Last 30 days to ${formatDateForSubtitle(latestSalesDate ?? new Date())}`

  // Group by location for location breakdown
  const locationBreakdown = Array.from(
    filteredSales.reduce((acc, sale) => {
      const existing = acc.get(sale.location) || { revenue: 0, orders: 0, franchiseCode: sale.franchiseCode }
      acc.set(sale.location, {
        revenue: existing.revenue + sale.revenue,
        orders: existing.orders + sale.count,
        franchiseCode: sale.franchiseCode || existing.franchiseCode,
      })
      return acc
    }, new Map<string, { revenue: number; orders: number; franchiseCode?: string }>())
  )
    .map(([location, data]) => ({ location, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  const exportToCSV = () => {
    const headers = ['Date', 'Brand', 'Location', 'City', 'Revenue', 'GrossSales', 'Count', 'Average Order Value']
    const rows = filteredSales.map((sale) => [
      sale.date,
      sale.brandName || sale.brandSlug || '',
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
    a.download = `sales-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading sales data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">
        <div className="mb-6 xs:mb-8 sm:mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900">
              Sales Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage and analyze sales data</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              onClick={handlePreviewOperatedSalesSync}
              disabled={isSyncingOperatedSales}
              className="flex flex-1 items-center justify-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingOperatedSales ? 'animate-spin' : ''}`} />
              <span>{isSyncingOperatedSales ? 'Syncing…' : 'Sync Operated Sales'}</span>
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 sm:flex-none"
            >
              {showUpload ? 'Hide Upload' : 'Upload CSV'}
            </button>
            <button
              onClick={exportToCSV}
              className="flex flex-1 items-center justify-center space-x-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 shadow-sm hover:shadow sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 sm:text-right">
            Last synced: {formatDateTime(operatedSalesStatus?.lastSyncedAt ?? null)}
          </div>
        </div>

        {/* CSV Upload Section */}
        {showUpload && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Deliverect CSV</h2>
          <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
              <select
                value={uploadBrand}
                onChange={(e) => setUploadBrand(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:w-auto"
              >
                {brandOptions.map((brand) => (
                  <option key={brand.canonicalSlug} value={brand.canonicalSlug}>{brand.displayName}</option>
                ))}
              </select>
            </div>
            <CSVUpload
              brandSlug={uploadBrand}
              brandName={brandOptions.find((brand) => brand.canonicalSlug === uploadBrand)?.displayName}
              onImportComplete={handleImportComplete}
            />
          </div>
        )}

        {showOperatedSyncModal && operatedSalesPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
              {operatedSyncResult ? (
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Operated sales synced</h3>
                      <p className="text-sm text-gray-500">The selected Google Sheets data has been ingested.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rows Written</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{operatedSyncResult.rowsWritten}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Preview Rows</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900">{operatedSyncResult.total}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">From</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{operatedSalesPreview.earliestDate ? formatDate(operatedSalesPreview.earliestDate) : '-'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">To</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{operatedSalesPreview.latestDate ? formatDate(operatedSalesPreview.latestDate) : '-'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 col-span-2 sm:col-span-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last Synced</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{formatDateTime(operatedSalesStatus?.lastSyncedAt ?? null)}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleCloseOperatedSyncModal}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-gray-200 p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-6 w-6 text-amber-500" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Confirm operated sales sync</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          This will ingest the selected Combined daily sales window from the mapped rev-tracker tabs into Supabase.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[65vh] overflow-y-auto p-6">
                    <div className="mb-6 rounded-lg border border-gray-200 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                          Sync Date Range
                        </label>
                        <button
                          onClick={refreshOperatedSalesPreview}
                          disabled={isSyncingOperatedSales}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncingOperatedSales ? 'animate-spin' : ''}`} />
                          <span>Update Preview</span>
                        </button>
                      </div>
                      <DateRangePicker
                        startDate={operatedSyncDateRange.start}
                        endDate={operatedSyncDateRange.end}
                        onChange={(start, end) => setOperatedSyncDateRange({ start, end })}
                      />
                    </div>
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rows</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{operatedSalesPreview.totalRows}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Revenue</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(operatedSalesPreview.totalRevenue)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Orders</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{operatedSalesPreview.totalOrders.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Date Range</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {operatedSalesPreview.earliestDate ? formatDate(operatedSalesPreview.earliestDate) : '-'} to {operatedSalesPreview.latestDate ? formatDate(operatedSalesPreview.latestDate) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200">
                      <div className="border-b border-gray-200 px-4 py-3">
                        <h4 className="text-sm font-semibold text-gray-900">Sites to ingest</h4>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {operatedSalesPreview.sites.map((site) => (
                          <div key={site.siteSlug} className="grid gap-3 px-4 py-4 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{site.siteName}</p>
                              <p className="text-xs text-gray-500">{site.sourceSheet}</p>
                              <p className="mt-1 text-xs text-gray-500">{site.brandSlug || 'No brand mapping yet'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Dates</p>
                              <p className="text-sm text-gray-900">
                                {site.earliestDate ? formatDate(site.earliestDate) : '-'} to {site.latestDate ? formatDate(site.latestDate) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Revenue</p>
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(site.totalRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rows / Orders</p>
                              <p className="text-sm text-gray-900">{site.rowCount} / {site.totalOrders.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-6">
                    <button
                      onClick={handleCloseOperatedSyncModal}
                      disabled={isSyncingOperatedSales}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmOperatedSalesSync}
                      disabled={isSyncingOperatedSales}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSyncingOperatedSales ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      <span>{isSyncingOperatedSales ? 'Syncing…' : 'Confirm Sync'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 sm:w-auto sm:min-w-[180px]"
            >
              <option value="all">All Brands</option>
              {brandOptions.map((brand) => (
                <option key={brand.canonicalSlug} value={brand.canonicalSlug}>{brand.displayName}</option>
              ))}
            </select>
            {uniqueLocations.length > 0 && (
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
        <div className="mb-3 xs:mb-4 sm:mb-6 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 lg:grid-cols-4">
          <div>
            <KPICard
              metric={{
                label: 'Total Revenue',
                value: formatCurrency(totalRevenue),
                subtitle: selectedPeriodLabel,
              }}
            />
          </div>
          <div>
            <KPICard
              metric={{
                label: 'Total Orders',
                value: totalOrders.toLocaleString(),
                subtitle: selectedPeriodLabel,
              }}
            />
          </div>
          <div>
            <KPICard
              metric={{
                label: 'Average Order Value',
                value: formatCurrency(averageOrderValue),
                subtitle: selectedPeriodLabel,
              }}
            />
          </div>
          <div>
            <KPICard
              metric={{
                label: 'Active Kitchens (30d)',
                value: activeKitchens.toString(),
                subtitle: activeKitchenPeriodLabel,
              }}
            />
          </div>
        </div>

        {/* Sales Table */}
        <div className="mt-6 sm:mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Sales</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {filteredSales.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredSales.filter(s => s.id).length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  Select all
                </label>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Deleting…' : `Delete ${selectedIds.size} selected`}
                </button>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm">
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
                    className={`rounded-xl border p-4 ${selectedIds.has(sale.id ?? '') ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{formatDate(sale.date)}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{sale.brandName || sale.brandSlug || '-'}</p>
                        <p className="mt-1 text-sm text-gray-700">{sale.location}</p>
                        <p className="text-xs text-gray-500">{getCityFromLocation(sale.location, sale.city)}</p>
                      </div>
                      {sale.id && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(sale.id)}
                          onChange={() => toggleRow(sale.id!)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      )}
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
                        <p className="font-medium text-gray-900">{sale.averageOrderValue ? formatCurrency(sale.averageOrderValue) : '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <Table
              headers={['', 'Date', 'Brand', 'Location', 'City', 'Revenue', 'Gross Sales', 'Orders', 'Avg Order Value']}
              maxHeight="520px"
              stickyHeader={true}
              sortable={true}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              >
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400">
                    No sales data found for the selected period
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, index) => (
                    <tr
                      key={`${sale.date}-${sale.location}-${index}`}
                      className={`hover:bg-gray-50 ${selectedIds.has(sale.id ?? '') ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-2 xs:px-3 sm:px-4 py-2.5 xs:py-3 sm:py-4 w-8">
                        {sale.id && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(sale.id)}
                            onChange={() => toggleRow(sale.id!)}
                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                        {formatDate(sale.date)}
                      </td>
                      <td className="whitespace-nowrap px-2 xs:px-3 sm:px-6 py-2.5 xs:py-3 sm:py-4 text-xs xs:text-sm text-gray-900">
                        {sale.brandName || sale.brandSlug || '-'}
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
          </div>
        </div>

        {/* Location Breakdown */}
        {locationBreakdown.length > 0 && (
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
                  // Find city from first sale with this location
                  const firstSale = filteredSales.find(s => s.location === item.location)
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
