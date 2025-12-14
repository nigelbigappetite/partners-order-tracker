'use client'

import { useEffect, useState, useMemo } from 'react'
import Navigation from '@/components/Navigation'
import BrandLogoCell from '@/components/BrandLogoCell'
import { Brand, Order, OrderLine } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ChevronUp, ChevronDown } from 'lucide-react'

type SortField = 'name' | 'ordersCount' | 'totalRevenue' | 'grossProfit' | 'grossMargin' | 'lastOrderDate'

export default function BrandsPage() {
  const [brandsFromSheet, setBrandsFromSheet] = useState<Brand[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchAllData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData(true) // silent refresh
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    
    await Promise.all([
      fetchBrands(silent),
      fetchOrders(silent),
      fetchOrderLines(silent)
    ])
    
    if (!silent) {
      setLoading(false)
    }
  }

  const fetchBrands = async (silent = false) => {
    try {
      const response = await fetch('/api/brands')
      if (!response.ok) {
        throw new Error('Failed to fetch brands')
      }
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setBrandsFromSheet(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('Error fetching brands:', error)
      if (!silent) {
        toast.error(error.message || 'Failed to load brands')
      }
      setBrandsFromSheet([])
    }
  }

  const fetchOrders = async (silent = false) => {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setOrders(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      if (!silent) {
        toast.error('Failed to load orders')
      }
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

  // Calculate brand metrics from actual order data
  const brands = useMemo(() => {
    // Get unique brand names from orders
    const brandNames = new Set<string>()
    orders.forEach((order) => {
      const brand = (order.brand || '').trim()
      if (brand) {
        brandNames.add(brand)
      }
    })

    // Normalize order IDs and invoice numbers for matching
    const normalizeOrderId = (id: string): string => {
      if (!id) return ''
      return id.toString().replace(/#/g, '').trim().toLowerCase()
    }
    
    const normalizeInvoiceNo = (inv: string): string => {
      if (!inv) return ''
      return inv.toString().trim().toLowerCase()
    }

    // Calculate metrics for each brand
    return Array.from(brandNames).map((brandName) => {
      // Filter orders for this brand
      const brandOrders = orders.filter((o) => (o.brand || '').trim() === brandName)
      
      // Get unique order IDs and invoice numbers
      const orderIds = new Set(brandOrders.map((o) => normalizeOrderId(o.orderId)))
      const invoiceNos = new Set(
        brandOrders
          .map((o) => o.invoiceNo)
          .filter((inv): inv is string => !!inv)
          .map((inv) => normalizeInvoiceNo(inv))
      )
      
      // Calculate revenue from Orders_Header (orderTotal)
      const totalRevenue = brandOrders.reduce((sum, order) => {
        const orderTotal = Number(order.orderTotal || 0)
        return sum + (isNaN(orderTotal) ? 0 : orderTotal)
      }, 0)

      // Calculate COGS from Order_Lines (more accurate than Orders_Header)
      // Match order lines by orderId OR invoiceNo
      const brandOrderLines = orderLines.filter((line) => {
        const lineBrand = (line.brand || '').trim()
        const normalizedLineOrderId = normalizeOrderId(line.orderId)
        const normalizedLineInvoiceNo = line.invoiceNo ? normalizeInvoiceNo(line.invoiceNo) : null
        
        // First check if brand matches (if available in order lines)
        if (lineBrand && lineBrand === brandName) {
          // Then verify it matches an order
          if (orderIds.has(normalizedLineOrderId)) return true
          if (normalizedLineInvoiceNo && invoiceNos.has(normalizedLineInvoiceNo)) return true
        } else {
          // If brand not in order line, match by orderId/invoiceNo
          if (orderIds.has(normalizedLineOrderId)) return true
          if (normalizedLineInvoiceNo && invoiceNos.has(normalizedLineInvoiceNo)) return true
        }
        
        return false
      })

      // Sum COGS from order lines (cogsTotal)
      const totalCOGS = brandOrderLines.reduce((sum, line) => {
        const cogsTotal = Number(line.cogsTotal || (line as any)['COGS Total'] || (line as any)['Total COGS'] || 0)
        return sum + (isNaN(cogsTotal) ? 0 : cogsTotal)
      }, 0)

      // Fallback: If no COGS from order lines, try Orders_Header
      const totalCOGSFromOrders = brandOrders.reduce((sum, order) => {
        const orderCOGS = Number(order.totalCOGS || 0)
        return sum + (isNaN(orderCOGS) ? 0 : orderCOGS)
      }, 0)

      // Use Order_Lines COGS if available, otherwise use Orders_Header
      const finalCOGS = totalCOGS > 0 ? totalCOGS : totalCOGSFromOrders

      // Calculate GP
      const grossProfit = totalRevenue - finalCOGS
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

      // Get last order date
      const orderDates = brandOrders
        .map((o) => o.orderDate)
        .filter((d) => d)
        .sort()
        .reverse()
      const lastOrderDate = orderDates[0] || ''

      return {
        name: brandName,
        ordersCount: orderIds.size,
        totalRevenue,
        totalCOGS: finalCOGS,
        grossProfit,
        grossMargin: isNaN(grossMargin) || !isFinite(grossMargin) ? 0 : grossMargin,
        lastOrderDate,
      }
    })
  }, [orders, orderLines])

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedBrands = [...brands].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    // Handle numeric values
    if (typeof aValue === 'string' && !isNaN(Number(aValue))) {
      aValue = Number(aValue)
    }
    if (typeof bValue === 'string' && !isNaN(Number(bValue))) {
      bValue = Number(bValue)
    }

    // Handle dates
    if (sortField === 'lastOrderDate') {
      aValue = aValue || ''
      bValue = bValue || ''
    }

    if (aValue === undefined || aValue === null) return 1
    if (bValue === undefined || bValue === null) return -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    const aStr = String(aValue).toLowerCase()
    const bStr = String(bValue).toLowerCase()

    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="ml-1 h-3 w-3 opacity-30" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Loading from Hungry Tum OS</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Brands</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Overview of all brands and their performance metrics
          </p>
        </div>

        {brands.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <p className="text-gray-500">No brands found</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Brand
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('ordersCount')}
                    >
                      <div className="flex items-center">
                        Orders
                        <SortIcon field="ordersCount" />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('totalRevenue')}
                    >
                      <div className="flex items-center">
                        Total Revenue
                        <SortIcon field="totalRevenue" />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('grossProfit')}
                    >
                      <div className="flex items-center">
                        Gross Profit
                        <SortIcon field="grossProfit" />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('grossMargin')}
                    >
                      <div className="flex items-center">
                        Gross Margin %
                        <SortIcon field="grossMargin" />
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('lastOrderDate')}
                    >
                      <div className="flex items-center">
                        Last Order
                        <SortIcon field="lastOrderDate" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedBrands.map((brand) => (
                    <tr key={brand.name} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <BrandLogoCell brandName={brand.name} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {brand.ordersCount || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrencyNoDecimals(brand.totalRevenue || 0)}
                      </td>
                      <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                        (brand.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrencyNoDecimals(brand.grossProfit || 0)}
                      </td>
                      <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                        (brand.grossMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isNaN(brand.grossMargin || 0) || !isFinite(brand.grossMargin || 0)
                          ? '0.0%'
                          : `${(brand.grossMargin || 0).toFixed(1)}%`}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(brand.lastOrderDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

