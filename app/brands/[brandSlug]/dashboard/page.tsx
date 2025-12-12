'use client'

import { useEffect, useState } from 'react'
import BrandNavigation from '@/components/BrandNavigation'
import Navigation from '@/components/Navigation'
import KPICard from '@/components/KPICard'
import PipelineColumn from '@/components/PipelineColumn'
import Table from '@/components/Table'
import OrderModal from '@/components/OrderModal'
import StatusPill from '@/components/StatusPill'
import { Order, KPIMetric } from '@/lib/types'
import { formatCurrencyNoDecimals, formatOrderId } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'

const stages = [
  { key: 'New', title: 'New' },
  { key: 'Ordered with Supplier', title: 'Ordered with Supplier' },
  { key: 'In Transit', title: 'In Transit' },
  { key: 'Completed', title: 'Completed' },
]

export default function BrandDashboard() {
  const params = useParams()
  const brandSlug = params.brandSlug as string
  const [brandName, setBrandName] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isAdmin = brandSlug.toLowerCase() === 'admin'
  const isSmshBn = brandSlug.toLowerCase() === 'smsh-bn' || brandSlug.toLowerCase() === 'smsh bn'

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
      // First get the brand name if we don't have it
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
      
      // For admin, pass "admin" which will be ignored by API (shows all orders)
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

  const getOrdersByStage = (stage: string) => {
    if (stage === 'Completed') {
      return orders.filter((o) => o.orderStage === 'Completed' || o.orderStage === 'Delivered')
    }
    return orders.filter((o) => o.orderStage === stage)
  }

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.orderTotal) || 0), 0)
  const totalCOGS = orders.reduce((sum, o) => sum + (Number(o.totalCOGS) || 0), 0)
  const grossProfit = totalRevenue - totalCOGS
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{isAdmin ? 'Admin Dashboard' : `${brandName} Dashboard`}</h1>
        </div>

        {/* Main Metrics */}
        <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard 
            metric={{
              label: 'Total Revenue',
              value: formatCurrencyNoDecimals(totalRevenue),
            }}
          />
          <KPICard 
            metric={{
              label: 'Total COGS',
              value: formatCurrencyNoDecimals(totalCOGS),
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
              value: `${Number(grossMargin).toFixed(1)}%`,
            }}
          />
        </div>

        {/* Orders Table for SMSH BN */}
        {isSmshBn && (
          <div className="mt-6 sm:mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Orders</h2>
              <p className="text-xs sm:text-sm text-gray-500">{orders.length} total orders</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-6">
              <Table
                headers={['Order ID', 'Date', 'Franchisee', 'Stage', 'Total', 'Days Open']}
                maxHeight="calc(100vh - 500px)"
                stickyHeader={true}
              >
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.invoiceNo || `${order.orderId}-${order.brand || ''}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedOrderId(order.orderId)
                        setIsModalOpen(true)
                      }}
                    >
                      <td className="whitespace-nowrap px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">
                        {formatOrderId(order.orderId)}
                      </td>
                      <td className="whitespace-nowrap px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {order.orderDate}
                      </td>
                      <td className="whitespace-nowrap px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {order.franchisee}
                      </td>
                      <td className="whitespace-nowrap px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        <StatusPill status={order.orderStage} />
                      </td>
                      <td className="whitespace-nowrap px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">
                        {formatCurrencyNoDecimals(order.orderTotal)}
                      </td>
                      <td className="whitespace-nowrap px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {order.daysOpen}
                      </td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
          </div>
        )}

        {/* Kanban Board - Hidden for SMSH BN */}
        {!isSmshBn && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Live Orders Tracker</h2>
              <span className="text-xs text-gray-500">
                {orders.filter((o) => o.orderStage !== 'Completed').length} active
              </span>
            </div>
            {/* Mobile: Horizontal scroll, Desktop: Grid */}
            <div className="lg:grid lg:grid-cols-4 lg:gap-3 lg:h-[500px]">
              <div className="flex lg:contents overflow-x-auto lg:overflow-x-visible gap-3 pb-4 lg:pb-0">
                {stages.map((stage) => (
                  <div key={stage.key} className="flex-shrink-0 w-[280px] lg:w-auto lg:flex-1 lg:h-full">
                    <PipelineColumn
                      title={stage.title}
                      orders={getOrdersByStage(stage.key)}
                      stage={stage.key}
                      onUpdate={fetchOrders}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order Modal */}
        {isModalOpen && selectedOrderId && (
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
    </div>
  )
}

