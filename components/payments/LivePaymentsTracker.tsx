'use client'

import { useState, useEffect, useMemo } from 'react'
import { PaymentTrackerRow } from '@/lib/types'
import { formatCurrency, formatCurrencyNoDecimals } from '@/lib/utils'
import { Search, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'

type SortField = 'sales_invoice_no' | 'brand' | 'franchisee_name' | 'order_date' | 'total_order_value' | 'settlement_status'
type SortDirection = 'asc' | 'desc'

interface LivePaymentsTrackerProps {
  refreshInterval?: number // in milliseconds, default 12000 (12 seconds)
}

const getSettlementStatusColor = (status: string): string => {
  switch (status) {
    case 'PAID_NOT_CLEARED':
      return 'bg-yellow-50 border-yellow-200'
    case 'WAITING_SUPPLIERS':
      return 'bg-orange-50 border-orange-200'
    case 'OPEN':
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

const getSettlementStatusBadge = (status: string): string => {
  switch (status) {
    case 'PAID_NOT_CLEARED':
      return 'bg-yellow-100 text-yellow-800'
    case 'WAITING_SUPPLIERS':
      return 'bg-orange-100 text-orange-800'
    case 'OPEN':
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function LivePaymentsTracker({ refreshInterval = 12000 }: LivePaymentsTrackerProps) {
  const [payments, setPayments] = useState<PaymentTrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [franchiseeFilter, setFranchiseeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('order_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const fetchPayments = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    
    try {
      const params = new URLSearchParams()
      // Exclude SETTLED orders - only get outstanding
      params.append('excludeSettled', 'true')
      
      if (brandFilter !== 'all') {
        params.append('brand', brandFilter)
      }
      if (franchiseeFilter !== 'all') {
        params.append('franchisee', franchiseeFilter)
      }
      if (statusFilter !== 'all') {
        params.append('settlementStatus', statusFilter)
      }
      
      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }
      
      const data = await response.json()
      // Double-check: filter out any SETTLED orders that might have slipped through
      const outstanding = data.filter((p: PaymentTrackerRow) => p.settlement_status !== 'SETTLED')
      setPayments(outstanding)
      setLastRefresh(new Date())
    } catch (error: any) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchPayments()
  }, [brandFilter, franchiseeFilter, statusFilter])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPayments(true)
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval, brandFilter, franchiseeFilter, statusFilter])

  // Get unique values for filters
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>()
    payments.forEach((p) => {
      if (p.brand) brands.add(p.brand)
    })
    return Array.from(brands).sort()
  }, [payments])

  const uniqueFranchisees = useMemo(() => {
    const franchisees = new Set<string>()
    payments.forEach((p) => {
      if (p.franchisee_name) franchisees.add(p.franchisee_name)
    })
    return Array.from(franchisees).sort()
  }, [payments])

  // Filter and sort
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = [...payments]

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((p) => {
        const invoiceNo = String(p.sales_invoice_no || '').toLowerCase()
        return invoiceNo.includes(searchLower)
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date sorting
      if (sortField === 'order_date') {
        try {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } catch {
          aValue = 0
          bValue = 0
        }
      }

      // Handle number sorting
      if (sortField === 'total_order_value') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
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
  }, [payments, searchTerm, sortField, sortDirection])

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

  const formatLastRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefresh.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  const headers = [
    { field: 'sales_invoice_no' as SortField, label: 'Sales Invoice' },
    { field: 'brand' as SortField, label: 'Brand' },
    { field: 'franchisee_name' as SortField, label: 'Franchisee' },
    { field: 'order_date' as SortField, label: 'Order Date' },
    { field: 'total_order_value' as SortField, label: 'Order Value' },
    { field: 'settlement_status' as SortField, label: 'Status' },
  ]

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Live Outstanding Payments Tracker</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Auto-refreshing every {refreshInterval / 1000}s • {filteredAndSortedPayments.length} outstanding invoice{filteredAndSortedPayments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {refreshing && (
              <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
            )}
            <span>Last updated: {formatLastRefresh()}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Brand Filter */}
          <div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Brands</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Franchisee Filter */}
          <div>
            <select
              value={franchiseeFilter}
              onChange={(e) => setFranchiseeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Franchisees</option>
              {uniqueFranchisees.map((franchisee) => (
                <option key={franchisee} value={franchisee}>
                  {franchisee}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="PAID_NOT_CLEARED">Paid (Not Cleared)</option>
              <option value="WAITING_SUPPLIERS">Waiting Suppliers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Loading outstanding payments...
          </div>
        ) : filteredAndSortedPayments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No outstanding payments found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header.field}
                    onClick={() => handleSort(header.field)}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap cursor-pointer hover:bg-gray-100 group"
                  >
                    <div className="flex items-center">
                      {header.label}
                      <SortIcon field={header.field} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Unpaid Suppliers
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAndSortedPayments.map((payment) => {
                const rowColor = getSettlementStatusColor(payment.settlement_status)
                
                return (
                  <tr
                    key={payment.sales_invoice_no}
                    className={`${rowColor} hover:bg-opacity-80 transition-colors`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {payment.sales_invoice_no}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {payment.brand}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {payment.franchisee_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {payment.order_date ? new Date(payment.order_date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrencyNoDecimals(payment.total_order_value)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getSettlementStatusBadge(
                          payment.settlement_status
                        )}`}
                      >
                        {payment.settlement_status.replace(/_/g, ' ')}
                      </span>
                      {!payment.funds_cleared && (
                        <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                          Funds Not Cleared
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {payment.supplier_unpaid_count > 0 ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                          {payment.supplier_unpaid_count} unpaid
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

