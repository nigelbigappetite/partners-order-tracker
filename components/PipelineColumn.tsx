'use client'

import { useMemo } from 'react'
import { Order } from '@/lib/types'
import OrderCard from './OrderCard'

interface PipelineColumnProps {
  title: string
  orders: Order[]
  stage: string
  onUpdate?: () => void
}

export default function PipelineColumn({ title, orders, stage, onUpdate }: PipelineColumnProps) {
  // For Completed column, show only latest 5 orders (sorted by date, most recent first)
  // For other columns, show top 5 with rest scrollable
  const visibleOrders = useMemo(() => {
    if (stage === 'Completed') {
      // Sort by order date (most recent first) and take only 5
      const sorted = [...orders].sort((a, b) => {
        try {
          // Handle MM/DD/YYYY format
          const parseDate = (dateStr: string) => {
            if (dateStr.includes('/')) {
              const [month, day, year] = dateStr.split('/')
              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            }
            return new Date(dateStr)
          }
          const dateA = parseDate(a.orderDate)
          const dateB = parseDate(b.orderDate)
          return dateB.getTime() - dateA.getTime() // Most recent first
        } catch {
          return 0
        }
      })
      return sorted.slice(0, 5)
    }
    return orders
  }, [orders, stage])

  // For non-completed columns, show top 5 visible, rest scrollable
  const topOrders = stage !== 'Completed' ? visibleOrders.slice(0, 5) : visibleOrders
  const remainingOrders = stage !== 'Completed' ? visibleOrders.slice(5) : []

  return (
    <div className="flex h-[400px] lg:h-full flex-col rounded-2xl border border-gray-100 bg-gray-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="border-b border-gray-200 bg-white px-2 sm:px-3 py-2 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {visibleOrders.length}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {visibleOrders.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">No orders</p>
        ) : (
          <div className="space-y-2">
            {/* Top 5 orders - always visible */}
            {topOrders.map((order) => (
              <OrderCard 
                key={order.invoiceNo || `${order.orderId}-${order.brand || ''}`} 
                order={order} 
                onUpdate={onUpdate}
              />
            ))}
            {/* Remaining orders - scrollable (only for non-completed columns) */}
            {remainingOrders.length > 0 && (
              <div className="space-y-2">
                {remainingOrders.map((order) => (
                  <OrderCard 
                    key={order.invoiceNo || `${order.orderId}-${order.brand || ''}`} 
                    order={order} 
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

