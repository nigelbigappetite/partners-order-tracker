'use client'

import { BrandMetrics } from '@/lib/types'
import { formatCurrencyNoDecimals } from '@/lib/utils'

interface LocationBrandPerformanceProps {
  brandMetrics: BrandMetrics[]
  selectedBrand: string | null
  onSelectBrand: (brand: string | null) => void
}

export default function LocationBrandPerformance({
  brandMetrics,
  selectedBrand,
  onSelectBrand,
}: LocationBrandPerformanceProps) {
  if (brandMetrics.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Brand performance at this location</h3>
        <p className="py-8 text-center text-sm text-gray-500">No brand data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Brand performance at this location</h3>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Gross Profit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Gross Margin %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {brandMetrics.map((brand) => (
              <tr
                key={brand.brand}
                onClick={() => onSelectBrand(selectedBrand === brand.brand ? null : brand.brand)}
                className={`cursor-pointer transition-colors ${
                  selectedBrand === brand.brand
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {brand.brand}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {formatCurrencyNoDecimals(brand.revenue)}
                </td>
                <td
                  className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                    brand.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrencyNoDecimals(brand.grossProfit)}
                </td>
                <td
                  className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                    brand.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isNaN(brand.grossMargin) || !isFinite(brand.grossMargin)
                    ? '0.0%'
                    : `${brand.grossMargin.toFixed(1)}%`}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{brand.orders}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {isNaN(brand.revenueShare) || !isFinite(brand.revenueShare)
                    ? '0.0%'
                    : `${brand.revenueShare.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

