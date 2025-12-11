'use client'

import { KPIMetric } from '@/lib/types'

interface KPICardProps {
  metric: KPIMetric
}

export default function KPICard({ metric }: KPICardProps) {
  return (
    <button
      onClick={metric.onClick}
      className="w-full rounded-2xl border border-gray-100 bg-white p-6 text-left transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 hover:border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{metric.value}</p>
          {metric.subtitle && (
            <p className="mt-1 text-xs text-gray-500">{metric.subtitle}</p>
          )}
        </div>
      </div>
    </button>
  )
}

