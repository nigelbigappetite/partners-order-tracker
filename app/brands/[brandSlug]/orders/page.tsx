'use client'

import { useEffect, useState, useMemo } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import KPICard from '@/components/KPICard'
import Table from '@/components/Table'
import OrderModal from '@/components/OrderModal'
import StatusPill from '@/components/StatusPill'
import { Order } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'
import { Search } from 'lucide-react'

type SortField = 'orderId' | 'orderDate' | 'franchisee' | 'orderStage' | 'orderTotal'
type SortDirection = 'asc' | 'desc'

function formatCompactOrderReference(orderId?: string, invoiceNo?: string): string {
  const reference = (invoiceNo || orderId || '').replace('#', '')
  if (reference.length <= 8) return reference
  return `${reference.slice(0, 4)}...${reference.slice(-4)}`
}

export default function BrandOrdersPage() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const [brandName, setBrandName] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('orderDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const isAdmin = brandSlug.toLowerCase() === 'admin'

  useEffect(() => {
    fetchBrandName()
    fetchOrders()
  }, [brandSlug])

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

  const fetchOrders = async () => {
    try {
      // Ensure we have brand name first
      let brandToUse = brandName
      if (!brandToUse) {
        const nameResponse = await fetch(`/api/brands/${brandSlug}/name`)
        if (nameResponse.ok) {
          const nameData = await nameResponse.json()
          brandToUse = nameData.brandName || brandSlug
          setBrandName(brandToUse)
        } else {
          brandToUse = brandSlug
        }
      }
      
      // For admin, don't filter by brand
      const brandParam = isAdmin ? 'admin' : brandToUse
      const response = await fetch(`/api/orders?brand=${encodeURIComponent(brandParam)}`)
      if (response.ok) {
        const data = await response.json()
        const ordersData = Array.isArray(data) ? data : []
        
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
        
        setOrders(processedOrders)
      }
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((o) => {
        const invoiceNo = String(o.invoiceNo || '').toLowerCase().replace('#', '')
        const orderId = String(o.orderId || '').toLowerCase().replace('#', '')
        const franchisee = String(o.franchisee || '').toLowerCase()
        return invoiceNo.includes(searchLower) || orderId.includes(searchLower) || franchisee.includes(searchLower)
      })
    }

    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'orderDate') {
        try {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } catch {
          aValue = 0
          bValue = 0
        }
      } else if (sortField === 'orderTotal') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [orders, searchTerm, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const totalOrders = filteredAndSortedOrders.length
  const totalRevenue = filteredAndSortedOrders.reduce((sum, order) => sum + (Number(order.orderTotal) || 0), 0)
  const totalCOGS = filteredAndSortedOrders.reduce((sum, order) => sum + (Number(order.totalCOGS) || 0), 0)
  const grossProfit = totalRevenue - totalCOGS
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const locationPerformance = useMemo(() => {
    const locationMap = new Map<
      string,
      { orders: number; revenue: number; cogs: number; lastOrderDate: string }
    >()

    orders.forEach((order) => {
      const locationName = (order.franchisee || 'Unknown Location').trim() || 'Unknown Location'
      const existing = locationMap.get(locationName) || {
        orders: 0,
        revenue: 0,
        cogs: 0,
        lastOrderDate: '',
      }

      existing.orders += 1
      existing.revenue += Number(order.orderTotal) || 0
      existing.cogs += Number(order.totalCOGS) || 0
      if (order.orderDate && order.orderDate > existing.lastOrderDate) {
        existing.lastOrderDate = order.orderDate
      }

      locationMap.set(locationName, existing)
    })

    return Array.from(locationMap.entries())
      .map(([location, data]) => {
        const gp = data.revenue - data.cogs
        return {
          location,
          orders: data.orders,
          revenue: data.revenue,
          aov: data.orders > 0 ? data.revenue / data.orders : 0,
          grossProfit: gp,
          grossMargin: data.revenue > 0 ? (gp / data.revenue) * 100 : 0,
          lastOrderDate: data.lastOrderDate,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [orders])

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
        <div className="mb-8">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900">
            {isAdmin ? 'All Orders' : `${brandName} Supply Orders`}
          </h1>
        </div>

        {!isAdmin && (
          <div className="mb-3 xs:mb-4 sm:mb-6 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 lg:grid-cols-4">
            <KPICard
              metric={{
                label: 'Total Orders',
                value: totalOrders.toLocaleString(),
              }}
            />
            <KPICard
              metric={{
                label: 'Total Revenue',
                value: formatCurrencyNoDecimals(totalRevenue),
              }}
            />
            <KPICard
              metric={{
                label: 'Gross Profit',
                value: formatCurrencyNoDecimals(grossProfit),
              }}
            />
            <KPICard
              metric={{
                label: 'Gross Margin %',
                value: `${grossMargin.toFixed(1)}%`,
              }}
            />
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Table
            headers={['Order', 'Date', 'Franchisee', 'Stage', 'Total']}
            maxHeight="calc(100vh - 300px)"
            stickyHeader={true}
          >
            {filteredAndSortedOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredAndSortedOrders.map((order) => (
                <tr
                  key={order.invoiceNo || `${order.orderId}-${order.brand || ''}`}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    const identifier = order.invoiceNo || order.orderId
                    setSelectedOrderId(identifier)
                    setSelectedOrder(order)
                    setIsModalOpen(true)
                  }}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCompactOrderReference(order.orderId, order.invoiceNo)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {order.orderDate}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {order.franchisee}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    <StatusPill status={order.orderStage} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrencyNoDecimals(order.orderTotal)}
                  </td>
                </tr>
              ))
            )}
          </Table>
        </div>

        {!isAdmin && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Location Performance</h2>
              <p className="mt-1 text-sm text-gray-500">
                Supply-order performance by franchise location.
              </p>
            </div>

            <Table
              headers={['Location', 'Orders', 'Revenue', 'AOV', 'GP', 'GP %', 'Last Order']}
              maxHeight="420px"
              stickyHeader={true}
            >
              {locationPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-400">
                    No location data found
                  </td>
                </tr>
              ) : (
                locationPerformance.map((locationRow) => (
                  <tr key={locationRow.location} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {locationRow.location}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {locationRow.orders.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrencyNoDecimals(locationRow.revenue)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatCurrencyNoDecimals(locationRow.aov)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                        locationRow.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrencyNoDecimals(locationRow.grossProfit)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                        locationRow.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {locationRow.grossMargin.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {locationRow.lastOrderDate || '—'}
                    </td>
                  </tr>
                ))
              )}
            </Table>
          </div>
        )}

        {isModalOpen && selectedOrderId && (
          <OrderModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedOrderId(null)
              setSelectedOrder(null)
            }}
            orderId={selectedOrderId}
            initialOrder={selectedOrder}
            brandSlug={brandSlug}
          />
        )}
      </div>
    </div>
  )
}
