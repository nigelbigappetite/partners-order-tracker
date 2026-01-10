'use client'

import { useState } from 'react'
import { Order } from '@/lib/types'
import { formatCurrencyNoDecimals, formatOrderId } from '@/lib/utils'
import StatusPill from './StatusPill'
import OrderModal from './OrderModal'

interface OrderCardProps {
  order: Order
  onUpdate?: () => void
}

export default function OrderCard({ order, onUpdate }: OrderCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full text-left rounded-lg xs:rounded-xl border border-gray-100 bg-white p-2 xs:p-2.5 sm:p-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-200 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06)]"
      >
        <div className="space-y-1 xs:space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 xs:space-x-2 min-w-0 flex-1">
              <h3 className="text-xs xs:text-sm font-semibold text-gray-900 truncate">
                {order.invoiceNo ? formatOrderId(order.invoiceNo) : formatOrderId(order.orderId)}
              </h3>
            </div>
            <span className="text-xs font-medium text-gray-900 flex-shrink-0">
              {formatCurrencyNoDecimals(order.orderTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-600 truncate max-w-[90px] xs:max-w-[110px] sm:max-w-[120px]">{order.franchisee}</p>
            <span className="text-xs text-gray-500 flex-shrink-0">{order.daysOpen}d</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500 truncate max-w-[90px] xs:max-w-[110px] sm:max-w-[120px]">{order.brand}</p>
            <StatusPill status={order.orderStage} />
          </div>
        </div>
      </button>
      <OrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderId={order.invoiceNo || order.orderId}
        onUpdate={onUpdate}
      />
    </>
  )
}

