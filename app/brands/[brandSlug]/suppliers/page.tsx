'use client'

import { useEffect, useState, useMemo } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import { Supplier } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'
import { ChevronUp, ChevronDown } from 'lucide-react'

type SortField = 'name' | 'ordersCount' | 'totalItems' | 'totalRevenue' | 'lastOrderDate'

export default function BrandSuppliersPage() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const [brandName, setBrandName] = useState<string>('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const isAdmin = brandSlug.toLowerCase() === 'admin'

  useEffect(() => {
    fetchBrandName()
    fetchSuppliers()
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

  const fetchSuppliers = async () => {
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
      const response = await fetch(`/api/suppliers?brand=${encodeURIComponent(brandParam)}`)
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
      toast.error(error.message || 'Failed to load suppliers')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

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
          aValue = a.ordersCount || 0
          bValue = b.ordersCount || 0
          break
        case 'totalItems':
          aValue = a.totalItems || 0
          bValue = b.totalItems || 0
          break
        case 'totalRevenue':
          aValue = a.totalValueOrdered || 0
          bValue = b.totalValueOrdered || 0
          break
        case 'lastOrderDate':
          const aDate = a.lastOrderDate || ''
          const bDate = b.lastOrderDate || ''
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
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? 'All Suppliers' : `${brandName} Suppliers`}</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedSuppliers.map((supplier) => (
            <div
              key={supplier.name}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{supplier.name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Value Ordered:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrencyNoDecimals(supplier.totalValueOrdered || 0)}
                  </span>
                </div>
                {supplier.onTimePercentage !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">On-Time %:</span>
                    <span className="font-medium text-gray-900">
                      {supplier.onTimePercentage.toFixed(1)}%
                    </span>
                  </div>
                )}
                {supplier.averageShipTime !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Avg Ship Time:</span>
                    <span className="font-medium text-gray-900">
                      {supplier.averageShipTime} days
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

