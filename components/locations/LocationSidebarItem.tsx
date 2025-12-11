'use client'

import { Franchise } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'

interface LocationSidebarItemProps {
  franchise: Franchise
  isSelected: boolean
  onClick: () => void
  orderCount: number
  revenue: number
}

export default function LocationSidebarItem({
  franchise,
  isSelected,
  onClick,
  orderCount,
  revenue,
}: LocationSidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-gray-900 bg-gray-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <p className="font-semibold text-gray-900">{franchise.name || 'Unknown'}</p>
      <p className="mt-1 text-sm text-gray-500">
        {franchise.code || 'N/A'} {franchise.brand ? `• ${franchise.brand}` : ''}
      </p>
      <p className="mt-2 text-sm font-medium text-gray-700">
        {orderCount} orders • {formatCurrencyNoDecimals(revenue)}
      </p>
    </button>
  )
}

