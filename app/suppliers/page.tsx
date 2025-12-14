'use client'

import { useEffect, useState, useMemo } from 'react'
import Navigation from '@/components/Navigation'
import { Supplier } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ChevronUp, ChevronDown } from 'lucide-react'

type SortField = 'name' | 'ordersCount' | 'totalItems' | 'totalRevenue' | 'lastOrderDate'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orderLines, setOrderLines] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchAllData()
    
    // Auto-refresh every 30 seconds to get latest data from Google Sheets
    const interval = setInterval(() => {
      fetchAllData(true) // silent refresh
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    
    await Promise.all([
      fetchSuppliers(silent),
      fetchOrderLines(silent)
    ])
    
    if (!silent) {
      setLoading(false)
    }
  }

  const fetchSuppliers = async (silent = false) => {
    try {
      const response = await fetch('/api/suppliers')
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers')
      }
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('Error fetching suppliers:', error)
      if (!silent) {
        toast.error(error.message || 'Failed to load suppliers')
      }
      setSuppliers([])
    }
  }

  const fetchOrderLines = async (silent = false) => {
    try {
      const response = await fetch('/api/order-lines')
      if (!response.ok) {
        throw new Error('Failed to fetch order lines')
      }
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setOrderLines(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('Error fetching order lines:', error)
      if (!silent) {
        toast.error('Failed to load order lines')
      }
    }
  }


  // Format date from MM/DD/YYYY or other formats
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    try {
      // Handle MM/DD/YYYY format
      if (dateString.includes('/')) {
        const [month, day, year] = dateString.split('/')
        return `${day}/${month}/${year}`
      }
      return dateString
    } catch {
      return dateString
    }
  }

  // Sort suppliers
  const sortedSuppliers = useMemo(() => {
    const sorted = [...suppliers]
    
    sorted.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'name':
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case 'ordersCount':
          aValue = a.ordersCount || a['Orders Count'] || a.Orders_Count || 0
          bValue = b.ordersCount || b['Orders Count'] || b.Orders_Count || 0
          break
        case 'totalItems':
          aValue = a.totalItems || a['Total Items'] || a.Total_Items || 0
          bValue = b.totalItems || b['Total Items'] || b.Total_Items || 0
          break
        case 'totalRevenue':
          aValue = a.totalValueOrdered || a['Total Revenue'] || a.Total_Revenue || 0
          bValue = b.totalValueOrdered || b['Total Revenue'] || b.Total_Revenue || 0
          break
        case 'lastOrderDate':
          const aDate = a.lastOrderDate || a['Last Order Date'] || a.Last_Order_Date || ''
          const bDate = b.lastOrderDate || b['Last Order Date'] || b.Last_Order_Date || ''
          // Parse dates for comparison
          try {
            if (aDate.includes('/')) {
              const [monthA, dayA, yearA] = aDate.split('/')
              aValue = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA)).getTime()
            } else {
              aValue = aDate ? new Date(aDate).getTime() : 0
            }
            if (bDate.includes('/')) {
              const [monthB, dayB, yearB] = bDate.split('/')
              bValue = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB)).getTime()
            } else {
              bValue = bDate ? new Date(bDate).getTime() : 0
            }
          } catch {
            aValue = aDate
            bValue = bDate
          }
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [suppliers, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="ml-1 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4 text-gray-600" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4 text-gray-600" />
    )
  }

  // Get selected supplier details
  const selectedSupplierData = suppliers.find(s => s.name === selectedSupplier)
  
  // Calculate metrics for selected supplier
  const getSupplierMetrics = () => {
    if (!selectedSupplierData || !selectedSupplier) {
      return null
    }

    // Normalize supplier name for matching (handle various column name variations)
    const supplierName = (selectedSupplierData.name || selectedSupplier || '').trim().toLowerCase()
    
    // Filter order lines by supplier
    const supplierOrderLines = orderLines.filter((line) => {
      const lineSupplier = (
        line.supplier || 
        line.Supplier || 
        line['Supplier'] || 
        ''
      ).trim().toLowerCase()
      return lineSupplier === supplierName
    })

    // Calculate metrics using reduce (as specified in requirements)
    const metrics = supplierOrderLines.reduce(
      (acc, row) => {
        // Total Revenue: sum of lineTotal
        const lineTotal = row.lineTotal || row['Line Total'] || row.Total || 0
        acc.totalRevenue += Number(lineTotal) || 0

        // Total COGS: sum of cogsTotal (from "COGS Total" column)
        const cogsTotal = row.cogsTotal || row['COGS Total'] || row['Total COGS'] || 0
        acc.totalCOGS += Number(cogsTotal) || 0

        // Total Items: sum of quantity
        const quantity = row.quantity || row.Quantity || row.Qty || 0
        acc.totalItems += Number(quantity) || 0

        // Order Count: count distinct orders (using Set for uniqueness)
        const orderId = row.orderId || row['Order ID'] || row.OrderID || row.invoiceNo || row['Invoice No'] || ''
        if (orderId) {
          acc.orderIds.add(orderId)
        }

        return acc
      },
      { 
        totalRevenue: 0, 
        totalCOGS: 0, 
        totalItems: 0, 
        orderIds: new Set<string>()
      }
    )

    // Get unique order count
    const orderCount = metrics.orderIds.size

    // Calculate gross profit and margin
    const grossProfit = metrics.totalRevenue - metrics.totalCOGS
    const grossMargin = metrics.totalRevenue > 0 ? (grossProfit / metrics.totalRevenue) * 100 : 0

    // Get top products
    const productCounts: Record<string, { name: string; quantity: number; revenue: number }> = {}
    supplierOrderLines.forEach((line) => {
      const productName = line.productName || line['Product Name'] || line.Product || 'Unknown'
      const qty = line.quantity || line.Quantity || line.Qty || 0
      const lineTotal = line.lineTotal || line['Line Total'] || line.Total || 0
      
      if (!productCounts[productName]) {
        productCounts[productName] = { name: productName, quantity: 0, revenue: 0 }
      }
      productCounts[productName].quantity += Number(qty) || 0
      productCounts[productName].revenue += Number(lineTotal) || 0
    })
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      totalRevenue: metrics.totalRevenue,
      totalItems: metrics.totalItems,
      orderCount: orderCount,
      totalCOGS: metrics.totalCOGS,
      grossProfit: grossProfit,
      grossMargin: grossMargin,
      topProducts,
    }
  }

  const supplierMetrics = getSupplierMetrics()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading from Hungry Tum OS</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="mt-2 text-gray-600">Supplier summary and order statistics</p>
        </div>

        {/* Supplier Selection Dropdown */}
        <div className="mb-6">
          <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Supplier for Detailed Metrics
          </label>
          <select
            id="supplier-select"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full max-w-md rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-white focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
          >
            <option value="">-- Select a supplier --</option>
            {sortedSuppliers.map((supplier) => (
              <option key={supplier.name} value={supplier.name || ''}>
                {supplier.name || 'Unknown'}
              </option>
            ))}
          </select>
        </div>

        {/* Individual Supplier Metrics */}
        {selectedSupplier && supplierMetrics && (
          <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedSupplier}</h2>
              <button
                onClick={() => setSelectedSupplier('')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {formatCurrencyNoDecimals(supplierMetrics.totalRevenue)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{supplierMetrics.totalItems}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600">Order Count</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{supplierMetrics.orderCount}</p>
              </div>
            </div>
            
            {/* Analytics Section */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Analytics</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">Total COGS</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {formatCurrencyNoDecimals(supplierMetrics.totalCOGS)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                  <p className={`mt-2 text-2xl font-bold ${
                    supplierMetrics.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrencyNoDecimals(supplierMetrics.grossProfit)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-600">Gross Margin %</p>
                        <p className={`mt-2 text-2xl font-bold ${
                          supplierMetrics.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isNaN(supplierMetrics.grossMargin) || !isFinite(supplierMetrics.grossMargin) 
                            ? '0.0%' 
                            : `${supplierMetrics.grossMargin.toFixed(1)}%`}
                        </p>
                </div>
              </div>
            </div>
            {supplierMetrics.topProducts.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Top Products</h3>
                <div className="space-y-2">
                  {supplierMetrics.topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">Qty: {product.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrencyNoDecimals(product.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Supplier Table - Replicates Supplier_Summary Sheet */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Supplier Summary</h2>
          {suppliers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No suppliers found</p>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="overflow-x-auto scrollbar-thin">
                <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th
                          onClick={() => handleSort('name')}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap cursor-pointer hover:bg-gray-100 group"
                        >
                          <div className="flex items-center">
                            Supplier
                            <SortIcon field="name" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('ordersCount')}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap cursor-pointer hover:bg-gray-100 group"
                        >
                          <div className="flex items-center">
                            Orders Count
                            <SortIcon field="ordersCount" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('totalItems')}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap cursor-pointer hover:bg-gray-100 group"
                        >
                          <div className="flex items-center">
                            Total Items
                            <SortIcon field="totalItems" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('totalRevenue')}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap cursor-pointer hover:bg-gray-100 group"
                        >
                          <div className="flex items-center">
                            Total Revenue
                            <SortIcon field="totalRevenue" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('lastOrderDate')}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap cursor-pointer hover:bg-gray-100 group"
                        >
                          <div className="flex items-center">
                            Last Order Date
                            <SortIcon field="lastOrderDate" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {sortedSuppliers.map((supplier, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {supplier.name || 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {supplier.ordersCount || supplier['Orders Count'] || supplier.Orders_Count || 0}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {supplier.totalItems || supplier['Total Items'] || supplier.Total_Items || 0}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {supplier.totalValueOrdered || supplier['Total Revenue'] || supplier.Total_Revenue 
                              ? formatCurrencyNoDecimals(supplier.totalValueOrdered || supplier['Total Revenue'] || supplier.Total_Revenue || 0)
                              : '£0'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {formatDate(supplier.lastOrderDate || supplier['Last Order Date'] || supplier.Last_Order_Date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

