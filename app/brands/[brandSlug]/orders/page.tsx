'use client'

import { useEffect, useState, useMemo } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import Table from '@/components/Table'
import OrderModal from '@/components/OrderModal'
import StatusPill from '@/components/StatusPill'
import { Order } from '@/lib/types'
import { formatCurrencyNoDecimals, formatOrderId } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'
import { Search } from 'lucide-react'

type SortField = 'orderId' | 'orderDate' | 'franchisee' | 'orderStage' | 'orderTotal' | 'daysOpen'
type SortDirection = 'asc' | 'desc'

export default function BrandOrdersPage() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const [brandName, setBrandName] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
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
      } else if (sortField === 'daysOpen') {
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
          <h1 className="text-3xl font-bold text-gray-900">{isAdmin ? 'All Orders' : `${brandName} Orders`}</h1>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/70 focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Table
            headers={['Order ID', 'Date', 'Franchisee', 'Stage', 'Total', 'Days Open']}
            maxHeight="calc(100vh - 300px)"
            stickyHeader={true}
          >
            {                  filteredAndSortedOrders.map((order) => (
                    <tr
                      key={order.invoiceNo || `${order.orderId}-${order.brand || ''}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        // Use invoice number as primary identifier (unique across brands)
                        const identifier = order.invoiceNo || order.orderId
                        setSelectedOrderId(identifier)
                        setIsModalOpen(true)
                      }}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {order.invoiceNo ? formatOrderId(order.invoiceNo) : formatOrderId(order.orderId)}
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
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {order.daysOpen}
                </td>
              </tr>
            ))}
          </Table>
        </div>

        {isModalOpen && selectedOrderId && (
          <OrderModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedOrderId(null)
            }}
            orderId={selectedOrderId}
            brandSlug={brandSlug}
          />
        )}
      </div>
    </div>
  )
}

