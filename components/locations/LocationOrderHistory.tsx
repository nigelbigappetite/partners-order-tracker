'use client'

import { Order, OrderLine } from '@/lib/types'
import { formatCurrencyNoDecimals, formatOrderId } from '@/lib/utils'
import { parseOrderDate } from '@/lib/locationUtils'
import { format } from 'date-fns'

interface LocationOrderHistoryProps {
  orders: Order[]
  orderLines: OrderLine[]
}

export default function LocationOrderHistory({
  orders,
  orderLines,
}: LocationOrderHistoryProps) {
  // Debug: Log what orders we're receiving
  if (process.env.NODE_ENV === 'development') {
    console.log('[LocationOrderHistory] 🔍 Received Orders:', {
      ordersCount: orders.length,
      sampleOrders: orders.slice(0, 5).map(o => ({
        orderId: o.orderId,
        brand: o.brand,
        orderTotal: o.orderTotal,
        franchisee: o.franchisee,
      })),
    })
  }
  
  // Calculate order totals directly from Orders_Header (orderTotal field)
  // This is more accurate than aggregating from order lines
  const orderTotals = new Map<string, number>()
  orders.forEach((order) => {
    const orderId = (order.orderId || '').toString().trim()
    if (!orderId) return
    
    const orderTotal = Number(order.orderTotal || 0)
    orderTotals.set(orderId, isNaN(orderTotal) ? 0 : orderTotal)
  })

  // Sort orders by date (most recent first) using robust date parsing
  const sortedOrders = [...orders].sort((a, b) => {
    const dateA = parseOrderDate(a.orderDate) || new Date(0)
    const dateB = parseOrderDate(b.orderDate) || new Date(0)
    return dateB.getTime() - dateA.getTime()
  })

  const formatOrderDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    const parsedDate = parseOrderDate(dateString)
    if (!parsedDate) return dateString
    try {
      return format(parsedDate, 'MMM d, yyyy')
    } catch {
      return dateString
    }
  }

  if (sortedOrders.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Order history</h3>
        <p className="py-8 text-center text-sm text-gray-500">No orders found</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Order history</h3>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: '400px' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total
                </th>
              </tr>
            </thead>
                 <tbody className="divide-y divide-gray-200 bg-white">
                   {sortedOrders.slice(0, 20).map((order, index) => (
                     <tr key={`${order.orderId}-${order.invoiceNo || ''}-${order.brand || ''}-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatOrderId(order.orderId)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatOrderDate(order.orderDate)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {order.brand || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrencyNoDecimals(orderTotals.get(order.orderId) || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

