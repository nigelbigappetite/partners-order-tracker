'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import StatusPill from '@/components/StatusPill'
import ActionButton from '@/components/ActionButton'
import Table from '@/components/Table'
import Timeline from '@/components/Timeline'
import { Order, OrderLine } from '@/lib/types'
import { formatCurrency, formatCurrencyNoDecimals } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string // Can be invoice number or order ID
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  // Fetch order lines after order is loaded (so we have invoice number)
  useEffect(() => {
    if (order && orderId) {
      fetchOrderLines()
    }
  }, [order, orderId])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      }
    } catch (error) {
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderLines = async () => {
    if (!order) return
    try {
      // Use invoice number if available, otherwise use the orderId param
      const identifier = order.invoiceNo || orderId
      const response = await fetch(`/api/orders/${encodeURIComponent(identifier)}/lines`)
      if (response.ok) {
        const data = await response.json()
        setOrderLines(data)
      }
    } catch (error) {
      toast.error('Failed to load order lines')
    }
  }

  const updateStatus = async (updates: Partial<Order>) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success('Order updated successfully')
        fetchOrder()
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      toast.error('Failed to update order')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkShipped = () => {
    updateStatus({ supplierShipped: true, orderStage: 'In Transit' })
  }

  const handleMarkDelivered = () => {
    updateStatus({ deliveredToPartner: true, orderStage: 'Delivered' })
  }

  const handleMarkPaid = () => {
    updateStatus({ partnerPaid: true, orderStage: 'Completed' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading from Hungry Tum OS</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Order not found</div>
        </div>
      </div>
    )
  }

  const timelineEvents = [
    { date: order.orderDate, action: 'Order Created', description: `Order #${order.orderId}` },
    ...(order.supplierOrdered
      ? [{ date: order.orderDate, action: 'Ordered with Supplier', description: 'Supplier notified' }]
      : []),
    ...(order.supplierShipped
      ? [{ date: order.orderDate, action: 'Shipped', description: 'In transit' }]
      : []),
    ...(order.deliveredToPartner
      ? [{ date: order.orderDate, action: 'Delivered', description: 'Delivered to partner' }]
      : []),
    ...(order.partnerPaid
      ? [{ date: order.orderDate, action: 'Paid', description: 'Payment received' }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order #{order.orderId}</h1>
              <p className="mt-2 text-gray-600">{order.franchisee} • {order.brand}</p>
            </div>
            <StatusPill status={order.orderStage} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(order.orderDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Open</span>
                  <span className="font-medium text-gray-900">{order.daysOpen} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Total</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrencyNoDecimals(order.orderTotal)}
                  </span>
                </div>
                {order.nextAction && (
                  <div className="mt-4 rounded-lg bg-blue-50 p-3">
                    <p className="text-sm font-medium text-blue-900">Next Action</p>
                    <p className="mt-1 text-sm text-blue-700">{order.nextAction}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Timeline</h2>
              <Timeline events={timelineEvents} />
            </div>

            {/* Action Buttons */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>
              <div className="space-y-3">
                {!order.supplierShipped && (
                  <ActionButton
                    variant="primary"
                    onClick={handleMarkShipped}
                    loading={updating}
                    className="w-full"
                  >
                    Mark Shipped
                  </ActionButton>
                )}
                {order.supplierShipped && !order.deliveredToPartner && (
                  <ActionButton
                    variant="primary"
                    onClick={handleMarkDelivered}
                    loading={updating}
                    className="w-full"
                  >
                    Mark Delivered
                  </ActionButton>
                )}
                {order.deliveredToPartner && !order.partnerPaid && (
                  <ActionButton
                    variant="primary"
                    onClick={handleMarkPaid}
                    loading={updating}
                    className="w-full"
                  >
                    Mark Paid
                  </ActionButton>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Lines</h2>
              <Table 
                headers={['Product', 'SKU', 'Qty', 'Unit Price', 'Total', 'Supplier']}
                maxHeight="600px"
                stickyHeader={true}
              >
                {orderLines.map((line, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {line.productName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {line.sku}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {line.quantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(line.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(line.lineTotal)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {line.supplier}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

