'use client'

import { useState, useEffect, useRef } from 'react'
import { Franchise, Order, OrderLine, LocationMetrics, BrandMetrics, SKUMetrics } from '@/lib/types'
import {
  matchOrderToLocation,
  isOrderInDateRange,
  parseOrderDate,
} from '@/lib/locationUtils'
import { format } from 'date-fns'
import DateRangePicker from './DateRangePicker'
import LocationOverviewCards from './LocationOverviewCards'
import LocationBrandPerformance from './LocationBrandPerformance'
import LocationBrandDrilldown from './LocationBrandDrilldown'
import LocationOrderHistory from './LocationOrderHistory'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'

interface LocationDashboardProps {
  franchise: Franchise | null
  franchises: Franchise[]
  orders: Order[]
  orderLines: OrderLine[]
  dateRange: { start: Date; end: Date }
  onDateRangeChange: (start: Date, end: Date) => void
  selectedLocationId: string | null
  onSelectLocation: (locationId: string) => void
  selectedBrand: string | null
  onSelectBrand: (brand: string | null) => void
}

export default function LocationDashboard({
  franchise,
  franchises,
  orders,
  orderLines,
  dateRange,
  onDateRangeChange,
  selectedLocationId,
  onSelectLocation,
  selectedBrand,
  onSelectBrand,
}: LocationDashboardProps) {
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const dateRangeRef = useRef<HTMLDivElement>(null)
  const isAllLocations = !franchise
  
  // Debug: Log when brand selection changes
  useEffect(() => {
    console.log('[LocationDashboard] 🔍 Brand Selection Changed:', {
      selectedBrand,
      isAllLocations,
      franchise: franchise ? { code: franchise.code, name: franchise.name } : null,
    })
  }, [selectedBrand, isAllLocations, franchise])

  // Close date range picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target as Node)) {
        setIsDateRangeOpen(false)
      }
    }

    if (isDateRangeOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDateRangeOpen])

  // Filter orders by location (or all locations), brand, and date range
  const locationOrders = orders.filter((order) => {
    // Filter by date range first
    if (!isOrderInDateRange(order.orderDate, dateRange)) {
      return false
    }
    
    // If "All Locations", include all orders (just filter by brand if selected)
    if (isAllLocations) {
      // For "All Locations", filter by brand if selected
      if (selectedBrand) {
        const orderBrand = (order.brand || '').trim()
        const selectedBrandTrimmed = selectedBrand.trim()
        if (orderBrand !== selectedBrandTrimmed) {
          return false
        }
      }
      return true
    }
    
    // Filter by specific location using enhanced matching
    if (!franchise || !matchOrderToLocation(order, franchise)) {
      return false
    }
    
    // If a brand is selected, filter by brand
    if (selectedBrand) {
      const orderBrand = (order.brand || '').trim()
      const selectedBrandTrimmed = selectedBrand.trim()
      if (orderBrand !== selectedBrandTrimmed) {
        return false
      }
    }
    
    return true
  })
  
  // Debug: Log filtering results
  if (process.env.NODE_ENV === 'development') {
    // Check for orders that should be filtered out but aren't
    const ordersWithWrongBrand = locationOrders.filter((o) => {
      if (!selectedBrand) return false
      const orderBrand = (o.brand || '').trim()
      const selectedBrandTrimmed = selectedBrand.trim()
      return orderBrand !== selectedBrandTrimmed
    })
    
    console.log('[LocationDashboard] 🔍 Order Filtering Debug:', {
      selectedLocationId,
      isAllLocations,
      selectedBrand,
      selectedBrandTrimmed: selectedBrand ? selectedBrand.trim() : null,
      franchise: franchise ? { code: franchise.code, name: franchise.name } : null,
      totalOrders: orders.length,
      filteredLocationOrders: locationOrders.length,
      ordersWithWrongBrand: ordersWithWrongBrand.length,
      sampleWrongBrandOrders: ordersWithWrongBrand.slice(0, 3).map(o => ({
        orderId: o.orderId,
        brand: o.brand,
        brandTrimmed: (o.brand || '').trim(),
        matches: (o.brand || '').trim() === (selectedBrand || '').trim(),
        franchisee: o.franchisee,
      })),
      sampleFilteredOrders: locationOrders.slice(0, 5).map(o => ({
        orderId: o.orderId,
        brand: o.brand,
        brandTrimmed: (o.brand || '').trim(),
        matches: selectedBrand ? (o.brand || '').trim() === selectedBrand.trim() : true,
        franchisee: o.franchisee,
        orderTotal: o.orderTotal,
      })),
      sampleAllOrders: orders.slice(0, 5).map(o => ({
        orderId: o.orderId,
        brand: o.brand,
        brandTrimmed: (o.brand || '').trim(),
        franchisee: o.franchisee,
      })),
    })
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[LocationDashboard] Filtering debug:', {
      isAllLocations,
      selectedLocationId,
      franchise: franchise ? { code: franchise.code, name: franchise.name } : null,
      selectedBrand,
      totalOrders: orders.length,
      locationOrders: locationOrders.length,
      dateRange: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() },
      sampleLocationOrders: locationOrders.slice(0, 5).map(o => ({
        orderId: o.orderId,
        franchisee: o.franchisee,
        brand: o.brand,
        orderTotal: o.orderTotal,
      })),
      sampleAllOrders: orders.slice(0, 5).map(o => ({
        orderId: o.orderId,
        franchisee: o.franchisee,
        brand: o.brand,
      })),
    })
    
    if (locationOrders.length === 0 && orders.length > 0) {
      console.warn('[LocationDashboard] No orders matched!', {
        isAllLocations,
        franchiseCode: franchise?.code,
        sampleOrders: orders.slice(0, 3).map(o => ({
          orderId: o.orderId,
          franchisee: o.franchisee,
          orderDate: o.orderDate,
          brand: o.brand,
        })),
      })
    }
  }

  // Normalize order IDs for matching (remove ALL #, trim, lowercase)
  const normalizeOrderId = (id: string): string => {
    if (!id) return ''
    return id.toString().replace(/#/g, '').trim().toLowerCase()
  }
  
  // Normalize invoice numbers for matching
  const normalizeInvoiceNo = (inv: string): string => {
    if (!inv) return ''
    return inv.toString().trim().toLowerCase()
  }
  
  // Create sets of both order IDs and invoice numbers for matching
  const orderIds = new Set(locationOrders.map((o) => normalizeOrderId(o.orderId)))
  const invoiceNos = new Set(
    locationOrders
      .map((o) => o.invoiceNo)
      .filter((inv): inv is string => !!inv)
      .map((inv) => normalizeInvoiceNo(inv))
  )
  
  // Match order lines by orderId OR invoiceNo
  const filteredOrderLines = orderLines.filter((line) => {
    const normalizedLineOrderId = normalizeOrderId(line.orderId)
    const normalizedLineInvoiceNo = normalizeInvoiceNo(line.invoiceNo || '')
    
    // Match by order ID
    if (orderIds.has(normalizedLineOrderId)) {
      return true
    }
    
    // Match by invoice number (if available)
    if (normalizedLineInvoiceNo && invoiceNos.has(normalizedLineInvoiceNo)) {
      return true
    }
    
    return false
  })
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[LocationDashboard] Order matching debug:', {
      locationOrdersCount: locationOrders.length,
      orderIds: Array.from(orderIds).slice(0, 10),
      invoiceNos: Array.from(invoiceNos).slice(0, 10),
      totalOrderLines: orderLines.length,
      matchedOrderLines: filteredOrderLines.length,
      sampleLocationOrders: locationOrders.slice(0, 5).map(o => ({
        orderId: o.orderId,
        normalizedOrderId: normalizeOrderId(o.orderId),
        invoiceNo: o.invoiceNo,
        normalizedInvoiceNo: normalizeInvoiceNo(o.invoiceNo || ''),
        franchisee: o.franchisee,
        orderDate: o.orderDate,
      })),
      sampleOrderLines: orderLines.slice(0, 5).map(l => ({
        orderId: l.orderId,
        normalizedOrderId: normalizeOrderId(l.orderId),
        invoiceNo: l.invoiceNo,
        normalizedInvoiceNo: normalizeInvoiceNo(l.invoiceNo || ''),
        lineTotal: l.lineTotal,
        cogsTotal: l.cogsTotal,
        quantity: l.quantity,
      })),
    })
    
    if (locationOrders.length > 0 && filteredOrderLines.length === 0) {
      console.error('[LocationDashboard] ❌ No order lines matched!', {
        locationOrderIds: Array.from(orderIds).slice(0, 10),
        locationInvoiceNos: Array.from(invoiceNos).slice(0, 10),
        sampleOrderLineIds: orderLines.slice(0, 10).map(l => ({
          raw: l.orderId,
          normalized: normalizeOrderId(l.orderId),
        })),
        sampleOrderLineInvoiceNos: orderLines.slice(0, 10).map(l => ({
          raw: l.invoiceNo || 'N/A',
          normalized: normalizeInvoiceNo(l.invoiceNo || ''),
        })),
      })
    } else if (filteredOrderLines.length > 0) {
      console.log('[LocationDashboard] ✅ Order lines matched successfully:', {
        matchedCount: filteredOrderLines.length,
        sampleMatched: filteredOrderLines.slice(0, 3).map(l => ({
          orderId: l.orderId,
          invoiceNo: l.invoiceNo,
          lineTotal: l.lineTotal,
          cogsTotal: l.cogsTotal,
        })),
      })
    }
  }

  // Calculate location metrics directly from Orders_Header (no need to aggregate from Order_Lines)
  const totalOrders = locationOrders.length
  const totalRevenue = locationOrders.reduce((sum, order) => {
    const orderTotal = Number(order.orderTotal || 0)
    return sum + (isNaN(orderTotal) ? 0 : orderTotal)
  }, 0)
  
  const totalCOGS = locationOrders.reduce((sum, order) => {
    const orderCOGS = Number(order.totalCOGS || 0)
    return sum + (isNaN(orderCOGS) ? 0 : orderCOGS)
  }, 0)
  
  const grossProfit = locationOrders.reduce((sum, order) => {
    // Use grossProfit from order if available, otherwise calculate
    if (order.grossProfit !== undefined) {
      return sum + Number(order.grossProfit)
    }
    // Fallback: calculate from orderTotal - totalCOGS
    const orderTotal = Number(order.orderTotal || 0)
    const orderCOGS = Number(order.totalCOGS || 0)
    return sum + (orderTotal - orderCOGS)
  }, 0)
  
  // Calculate gross margin
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  // Calculate total items from order lines (for display purposes)
  const totalItems = filteredOrderLines.reduce((sum, line) => {
    const quantity = Number(line.quantity || 0)
    return sum + (isNaN(quantity) ? 0 : quantity)
  }, 0)

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[LocationDashboard] Metrics from Orders_Header:', {
      isAllLocations,
      franchise: franchise ? { code: franchise.code, name: franchise.name } : null,
      totalOrders: orders.length,
      locationOrders: locationOrders.length,
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossMargin,
      avgOrderValue,
      totalItems,
      sampleOrders: locationOrders.slice(0, 3).map(o => ({
        orderId: o.orderId,
        orderTotal: o.orderTotal,
        totalCOGS: o.totalCOGS,
        grossProfit: o.grossProfit,
        franchisee: o.franchisee,
      })),
    })
  }

  const locationMetrics: LocationMetrics = {
    totalRevenue,
    totalCOGS,
    grossProfit,
    grossMargin: isNaN(grossMargin) || !isFinite(grossMargin) ? 0 : grossMargin,
    totalOrders,
    avgOrderValue: isNaN(avgOrderValue) || !isFinite(avgOrderValue) ? 0 : avgOrderValue,
    totalItems,
  }

  // Calculate brand metrics directly from Orders_Header
  const brandMap = new Map<string, { revenue: number; cogs: number; orderIds: Set<string> }>()
  locationOrders.forEach((order) => {
    if (!order.brand) return

    const brand = order.brand.trim()
    if (!brand) return

    if (!brandMap.has(brand)) {
      brandMap.set(brand, { revenue: 0, cogs: 0, orderIds: new Set() })
    }

    const brandData = brandMap.get(brand)!
    const orderTotal = Number(order.orderTotal || 0)
    const orderCOGS = Number(order.totalCOGS || 0)
    
    brandData.revenue += orderTotal
    brandData.cogs += orderCOGS
    brandData.orderIds.add(order.orderId)
  })

  const brandMetrics: BrandMetrics[] = Array.from(brandMap.entries())
    .map(([brand, data]) => {
      const brandGrossProfit = data.revenue - data.cogs
      const brandGrossMargin = data.revenue > 0 ? (brandGrossProfit / data.revenue) * 100 : 0
      const revenueShare = locationMetrics.totalRevenue > 0 
        ? (data.revenue / locationMetrics.totalRevenue) * 100 
        : 0

      return {
        brand,
        revenue: data.revenue,
        cogs: data.cogs,
        grossProfit: brandGrossProfit,
        grossMargin: brandGrossMargin,
        orders: data.orderIds.size,
        revenueShare,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // Calculate SKU metrics for selected brand (works for both "All Locations" and specific locations)
  const skuMetrics: SKUMetrics[] = selectedBrand
    ? (() => {
        // Filter orders for the selected brand (locationOrders is already filtered by location and brand)
        const brandOrders = locationOrders.filter((o) => {
          const orderBrand = (o.brand || '').trim()
          const selectedBrandTrimmed = selectedBrand.trim()
          return orderBrand === selectedBrandTrimmed
        })
        
        console.log('[LocationDashboard] 🔍 SKU Calculation - Brand Orders:', {
          selectedBrand,
          locationOrdersCount: locationOrders.length,
          brandOrdersCount: brandOrders.length,
          sampleBrandOrders: brandOrders.slice(0, 3).map(o => ({
            orderId: o.orderId,
            invoiceNo: o.invoiceNo,
            brand: o.brand,
          })),
        })
        
        // Create maps to uniquely identify orders (handles duplicate order IDs across brands)
        // Map 1: invoiceNo -> order (most reliable, should be unique)
        const ordersByInvoiceNo = new Map<string, typeof brandOrders[0]>()
        // Map 2: orderId -> array of orders (since orderId can be duplicated across brands)
        const ordersByOrderId = new Map<string, Array<typeof brandOrders[0]>>()
        
        brandOrders.forEach((o) => {
          const normalizedOrderId = normalizeOrderId(o.orderId)
          const normalizedInvoiceNo = o.invoiceNo ? normalizeInvoiceNo(o.invoiceNo) : null
          
          // Index by invoiceNo (should be unique)
          if (normalizedInvoiceNo) {
            ordersByInvoiceNo.set(normalizedInvoiceNo, o)
          }
          
          // Index by orderId (may have duplicates, so store array)
          if (!ordersByOrderId.has(normalizedOrderId)) {
            ordersByOrderId.set(normalizedOrderId, [])
          }
          ordersByOrderId.get(normalizedOrderId)!.push(o)
        })
        
        console.log('[LocationDashboard] 🔍 SKU Calculation - Matching IDs:', {
          brandOrdersCount: brandOrders.length,
          uniqueInvoiceNos: ordersByInvoiceNo.size,
          uniqueOrderIds: ordersByOrderId.size,
          duplicateOrderIds: Array.from(ordersByOrderId.entries())
            .filter(([_, orders]) => orders.length > 1)
            .map(([orderId, orders]) => ({
              orderId,
              count: orders.length,
              brands: orders.map(o => o.brand),
            })),
          totalOrderLines: orderLines.length,
        })
        
        // Match order lines directly by brand (simplest and most reliable)
        // Since order lines have brand information, we can filter directly
        const selectedBrandTrimmed = selectedBrand.trim()
        const brandLines = orderLines.filter((line) => {
          const lineBrand = (line.brand || '').trim()
          
          // Direct brand match (most reliable)
          if (lineBrand === selectedBrandTrimmed) {
            return true
          }
          
          // Fallback: Match by orderId/invoiceNo AND verify brand from order
          // This handles cases where order line brand might be missing
          const normalizedLineOrderId = normalizeOrderId(line.orderId)
          const normalizedLineInvoiceNo = line.invoiceNo ? normalizeInvoiceNo(line.invoiceNo) : null
          
          // Try matching by invoiceNo first
          if (normalizedLineInvoiceNo) {
            const matchedOrder = ordersByInvoiceNo.get(normalizedLineInvoiceNo)
            if (matchedOrder) {
              const orderBrand = (matchedOrder.brand || '').trim()
              if (orderBrand === selectedBrandTrimmed) {
                return true
              }
            }
          }
          
          // Try matching by orderId
          const matchedOrders = ordersByOrderId.get(normalizedLineOrderId)
          if (matchedOrders) {
            const matchingOrder = matchedOrders.find(
              (o) => (o.brand || '').trim() === selectedBrandTrimmed
            )
            if (matchingOrder) {
              return true
            }
          }
          
          return false
        })
        
        // Detailed debugging for SKU matching
        console.log('[LocationDashboard] 🔍 SKU Matching Details:', {
          selectedBrand,
          brandOrdersCount: brandOrders.length,
          totalOrderLines: orderLines.length,
          matchedBrandLines: brandLines.length,
          sampleBrandOrders: brandOrders.slice(0, 3).map(o => ({
            orderId: o.orderId,
            normalizedOrderId: normalizeOrderId(o.orderId),
            invoiceNo: o.invoiceNo,
            normalizedInvoiceNo: o.invoiceNo ? normalizeInvoiceNo(o.invoiceNo) : null,
            brand: o.brand,
          })),
          sampleOrderLines: orderLines.slice(0, 5).map(l => ({
            orderId: l.orderId,
            normalizedOrderId: normalizeOrderId(l.orderId),
            invoiceNo: l.invoiceNo,
            normalizedInvoiceNo: l.invoiceNo ? normalizeInvoiceNo(l.invoiceNo) : null,
            brand: l.brand,
            sku: l.sku,
            productName: l.productName,
          })),
          matchingAttempts: orderLines.slice(0, 10).map(l => {
            const normalizedLineOrderId = normalizeOrderId(l.orderId)
            const normalizedLineInvoiceNo = l.invoiceNo ? normalizeInvoiceNo(l.invoiceNo) : null
            const matchedByInvoice = normalizedLineInvoiceNo ? ordersByInvoiceNo.get(normalizedLineInvoiceNo) : null
            const matchedByOrderId = ordersByOrderId.get(normalizedLineOrderId)
            return {
              lineOrderId: l.orderId,
              normalizedLineOrderId,
              lineInvoiceNo: l.invoiceNo,
              normalizedLineInvoiceNo,
              matchedByInvoice: matchedByInvoice ? {
                orderId: matchedByInvoice.orderId,
                brand: matchedByInvoice.brand,
                brandMatches: (matchedByInvoice.brand || '').trim() === selectedBrand.trim(),
              } : null,
              matchedByOrderId: matchedByOrderId ? matchedByOrderId.map(o => ({
                orderId: o.orderId,
                brand: o.brand,
                brandMatches: (o.brand || '').trim() === selectedBrand.trim(),
              })) : null,
            }
          }),
        })
        
        console.log('[LocationDashboard] 🔍 SKU Calculation - Matched Lines:', {
          brandLinesCount: brandLines.length,
          sampleBrandLines: brandLines.slice(0, 5).map(l => ({
            orderId: l.orderId,
            normalizedOrderId: normalizeOrderId(l.orderId),
            invoiceNo: l.invoiceNo,
            normalizedInvoiceNo: normalizeInvoiceNo(l.invoiceNo || ''),
            sku: l.sku,
            productName: l.productName,
            lineTotal: l.lineTotal,
          })),
        })

        const skuMap = new Map<
          string,
          { productName: string; quantity: number; revenue: number; cogs: number }
        >()

        brandLines.forEach((line) => {
          const sku = (line.sku || 'Unknown').toString().trim()
          if (!sku || sku === 'Unknown') return // Skip lines without SKU
          
          if (!skuMap.has(sku)) {
            skuMap.set(sku, {
              productName: (line.productName || 'Unknown Product').toString().trim(),
              quantity: 0,
              revenue: 0,
              cogs: 0,
            })
          }

          const skuData = skuMap.get(sku)!
          const quantity = Number(line.quantity || 0)
          const revenue = Number(line.lineTotal || 0)
          const cogs = Number(line.cogsTotal || 0)
          
          skuData.quantity += isNaN(quantity) ? 0 : quantity
          skuData.revenue += isNaN(revenue) ? 0 : revenue
          skuData.cogs += isNaN(cogs) ? 0 : cogs
        })
        
        console.log('[LocationDashboard] 🔍 SKU Metrics Final Result:', {
          selectedBrand,
          brandOrdersCount: brandOrders.length,
          brandLinesCount: brandLines.length,
          skuMetricsCount: skuMap.size,
          skuMetrics: Array.from(skuMap.entries()).slice(0, 5).map(([sku, data]) => ({
            sku,
            productName: data.productName,
            quantity: data.quantity,
            revenue: data.revenue,
            cogs: data.cogs,
          })),
        })

        return Array.from(skuMap.entries())
          .map(([sku, data]) => {
            const margin = data.revenue - data.cogs
            const marginPercent = data.revenue > 0 ? (margin / data.revenue) * 100 : 0

            return {
              sku,
              productName: data.productName,
              quantity: data.quantity,
              revenue: data.revenue,
              cogs: data.cogs,
              margin,
              marginPercent: isNaN(marginPercent) || !isFinite(marginPercent) ? 0 : marginPercent,
            }
          })
          .sort((a, b) => b.revenue - a.revenue)
      })()
    : []

  // Get unique franchises (group by code, not by brand)
  const uniqueFranchises = Array.from(
    new Map(franchises.map((f) => [f.code, f])).values()
  ).filter((f) => f.code) // Only include franchises with codes

  // Create location options for dropdown (only franchises, not per brand)
  const locationOptions = [
    { code: 'ALL', name: 'All Locations', displayName: 'All Locations' },
    ...uniqueFranchises.map((f) => ({
      code: f.code,
      name: f.name,
      displayName: `${f.name}${f.code ? ` (${f.code})` : ''}`,
    })),
  ]

  // Active locations = unique location codes where status is not INACTIVE
  const activeLocationsCount = (() => {
    const activeCodes = new Set(
      franchises
        .filter((f) => (f.status || 'ACTIVE').toString().toUpperCase() !== 'INACTIVE')
        .map((f) => f.code)
        .filter(Boolean)
    )
    return activeCodes.size
  })()

  // Get available brands for the selected franchise
  const availableBrands = isAllLocations
    ? Array.from(new Set(orders.map((o) => o.brand).filter(Boolean))).sort()
    : Array.from(
        new Set(
          franchises
            .filter((f) => f.code === franchise?.code)
            .map((f) => f.brand)
            .filter(Boolean)
        )
      ).sort()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="min-w-[250px]">
                <label htmlFor="location-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="location-select"
                  value={selectedLocationId || 'ALL'}
                  onChange={(e) => {
                    onSelectLocation(e.target.value)
                    onSelectBrand(null) // Reset brand when location changes
                  }}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {locationOptions.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.displayName}
                    </option>
                  ))}
                </select>
              </div>
              {!isAllLocations && availableBrands.length > 0 && (
                <div className="min-w-[200px]">
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand || 'ALL'}
                    onChange={(e) => onSelectBrand(e.target.value === 'ALL' ? null : e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">All Brands</option>
                    {availableBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isAllLocations && availableBrands.length > 0 && (
                <div className="min-w-[200px]">
                  <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    id="brand-select"
                    value={selectedBrand || 'ALL'}
                    onChange={(e) => onSelectBrand(e.target.value === 'ALL' ? null : e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">All Brands</option>
                    {availableBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isAllLocations 
                    ? selectedBrand 
                      ? `All Locations • ${selectedBrand}`
                      : 'All Locations'
                    : selectedBrand
                      ? `${franchise?.name || 'Select Location'} • ${selectedBrand}`
                      : franchise?.name || 'Select Location'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {isAllLocations 
                    ? selectedBrand
                      ? `Aggregated metrics for ${selectedBrand} across all locations`
                      : 'Aggregated metrics across all locations'
                    : selectedBrand
                      ? `${franchise?.code || 'N/A'} • ${selectedBrand}`
                      : `${franchise?.code || 'N/A'}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Display */}
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500">Date Range</div>
              <div className="text-sm text-gray-700">
                {dateRange.start.getTime() === new Date(0).getTime() && dateRange.end.getFullYear() >= 2099
                  ? 'All Time'
                  : `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`}
              </div>
            </div>
            <div className="relative" ref={dateRangeRef}>
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Change</span>
                {isDateRangeOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {isDateRangeOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  <DateRangePicker
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onChange={(start, end) => {
                      onDateRangeChange(start, end)
                      setIsDateRangeOpen(false) // Close after selection
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 p-6">
        {/* Active Locations Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] max-w-xs">
          <p className="text-sm font-medium text-gray-600">Active Locations</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeLocationsCount}</p>
        </div>
        {/* Overview Cards */}
        <LocationOverviewCards metrics={locationMetrics} />

        {/* Brand Performance */}
        <LocationBrandPerformance
          brandMetrics={brandMetrics}
          selectedBrand={selectedBrand}
          onSelectBrand={onSelectBrand}
        />

        {/* Brand Drilldown - Show SKU/product details when a brand is selected */}
        {selectedBrand && (
          <LocationBrandDrilldown
            brand={selectedBrand}
            locationName={isAllLocations ? 'All Locations' : (franchise?.name || 'Location')}
            skuMetrics={skuMetrics}
          />
        )}

        {/* Order History */}
        <LocationOrderHistory orders={locationOrders} orderLines={[]} />
      </div>
    </div>
  )
}

