'use client'

import { useEffect, useState } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import { Franchise, Order, OrderLine } from '@/lib/types'
import toast from 'react-hot-toast'
import LocationDashboard from '@/components/locations/LocationDashboard'
import { useParams } from 'next/navigation'

export default function BrandLocationsPage() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const [brandName, setBrandName] = useState<string>('')
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>('ALL')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = brandSlug.toLowerCase() === 'admin'

  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date()
    end.setFullYear(2099, 11, 31)
    end.setHours(23, 59, 59, 999)
    const start = new Date(0)
    return { start, end }
  })

  useEffect(() => {
    fetchBrandName()
    fetchAllData()
    
    const interval = setInterval(() => {
      fetchAllData(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [brandSlug])

  const fetchBrandName = async () => {
    try {
      const response = await fetch(`/api/brands/${brandSlug}/name`)
      if (response.ok) {
        const data = await response.json()
        const name = data.brandName || brandSlug
        setBrandName(name)
        // Only auto-select brand if not admin
        if (!isAdmin) {
          setSelectedBrand(name)
        }
      }
    } catch (error) {
      console.error('Error fetching brand name:', error)
      setBrandName(brandSlug)
      setSelectedBrand(brandSlug)
    }
  }

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
      setFranchises(Array.isArray(data) ? data : [])
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
      // For admin, don't filter by brand
      const brandParam = isAdmin ? 'admin' : (brandName || brandSlug)
      const response = await fetch(`/api/orders?brand=${encodeURIComponent(brandParam)}`)
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
        toast.error(error.message || 'Failed to load orders')
      }
      setOrders([])
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
      // Filter order lines by brand (skip filtering for admin)
      if (isAdmin) {
        setOrderLines(Array.isArray(data) ? data : [])
      } else {
        const brandToUse = brandName || brandSlug
        const filtered = (Array.isArray(data) ? data : []).filter((line: OrderLine) => {
          const lineBrand = (line.brand || '').trim()
          return lineBrand.toLowerCase() === brandToUse.toLowerCase()
        })
        setOrderLines(filtered)
      }
    } catch (error: any) {
      console.error('Error fetching order lines:', error)
      if (!silent) {
        toast.error('Failed to load order lines')
      }
      setOrderLines([])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAdmin ? <Navigation /> : <BrandNavigation brandSlug={brandSlug} brandName={brandName} />}
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? <Navigation /> : <BrandNavigation brandSlug={brandSlug} brandName={brandName} />}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <LocationDashboard
          franchise={franchises.find((f) => f.code === selectedLocationId) || null}
          franchises={franchises}
          orders={orders}
          orderLines={orderLines}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
          selectedBrand={selectedBrand}
          onSelectBrand={setSelectedBrand}
        />
      </div>
    </div>
  )
}

