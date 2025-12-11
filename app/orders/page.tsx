'use client'

import { useEffect, useState, useMemo } from 'react'
import Navigation from '@/components/Navigation'
import Table from '@/components/Table'
import OrderModal from '@/components/OrderModal'
import StatusPill from '@/components/StatusPill'
import { Order } from '@/lib/types'
import { formatCurrencyNoDecimals, formatOrderId } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Search, X, ChevronUp, ChevronDown, Filter, ChevronRight } from 'lucide-react'

type SortField = 'orderId' | 'orderDate' | 'franchisee' | 'brand' | 'orderStage' | 'orderTotal' | 'daysOpen'
type SortDirection = 'asc' | 'desc'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('orderDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        const ordersData = Array.isArray(data) ? data : []
        
        // Process orders similar to dashboard
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

  // Get unique values for filters
  const uniqueFranchises = useMemo(() => {
    const franchises = new Set<string>()
    orders.forEach((o) => {
      if (o.franchisee) franchises.add(o.franchisee)
    })
    return Array.from(franchises).sort()
  }, [orders])

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>()
    orders.forEach((o) => {
      if (o.brand) brands.add(o.brand)
    })
    return Array.from(brands).sort()
  }, [orders])

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>()
    // Suppliers are typically in order lines, not directly on orders
    // For now, we'll extract from any supplier field if it exists
    orders.forEach((o) => {
      if ((o as any).supplier) suppliers.add((o as any).supplier)
      // Also check for supplier in other fields
      if ((o as any).Supplier) suppliers.add((o as any).Supplier)
    })
    return Array.from(suppliers).sort()
  }, [orders])

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders]

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((o) => {
        const orderId = String(o.orderId || '').toLowerCase().replace('#', '')
        const franchisee = String(o.franchisee || '').toLowerCase()
        const brand = String(o.brand || '').toLowerCase()
        return (
          orderId.includes(searchLower) ||
          franchisee.includes(searchLower) ||
          brand.includes(searchLower)
        )
      })
    }

    // Franchise filter
    if (selectedFranchises.length > 0) {
      filtered = filtered.filter((o) => {
        const franchisee = String(o.franchisee || '').trim()
        return selectedFranchises.some((selected) => selected.trim() === franchisee)
      })
    }

    // Brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((o) => {
        const brand = String(o.brand || '').trim()
        return selectedBrands.some((selected) => selected.trim() === brand)
      })
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((o) => {
        try {
          const dateStr = o.orderDate
          let orderDate: Date
          if (dateStr.includes('/')) {
            const [month, day, year] = dateStr.split('/')
            orderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else {
            orderDate = new Date(dateStr)
          }
          orderDate.setHours(0, 0, 0, 0)
          return !isNaN(orderDate.getTime()) && orderDate >= fromDate
        } catch {
          return false
        }
      })
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter((o) => {
        try {
          const dateStr = o.orderDate
          let orderDate: Date
          if (dateStr.includes('/')) {
            const [month, day, year] = dateStr.split('/')
            orderDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else {
            orderDate = new Date(dateStr)
          }
          orderDate.setHours(0, 0, 0, 0)
          return !isNaN(orderDate.getTime()) && orderDate <= toDate
        } catch {
          return false
        }
      })
    }

    // Supplier filter (if supplier data is available)
    if (selectedSuppliers.length > 0) {
      filtered = filtered.filter((o) => {
        const orderSupplier = (o as any).supplier || ''
        return selectedSuppliers.includes(orderSupplier)
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date sorting
      if (sortField === 'orderDate') {
        try {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } catch {
          aValue = 0
          bValue = 0
        }
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [orders, searchTerm, selectedFranchises, selectedBrands, dateFrom, dateTo, selectedSuppliers, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleRowClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsModalOpen(true)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedFranchises([])
    setSelectedBrands([])
    setDateFrom('')
    setDateTo('')
    setSelectedSuppliers([])
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (selectedFranchises.length > 0) count++
    if (selectedBrands.length > 0) count++
    if (dateFrom) count++
    if (dateTo) count++
    if (selectedSuppliers.length > 0) count++
    return count
  }, [searchTerm, selectedFranchises, selectedBrands, dateFrom, dateTo, selectedSuppliers])

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
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orders Database</h1>
          <p className="mt-2 text-gray-600">All orders with advanced filtering</p>
        </div>

        {/* Compact Filters Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search - Always visible */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/70 focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">
                {activeFiltersCount}
              </span>
            )}
            <ChevronRight
              className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-90' : ''}`}
            />
          </button>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Expandable Filters Panel */}
        {filtersExpanded && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Franchise Filter */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Franchise</label>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white scrollbar-thin">
                  {uniqueFranchises.map((franchise) => (
                    <label
                      key={franchise}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFranchises.includes(franchise)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFranchises([...selectedFranchises, franchise])
                          } else {
                            setSelectedFranchises(selectedFranchises.filter((f) => f !== franchise))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700">{franchise}</span>
                    </label>
                  ))}
                </div>
                {selectedFranchises.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{selectedFranchises.length} selected</p>
                )}
              </div>

              {/* Brand Filter */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Brand</label>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white scrollbar-thin">
                  {uniqueBrands.map((brand) => (
                    <label
                      key={brand}
                      className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBrands([...selectedBrands, brand])
                          } else {
                            setSelectedBrands(selectedBrands.filter((b) => b !== brand))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700">{brand}</span>
                    </label>
                  ))}
                </div>
                {selectedBrands.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500">{selectedBrands.length} selected</p>
                )}
              </div>

              {/* Supplier Filter */}
              {uniqueSuppliers.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">Supplier</label>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-300 bg-white scrollbar-thin">
                    {uniqueSuppliers.map((supplier) => (
                      <label
                        key={supplier}
                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSuppliers.includes(supplier)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuppliers([...selectedSuppliers, supplier])
                            } else {
                              setSelectedSuppliers(selectedSuppliers.filter((s) => s !== supplier))
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <span className="text-sm text-gray-700">{supplier}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSuppliers.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">{selectedSuppliers.length} selected</p>
                  )}
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">Date From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-1.5 px-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">Date To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-1.5 px-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">All Orders</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredAndSortedOrders.length} of {orders.length} orders
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {[
                      { field: 'orderId' as SortField, label: 'Order ID' },
                      { field: 'orderDate' as SortField, label: 'Date' },
                      { field: 'franchisee' as SortField, label: 'Franchise' },
                      { field: 'brand' as SortField, label: 'Brand' },
                      { field: 'orderStage' as SortField, label: 'Status' },
                      { field: 'orderTotal' as SortField, label: 'Total' },
                      { field: 'daysOpen' as SortField, label: 'Days Open' },
                      { label: 'Ordered' },
                      { label: 'Shipped' },
                      { label: 'Delivered' },
                      { label: 'Paid' },
                    ].map((header, index) => (
                      <th
                        key={index}
                        onClick={() => header.field && handleSort(header.field)}
                        className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap ${
                          header.field ? 'cursor-pointer hover:bg-gray-100 group' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          {header.label}
                          {header.field && <SortIcon field={header.field} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAndSortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-sm text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedOrders.map((order) => (
                    <tr
                      key={order.invoiceNo || `${order.orderId}-${order.brand || ''}`}
                      onClick={() => handleRowClick(order.orderId)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {formatOrderId(order.orderId)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {(() => {
                          try {
                            const dateStr = order.orderDate
                            let date: Date
                            if (dateStr.includes('/')) {
                              const [month, day, year] = dateStr.split('/')
                              date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                            } else {
                              date = new Date(dateStr)
                            }
                            if (isNaN(date.getTime())) return order.orderDate
                            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          } catch {
                            return order.orderDate
                          }
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {order.franchisee}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{order.brand}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <StatusPill status={order.orderStage} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrencyNoDecimals(order.orderTotal)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {order.daysOpen} days
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-center">
                        {order.supplierOrdered ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-center">
                        {order.supplierShipped ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-center">
                        {order.deliveredToPartner ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-center">
                        {order.partnerPaid ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {selectedOrderId && (
        <OrderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedOrderId(null)
          }}
          orderId={selectedOrderId}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  )
}

