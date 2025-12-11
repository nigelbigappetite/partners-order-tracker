'use client'

import { Supplier } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'
import Link from 'next/link'

interface SupplierCardProps {
  supplier: Supplier
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 hover:border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <h3 className="text-lg font-semibold text-gray-900">{supplier.name || 'Unknown Supplier'}</h3>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Orders Count</span>
          <span className="font-medium text-gray-900">
            {supplier.ordersCount || supplier['Orders Count'] || supplier.Orders_Count || 0}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Items</span>
          <span className="font-medium text-gray-900">
            {supplier.totalItems || supplier['Total Items'] || supplier.Total_Items || 0}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Revenue</span>
          <span className="font-medium text-gray-900">
            {supplier.totalValueOrdered || supplier['Total Revenue'] || supplier.Total_Revenue
              ? formatCurrencyNoDecimals(supplier.totalValueOrdered || supplier['Total Revenue'] || supplier.Total_Revenue || 0)
              : '£0'}
          </span>
        </div>
      </div>
    </div>
  )
}

