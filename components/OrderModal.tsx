'use client'

import { useEffect, useState } from 'react'
import Modal from './Modal'
import StatusPill from './StatusPill'
import ActionButton from './ActionButton'
import Table from './Table'
import Timeline from './Timeline'
import { Order, OrderLine } from '@/lib/types'
import { formatCurrency, formatCurrencyNoDecimals, formatOrderId } from '@/lib/utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onUpdate?: () => void
}

export default function OrderModal({ isOpen, onClose, orderId, onUpdate }: OrderModalProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder()
    }
  }, [isOpen, orderId])

  // Fetch order lines after order is loaded (so we have invoice number)
  useEffect(() => {
    if (order) {
      fetchOrderLines()
    }
  }, [order])

  const fetchOrder = async () => {
    setLoading(true)
    try {
      // URL encode the orderId to handle # and other special characters
      const encodedOrderId = encodeURIComponent(orderId)
      const response = await fetch(`/api/orders/${encodedOrderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        console.log('Order fetched:', { orderId: data.orderId, invoiceNo: data.invoiceNo, brand: data.brand })
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Failed to load order')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderLines = async () => {
    if (!order) return
    
    try {
      // URL encode the orderId to handle # and other special characters
      const encodedOrderId = encodeURIComponent(orderId)
      const response = await fetch(`/api/orders/${encodedOrderId}/lines`)
      if (response.ok) {
        const data = await response.json()
        console.log(`Order lines fetched: ${data.length} lines for order ${orderId}`, {
          orderInvoiceNo: order.invoiceNo,
          orderBrand: order.brand,
          lines: data.slice(0, 3).map((l: any) => ({
            productName: l.productName,
            invoiceNo: l.invoiceNo,
            orderId: l.orderId
          }))
        })
        setOrderLines(Array.isArray(data) ? data : [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch order lines:', errorData)
        setOrderLines([])
      }
    } catch (error) {
      console.error('Error fetching order lines:', error)
      setOrderLines([])
    }
  }

  const updateStatus = async (updates: Partial<Order>) => {
    setUpdating(true)
    try {
      // URL encode the orderId to handle # and other special characters
      const encodedOrderId = encodeURIComponent(orderId)
      const response = await fetch(`/api/orders/${encodedOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast.success('Order updated successfully')
        fetchOrder()
        if (onUpdate) {
          onUpdate()
        }
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

  if (!isOpen) return null

  // Helper to format date safely
  const formatDateSafe = (dateStr: string): string => {
    try {
      let date: Date
      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/')
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      } else {
        date = new Date(dateStr)
      }
      if (isNaN(date.getTime())) {
        return dateStr
      }
      return format(date, 'MMM d, yyyy')
    } catch (e) {
      return dateStr
    }
  }

  const timelineEvents = order
    ? [
        { date: formatDateSafe(order.orderDate), action: 'Order Created', description: `Order ${formatOrderId(order.orderId)}` },
        ...(order.supplierOrdered
          ? [{ date: formatDateSafe(order.orderDate), action: 'Ordered with Supplier', description: 'Supplier notified' }]
          : []),
        ...(order.supplierShipped
          ? [{ date: formatDateSafe(order.orderDate), action: 'Shipped', description: 'In transit' }]
          : []),
        ...(order.deliveredToPartner
          ? [{ date: formatDateSafe(order.orderDate), action: 'Delivered', description: 'Delivered to partner' }]
          : []),
        ...(order.partnerPaid
          ? [{ date: formatDateSafe(order.orderDate), action: 'Paid', description: 'Payment received' }]
          : []),
      ]
    : []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `Order ${formatOrderId(order.orderId)}` : 'Order Details'}
    >
      {loading ? (
        <div className="py-8 text-center text-gray-500">Loading order details...</div>
      ) : !order ? (
        <div className="py-8 text-center text-gray-500">Order not found</div>
      ) : (
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <StatusPill status={order.orderStage} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Franchise:</span>
                  <p className="font-medium text-gray-900">{order.franchisee}</p>
                </div>
                <div>
                  <span className="text-gray-600">Brand:</span>
                  <p className="font-medium text-gray-900">{order.brand}</p>
                </div>
                <div>
                  <span className="text-gray-600">Order Date:</span>
                  <p className="font-medium text-gray-900">
                    {(() => {
                      try {
                        // Handle different date formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
                        const dateStr = order.orderDate
                        let date: Date
                        
                        // Try parsing MM/DD/YYYY format first
                        if (dateStr.includes('/')) {
                          const [month, day, year] = dateStr.split('/')
                          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                        } else {
                          date = new Date(dateStr)
                        }
                        
                        // Check if date is valid
                        if (isNaN(date.getTime())) {
                          return dateStr // Return original string if invalid
                        }
                        
                        return format(date, 'MMM d, yyyy')
                      } catch (e) {
                        return order.orderDate // Return original string on error
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Days Open:</span>
                  <p className="font-medium text-gray-900">{order.daysOpen} days</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Order Total:</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrencyNoDecimals(order.orderTotal)}
                  </p>
                </div>
                {order.nextAction && (
                  <div className="col-span-2 rounded-lg bg-blue-50 p-3">
                    <p className="text-sm font-medium text-blue-900">Next Action</p>
                    <p className="text-sm text-blue-700">{order.nextAction}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Lines */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Order Products</h3>
              {orderLines.length > 0 ? (
                <Table
                  headers={['Product', 'SKU', 'Qty', 'Unit Price', 'Total', 'Supplier']}
                  maxHeight="300px"
                  stickyHeader={true}
                >
                  {orderLines.map((line, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {line.productName || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {line.sku || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {line.quantity || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {line.unitPrice ? formatCurrency(line.unitPrice) : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {line.lineTotal ? formatCurrency(line.lineTotal) : 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {line.supplier || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                  <p className="text-sm text-gray-500">
                    {loading ? 'Loading order products...' : 'No products found for this order'}
                  </p>
                </div>
              )}
            </div>

            {/* Timeline */}
            {timelineEvents.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Timeline</h3>
                <Timeline events={timelineEvents} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              {!order.supplierShipped && (
                <ActionButton
                  variant="primary"
                  onClick={handleMarkShipped}
                  loading={updating}
                >
                  Mark Shipped
                </ActionButton>
              )}
              {order.supplierShipped && !order.deliveredToPartner && (
                <ActionButton
                  variant="primary"
                  onClick={handleMarkDelivered}
                  loading={updating}
                >
                  Mark Delivered
                </ActionButton>
              )}
              {order.deliveredToPartner && !order.partnerPaid && (
                <ActionButton
                  variant="primary"
                  onClick={handleMarkPaid}
                  loading={updating}
                >
                  Mark Paid
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

