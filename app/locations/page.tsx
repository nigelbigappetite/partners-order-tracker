'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import { Franchise, Order, OrderLine } from '@/lib/types'
import toast from 'react-hot-toast'
import LocationDashboard from '@/components/locations/LocationDashboard'

export default function LocationsPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('ALL')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Date range state - default to all time (from epoch to far future)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date()
    end.setFullYear(2099, 11, 31) // Far future date
    end.setHours(23, 59, 59, 999)
    const start = new Date(0) // Epoch (January 1, 1970) - effectively all time
    return { start, end }
  })

  useEffect(() => {
    fetchAllData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData(true) // silent refresh
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Keep "ALL" as default, no need to change it

  const fetchAllData = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }

    try {
      await Promise.all([fetchFranchises(silent), fetchOrders(silent), fetchOrderLines(silent)])
    } catch (error) {
      console.error('Error fetching all data:', error)
      if (!silent) {
        toast.error('Failed to load some data')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const fetchFranchises = async (silent = false) => {
    try {
      const response = await fetch('/api/franchises')
      if (!response.ok) {
        throw new Error('Failed to fetch franchises')
      }
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      const franchisesData = Array.isArray(data) ? data : []
      console.log('[LocationsPage] Fetched franchises:', franchisesData.length)
      if (franchisesData.length > 0) {
        console.log('[LocationsPage] Sample franchise:', franchisesData[0])
      }
      setFranchises(franchisesData)
    } catch (error: any) {
      console.error('Error fetching franchises:', error)
      if (!silent) {
        toast.error(error.message || 'Failed to load franchises')
      }
      setFranchises([])
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
      const ordersData = Array.isArray(data) ? data : []
      console.log('[LocationsPage] Fetched orders:', ordersData.length)
      if (ordersData.length > 0) {
        console.log('[LocationsPage] Sample orders (first 3):', ordersData.slice(0, 3).map(o => ({
          orderId: o.orderId,
          invoiceNo: o.invoiceNo,
          franchisee: o.franchisee,
          orderDate: o.orderDate,
          brand: o.brand,
          orderTotal: o.orderTotal,
        })))
      }
      setOrders(ordersData)
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
      const orderLinesData = Array.isArray(data) ? data : []
      console.log('[LocationsPage] Fetched order lines:', orderLinesData.length)
      if (orderLinesData.length > 0) {
        console.log('[LocationsPage] Sample order lines (first 5):', orderLinesData.slice(0, 5).map(l => ({
          orderId: l.orderId,
          invoiceNo: l.invoiceNo,
          sku: l.sku,
          lineTotal: l.lineTotal,
          cogsTotal: l.cogsTotal,
          quantity: l.quantity,
        })))
        
        // Check for orders with revenue
        const linesWithRevenue = orderLinesData.filter(l => Number(l.lineTotal || 0) > 0)
        console.log('[LocationsPage] Order lines with revenue > 0:', linesWithRevenue.length, 'out of', orderLinesData.length)
      }
      setOrderLines(orderLinesData)
    } catch (error: any) {
      console.error('Error fetching order lines:', error)
      if (!silent) {
        toast.error('Failed to load order lines')
      }
    }
  }

  const selectedFranchise = selectedLocationId === 'ALL' 
    ? null 
    : franchises.find((f) => f.code === selectedLocationId) || null

  // Ensure we have valid date range
  const safeDateRange = dateRange || {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {loading ? (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Loading locations...</p>
          </div>
        </div>
      ) : (
        <div className="h-[calc(100vh-64px)]">
          <LocationDashboard
            franchise={selectedFranchise}
            franchises={franchises || []}
            orders={orders || []}
            orderLines={orderLines || []}
            dateRange={safeDateRange}
            onDateRangeChange={(start, end) => {
              setDateRange({ start, end })
              setSelectedBrand(null) // Reset brand selection when date range changes
            }}
            selectedLocationId={selectedLocationId}
            onSelectLocation={(locationId) => {
              setSelectedLocationId(locationId)
              setSelectedBrand(null) // Reset brand selection when location changes
            }}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
          />
        </div>
      )}
    </div>
  )
}
