'use client'

import { LocationMetrics } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'

interface LocationOverviewCardsProps {
  metrics: LocationMetrics
}

export default function LocationOverviewCards({ metrics }: LocationOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {formatCurrencyNoDecimals(metrics.totalRevenue)}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium text-gray-600">Total COGS</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {formatCurrencyNoDecimals(metrics.totalCOGS)}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium text-gray-600">Gross Profit</p>
        <p
          className={`mt-2 text-2xl font-bold ${
            metrics.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {formatCurrencyNoDecimals(metrics.grossProfit)}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium text-gray-600">Gross Margin %</p>
        <p
          className={`mt-2 text-2xl font-bold ${
            metrics.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isNaN(metrics.grossMargin) || !isFinite(metrics.grossMargin)
            ? '0.0%'
            : `${metrics.grossMargin.toFixed(1)}%`}
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium text-gray-600">Total Orders</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {formatCurrencyNoDecimals(metrics.avgOrderValue)}
        </p>
      </div>
    </div>
  )
}

