'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import CSVUpload from '@/components/sales/CSVUpload'
import DateRangePicker from '@/components/locations/DateRangePicker'
import Table from '@/components/Table'
import KPICard from '@/components/KPICard'
import { KitchenSales } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Download, Filter } from 'lucide-react'

export default function AdminSalesPage() {
  const [sales, setSales] = useState<KitchenSales[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string | null>('Date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return { start, end }
  })

  useEffect(() => {
    fetchSales()
  }, [dateRange, selectedCity])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      
      const response = await fetch(`/api/sales?startDate=${startDate}&endDate=${endDate}`)
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
    setShowUpload(false)
    fetchSales()
  }

  // Helper function to extract city from location
  const getCityFromLocation = (location: string, city?: string): string => {
    if (city) return city
    // Parse "Brand - City - Country" or "Brand-City-Country" format
    const parts = location.split(' - ')
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim()
    }
    // Try hyphen format
    const hyphenParts = location.split('-')
    if (hyphenParts.length >= 2) {
      return hyphenParts[hyphenParts.length - 2].trim()
    }
    return location
  }

  // Helper function to format date from YYYY-MM-DD to DD-MM-YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return dateString
    const parts = dateString.split('-')
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateString
  }

  // Get unique cities for filter
  const uniqueCities = (() => {
    const cities = new Set<string>()
    sales.forEach((sale) => {
      const city = getCityFromLocation(sale.location, sale.city)
      if (city && city !== sale.location) {
        cities.add(city)
      }
    })
    return Array.from(cities).sort()
  })()

  // Filter and sort sales
  const filteredSales = (() => {
    let filtered = selectedCity === 'all' 
      ? sales 
      : sales.filter((sale) => {
          const city = getCityFromLocation(sale.location, sale.city)
          return city === selectedCity
        })
    
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
  const activeKitchens = new Set(filteredSales.map((s) => s.location)).size

  // Today's sales
  const todaysSales = (() => {
    const today = new Date().toISOString().split('T')[0]
    return filteredSales.filter(sale => sale.date === today)
  })()

  const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.revenue, 0)
  const todaysOrders = todaysSales.reduce((sum, s) => sum + s.count, 0)
  const todaysAOV = todaysOrders > 0 ? todaysRevenue / todaysOrders : 0
  const todaysTopLocation = todaysSales.length > 0
    ? todaysSales.reduce((top, sale) => {
        const topRevenue = todaysSales.filter(s => s.location === top.location).reduce((sum, s) => sum + s.revenue, 0)
        const saleRevenue = todaysSales.filter(s => s.location === sale.location).reduce((sum, s) => sum + s.revenue, 0)
        return saleRevenue > topRevenue ? sale : top
      }, todaysSales[0])
    : null

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
    const headers = ['Date', 'Location', 'City', 'Revenue', 'GrossSales', 'Count', 'Average Order Value']
    const rows = filteredSales.map((sale) => [
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">
        <div className="mb-6 xs:mb-8 sm:mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Sales Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage and analyze sales data</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {showUpload ? 'Hide Upload' : 'Upload CSV'}
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* CSV Upload Section */}
        {showUpload && (
          <div className="mb-6 p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Deliverect CSV</h2>
            <CSVUpload onImportComplete={handleImportComplete} />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 xs:mb-8 flex flex-wrap items-center gap-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Filters:</span>
          </div>
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={(start, end) => setDateRange({ start, end })}
          />
          {uniqueCities.length > 0 && (
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Cities</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* KPI Cards */}
        <div className="mb-3 xs:mb-4 sm:mb-6 grid grid-cols-1 gap-2.5 xs:gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            metric={{
              label: 'Total Revenue',
              value: formatCurrency(totalRevenue),
            }}
          />
          <KPICard
            metric={{
              label: 'Total Orders',
              value: totalOrders.toLocaleString(),
            }}
          />
          <KPICard
            metric={{
              label: 'Average Order Value',
              value: formatCurrency(averageOrderValue),
            }}
          />
          <KPICard
            metric={{
              label: 'Active Kitchens',
              value: activeKitchens.toString(),
            }}
          />
        </div>

        {/* Today's Sales Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Today's Sales</h2>
            <p className="text-sm text-gray-500">{formatDate(new Date().toISOString().split('T')[0])}</p>
          </div>
          {todaysSales.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-500">No sales data for today</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-600 mb-1">Today's Revenue</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(todaysRevenue)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-600 mb-1">Today's Orders</p>
                <p className="text-2xl font-bold text-green-700">{todaysOrders}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-600 mb-1">Today's AOV</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(todaysAOV)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-600 mb-1">Top Location</p>
                <p className="text-sm font-semibold text-amber-700 truncate">
                  {todaysTopLocation ? getCityFromLocation(todaysTopLocation.location, todaysTopLocation.city) : '-'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sales Table */}
        <div className="mt-6 sm:mt-8">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Sales</h2>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-lg">
            <Table
              headers={['Date', 'Location', 'City', 'Revenue', 'Gross Sales', 'Orders', 'Avg Order Value']}
              maxHeight="calc(100vh - 500px)"
              stickyHeader={true}
              sortable={true}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400">
                    No sales data found for the selected period
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, index) => (
                    <tr key={`${sale.date}-${sale.location}-${index}`} className="hover:bg-gray-50">
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
        </div>

        {/* Location Breakdown */}
        {locationBreakdown.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Revenue by Location</h2>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-6 shadow-lg">
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
