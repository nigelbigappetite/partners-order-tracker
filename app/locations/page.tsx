'use client'

import { FormEvent, useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import { Franchise, Order, OrderLine } from '@/lib/types'
import toast from 'react-hot-toast'
import LocationDashboard from '@/components/locations/LocationDashboard'
import Modal from '@/components/Modal'

export default function LocationsPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('ALL')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [newLocation, setNewLocation] = useState({
    code: '',
    name: '',
    city: '',
    country: 'ENG',
    status: 'ACTIVE',
    activeBrands: '',
  })

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

  const handleCreateLocation = async (e: FormEvent) => {
    e.preventDefault()

    if (!newLocation.code.trim() || !newLocation.name.trim()) {
      toast.error('Franchisee Code and Franchisee Name are required')
      return
    }

    try {
      setSavingLocation(true)
      const response = await fetch('/api/franchises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      })

      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to add location')
      }

      toast.success('Location added to Franchisee_Master')
      setIsAddLocationOpen(false)
      setNewLocation({
        code: '',
        name: '',
        city: '',
        country: 'ENG',
        status: 'ACTIVE',
        activeBrands: '',
      })

      // Refresh data silently
      await fetchAllData(true)
    } catch (error: any) {
      console.error('Error creating location:', error)
      toast.error(error.message || 'Failed to add location')
    } finally {
      setSavingLocation(false)
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
            <p className="text-gray-600">Loading from Hungry Tum OS</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-[calc(100vh-64px)] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h1 className="text-lg font-semibold text-gray-900">Locations</h1>
              <button
                type="button"
                onClick={() => setIsAddLocationOpen(true)}
                className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                Add Location
              </button>
            </div>
            <div className="flex-1">
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
          </div>

          <Modal
            isOpen={isAddLocationOpen}
            onClose={() => !savingLocation && setIsAddLocationOpen(false)}
            title="Add New Location to Franchisee_Master"
          >
            <form onSubmit={handleCreateLocation} className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Franchisee Code *
                  </label>
                  <input
                    type="text"
                    value={newLocation.code}
                    onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. BETH01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Franchisee Name *
                  </label>
                  <input
                    type="text"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. WING SHACK CO- BETHNAL GREEN"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newLocation.city}
                    onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. BETHNAL GREEN"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={newLocation.country}
                    onChange={(e) => setNewLocation({ ...newLocation, country: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. ENG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    value={newLocation.status}
                    onChange={(e) => setNewLocation({ ...newLocation, status: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. ACTIVE"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active Brands
                  </label>
                  <input
                    type="text"
                    value={newLocation.activeBrands}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, activeBrands: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. WING SHACK CO, SMSH BN"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => !savingLocation && setIsAddLocationOpen(false)}
                  className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
                  disabled={savingLocation}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-60"
                  disabled={savingLocation}
                >
                  {savingLocation ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  )
}
