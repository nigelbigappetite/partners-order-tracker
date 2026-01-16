'use client'

import { KPIMetric } from '@/lib/types'

interface KPICardProps {
  metric: KPIMetric
}

export default function KPICard({ metric }: KPICardProps) {
  return (
    <button
      onClick={metric.onClick}
      className="w-full rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 hover:from-blue-50 hover:to-white shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {metric.value}
          </p>
          {metric.subtitle && (
            <p className="mt-1 text-xs text-gray-500">{metric.subtitle}</p>
          )}
        </div>
      </div>
    </button>
  )
}

