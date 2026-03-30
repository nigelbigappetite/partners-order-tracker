'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { KPIMetric } from '@/lib/types'

interface KPICardProps {
  metric: KPIMetric
}

export default function KPICard({ metric }: KPICardProps) {
  const TrendIcon =
    metric.trendDirection === 'up'
      ? ArrowUpRight
      : metric.trendDirection === 'down'
        ? ArrowDownRight
        : Minus

  const trendClassName =
    metric.trendDirection === 'up'
      ? 'text-green-600'
      : metric.trendDirection === 'down'
        ? 'text-red-600'
        : 'text-gray-500'

  return (
    <button
      onClick={metric.onClick}
      className="w-full min-h-[112px] rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all duration-300 shadow-sm hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-md sm:min-h-0 sm:rounded-xl sm:p-6 sm:hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{metric.label}</p>
          <p className="mt-1.5 break-words text-xl font-bold text-gray-900 xs:text-2xl sm:mt-2 sm:text-3xl">
            {metric.value}
          </p>
          {metric.trendLabel && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${trendClassName}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span>{metric.trendLabel}</span>
            </div>
          )}
          {metric.subtitle && (
            <p className="mt-1 text-xs text-gray-500">{metric.subtitle}</p>
          )}
        </div>
      </div>
    </button>
  )
}
