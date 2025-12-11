'use client'

import { SKUMetrics } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'

interface LocationBrandDrilldownProps {
  brand: string
  locationName: string
  skuMetrics: SKUMetrics[]
}

export default function LocationBrandDrilldown({
  brand,
  locationName,
  skuMetrics,
}: LocationBrandDrilldownProps) {
  if (skuMetrics.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {brand} at {locationName}
        </h3>
        <p className="py-8 text-center text-sm text-gray-500">No SKU data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {brand} at {locationName}
      </h3>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                SKU / Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                COGS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Margin %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {skuMetrics.map((sku) => (
              <tr key={sku.sku} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{sku.sku}</p>
                    {sku.productName && (
                      <p className="text-xs text-gray-500">{sku.productName}</p>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{sku.quantity}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {formatCurrencyNoDecimals(sku.revenue)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {formatCurrencyNoDecimals(sku.cogs)}
                </td>
                <td
                  className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                    sku.marginPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isNaN(sku.marginPercent) || !isFinite(sku.marginPercent)
                    ? '0.0%'
                    : `${sku.marginPercent.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

