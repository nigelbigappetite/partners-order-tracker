'use client'

import { useState, useMemo, useEffect } from 'react'
import { Franchise, Order, OrderLine } from '@/lib/types'
import { matchOrderToLocation, isOrderInDateRange } from '@/lib/locationUtils'
import LocationSidebarItem from './LocationSidebarItem'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface LocationSidebarProps {
  franchises: Franchise[]
  orders: Order[]
  orderLines: OrderLine[]
  selectedLocationId: string | null
  onSelectLocation: (locationId: string) => void
  dateRange: { start: Date; end: Date }
}

interface SiteGroup {
  siteCode: string
  siteName: string
  brands: Franchise[]
}

export default function LocationSidebar({
  franchises,
  orders,
  orderLines,
  selectedLocationId,
  onSelectLocation,
  dateRange,
}: LocationSidebarProps) {
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())

  // Get location metrics for sidebar display - use Orders_Header directly
  const getLocationMetrics = (franchise: Franchise) => {
    const locationOrders = orders.filter((order) => matchOrderToLocation(order, franchise))
    
    // Filter by date range using robust date parsing
    const filteredOrders = locationOrders.filter((order) => 
      isOrderInDateRange(order.orderDate, dateRange)
    )

    // Calculate revenue directly from Orders_Header
    const revenue = filteredOrders.reduce((sum, order) => {
      const orderTotal = Number(order.orderTotal || 0)
      return sum + (isNaN(orderTotal) ? 0 : orderTotal)
    }, 0)
    const orderCount = filteredOrders.length

    return { orderCount, revenue }
  }

  // Group franchises by site (extract site code from franchise code, e.g., "BOL01" -> "BOL")
  const groupFranchisesBySite = useMemo(() => {
    const siteMap = new Map<string, SiteGroup>()

    franchises.forEach((franchise) => {
      // Extract site code (first 3 letters or similar pattern)
      // If code is like "BOL01", site is "BOL"
      // If code is like "BOL", site is "BOL"
      const code = (franchise.code || '').trim()
      let siteCode = code
      
      // Try to extract site prefix (first 3 characters, or up to first number)
      const match = code.match(/^([A-Za-z]+)/)
      if (match) {
        siteCode = match[1].toUpperCase()
      }

      // Use franchise name as site name if available, otherwise use code
      const siteName = franchise.name || code

      if (!siteMap.has(siteCode)) {
        siteMap.set(siteCode, {
          siteCode,
          siteName: siteName.split('–')[0].trim() || siteName.split('-')[0].trim() || siteName, // Extract site name before dash
          brands: [],
        })
      }

      const site = siteMap.get(siteCode)!
      site.brands.push(franchise)
    })

    // Sort brands within each site
    siteMap.forEach((site) => {
      site.brands.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
    })

    return Array.from(siteMap.values()).sort((a, b) => a.siteCode.localeCompare(b.siteCode))
  }, [franchises])

  // Create flat list of all locations for dropdown (including "All Locations" option)
  const allLocations = useMemo(() => {
    const locations: Array<{ code: string; name: string; displayName: string }> = [
      { code: 'ALL', name: 'All Locations', displayName: 'All Locations' }
    ]
    groupFranchisesBySite.forEach((site) => {
      site.brands.forEach((franchise) => {
        locations.push({
          code: franchise.code,
          name: franchise.name || 'Unknown',
          displayName: `${franchise.name || 'Unknown'} (${franchise.code})${franchise.brand ? ` • ${franchise.brand}` : ''}`,
        })
      })
    })
    return locations
  }, [groupFranchisesBySite])

  const toggleSite = (siteCode: string) => {
    const newExpanded = new Set(expandedSites)
    if (newExpanded.has(siteCode)) {
      newExpanded.delete(siteCode)
    } else {
      newExpanded.add(siteCode)
    }
    setExpandedSites(newExpanded)
  }

  // Auto-expand sites that contain the selected location
  useEffect(() => {
    if (selectedLocationId && franchises.length > 0) {
      const selectedFranchise = franchises.find((f) => f.code === selectedLocationId)
      if (selectedFranchise) {
        const code = (selectedFranchise.code || '').trim()
        const match = code.match(/^([A-Za-z]+)/)
        const siteCode = match ? match[1].toUpperCase() : code
        setExpandedSites((prev) => new Set([...Array.from(prev), siteCode]))
      }
    }
  }, [selectedLocationId, franchises])

  const handleLocationSelect = (locationCode: string) => {
    onSelectLocation(locationCode)
    // Auto-expand the site containing this location
    const selectedFranchise = franchises.find((f) => f.code === locationCode)
    if (selectedFranchise) {
      const code = (selectedFranchise.code || '').trim()
      const match = code.match(/^([A-Za-z]+)/)
      const siteCode = match ? match[1].toUpperCase() : code
      setExpandedSites((prev) => new Set([...Array.from(prev), siteCode]))
    }
  }

  if (!franchises || franchises.length === 0) {
    return (
      <div className="h-full w-full border-r border-gray-200 bg-slate-50 md:w-80">
        <div className="p-4">
          <p className="text-sm text-gray-500">No locations available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full border-r border-gray-200 bg-slate-50 md:w-80">
      <div className="sticky top-0 z-10 bg-slate-50 p-4">
        <select
          value={selectedLocationId || ''}
          onChange={(e) => handleLocationSelect(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-white focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Select a location...</option>
          {allLocations.map((location) => (
            <option key={location.code} value={location.code}>
              {location.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-y-auto scrollbar-thin p-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <div className="space-y-2">
          {groupFranchisesBySite.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No locations found</p>
          ) : (
            groupFranchisesBySite.map((site) => {
              const isExpanded = expandedSites.has(site.siteCode)
              const hasSelectedBrand = site.brands.some((f) => f.code === selectedLocationId)

              return (
                <div key={site.siteCode} className="rounded-xl border border-gray-200 bg-white">
                  {/* Site Header */}
                  <button
                    onClick={() => toggleSite(site.siteCode)}
                    className="w-full flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{site.siteName}</p>
                        <p className="text-xs text-gray-500">{site.siteCode}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{site.brands.length} brand{site.brands.length !== 1 ? 's' : ''}</span>
                  </button>

                  {/* Brands List */}
                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {site.brands.map((franchise) => {
                        const metrics = getLocationMetrics(franchise)
                        return (
                          <div key={franchise.code} className="p-2">
                            <LocationSidebarItem
                              franchise={franchise}
                              isSelected={selectedLocationId === franchise.code}
                              onClick={() => onSelectLocation(franchise.code)}
                              orderCount={metrics.orderCount}
                              revenue={metrics.revenue}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
