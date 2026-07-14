'use client'

import { useEffect, useState, useMemo } from 'react'
import { Package, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import type { KitchenSiteOrder } from '@/app/api/orders/kitchen-site/route'

interface KitchenSiteOrdersProps {
  brandSlug: string
  siteId: string
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  const parts = d.split('-')
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const classes =
    s === 'paid' || s === 'completed' || s === 'settled'
      ? 'bg-green-100 text-green-800'
      : s === 'awaiting_payment' || s === 'open'
        ? 'bg-amber-100 text-amber-800'
        : s === 'cancelled'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function KitchenSiteOrders({ brandSlug, siteId }: KitchenSiteOrdersProps) {
  const [orders, setOrders] = useState<KitchenSiteOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/orders/kitchen-site?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setOrders(data.orders ?? [])
      })
      .catch((e) => toast.error(e.message || 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [siteId])

  const totalSpend = useMemo(() => orders.reduce((s, o) => s + o.orderTotal, 0), [orders])

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">Loading stock orders…</div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <Package className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-400">No stock orders found for this site.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total orders', value: orders.length.toString() },
          { label: 'Total spend', value: formatCurrency(totalSpend) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order date', 'Items', 'Total', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {order.itemCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(order.orderTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                      {expandedId === order.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </td>
                  </tr>
                  {expandedId === order.id && order.items.length > 0 && (
                    <tr key={`${order.id}-items`}>
                      <td colSpan={5} className="bg-gray-50 px-4 py-3">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="py-1 pr-4 text-left font-medium uppercase tracking-wide">Product</th>
                              <th className="py-1 pr-4 text-left font-medium uppercase tracking-wide">Qty</th>
                              <th className="py-1 pr-4 text-left font-medium uppercase tracking-wide">Unit price</th>
                              <th className="py-1 text-left font-medium uppercase tracking-wide">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="py-1.5 pr-4 text-gray-900">{item.productName}</td>
                                <td className="py-1.5 pr-4 text-gray-700">{item.quantity}</td>
                                <td className="py-1.5 pr-4 text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                <td className="py-1.5 font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-gray-200 sm:hidden">
          {orders.map((order) => (
            <div key={order.id}>
              <button
                className="w-full px-4 py-4 text-left"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(order.orderDate)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {order.itemCount} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(order.orderTotal)}</p>
                    {expandedId === order.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <StatusBadge status={order.status} />
                </div>
              </button>
              {expandedId === order.id && order.items.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">
                        {item.quantity}× {item.productName}
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
