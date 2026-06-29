'use client'

import { useEffect, useMemo, useState } from 'react'
import { Store, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { KitchenSales } from '@/lib/types'
import { getBrandDefinition } from '@/lib/brands'
import type { DeliverooDay } from '@/app/api/sales/deliveroo-site/route'
import PlatformLogo from '@/components/PlatformLogo'

function formatCurrency(value: number): string {
  return `£${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(d: string): string {
  const parts = d.split('-')
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d
}

function Metric({
  label,
  value,
  helper,
  emphasis,
}: {
  label: string
  value: string
  helper?: string
  emphasis?: 'soft' | 'strong'
}) {
  const emphasisClass =
    emphasis === 'strong'
      ? 'border-orange-300 bg-orange-500 text-white shadow-sm'
      : emphasis === 'soft'
        ? 'border-orange-200 bg-orange-50'
        : 'border-gray-200 bg-white'

  return (
    <div className={`rounded-xl border p-4 ${emphasisClass}`}>
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${emphasis === 'strong' ? 'text-orange-50' : 'text-gray-500'}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold sm:text-2xl ${emphasis === 'strong' ? 'text-white' : 'text-gray-900'}`}
      >
        {value}
      </p>
      {helper && (
        <p className={`mt-1 text-xs ${emphasis === 'strong' ? 'text-orange-50' : 'text-gray-500'}`}>
          {helper}
        </p>
      )}
    </div>
  )
}

function getThirtyDayProjection(rows: KitchenSales[]) {
  if (rows.length === 0) return { grossSales: 0, orders: 0, daysObserved: 0 }

  const validDates = rows.map((r) => r.date).filter(Boolean).sort()
  const endDate = new Date(`${validDates[validDates.length - 1]}T00:00:00`)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 29)
  const startIso = startDate.toISOString().split('T')[0]
  const endIso = endDate.toISOString().split('T')[0]
  const recent = rows.filter((r) => r.date >= startIso && r.date <= endIso)
  const observedDates = Array.from(new Set(recent.map((r) => r.date))).sort()
  const daysObserved =
    observedDates.length > 1
      ? Math.round(
          (new Date(`${observedDates[observedDates.length - 1]}T00:00:00`).getTime() -
            new Date(`${observedDates[0]}T00:00:00`).getTime()) /
            (24 * 60 * 60 * 1000)
        ) + 1
      : observedDates.length
  const factor = daysObserved > 0 ? 30 / daysObserved : 0

  return {
    grossSales: recent.reduce((s, r) => s + Number(r.grossSales || 0), 0) * factor,
    orders: Math.round(recent.reduce((s, r) => s + Number(r.count || 0), 0) * factor),
    daysObserved,
  }
}

interface WSCChathamPartnerAccountProps {
  brandSlug: string
  sales: KitchenSales[]
  startDate?: string
  endDate?: string
}

export default function WSCChathamPartnerAccount({ brandSlug, sales, startDate, endDate }: WSCChathamPartnerAccountProps) {
  const brandDef = getBrandDefinition(brandSlug)
  const deliverooLocationKey = brandDef?.deliverooLocationKey ?? null
  const dataStartDate = brandDef?.dataStartDate ?? null

  const [deliverooRows, setDeliverooRows] = useState<DeliverooDay[]>([])
  const [deliverooLoading, setDeliverooLoading] = useState(!!deliverooLocationKey)

  useEffect(() => {
    if (!deliverooLocationKey) return
    fetch(`/api/sales/deliveroo-site?locationKey=${deliverooLocationKey}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        let rows: DeliverooDay[] = data.rows ?? []
        if (dataStartDate) rows = rows.filter((r) => r.date >= dataStartDate)
        if (startDate) rows = rows.filter((r) => r.date >= startDate)
        if (endDate) rows = rows.filter((r) => r.date <= endDate)
        setDeliverooRows(rows)
      })
      .catch((e) => toast.error(e.message || 'Failed to load Deliveroo data'))
      .finally(() => setDeliverooLoading(false))
  }, [deliverooLocationKey, dataStartDate, startDate, endDate])

  const deliverooAsSales: KitchenSales[] = useMemo(
    () =>
      deliverooRows.map((d) => ({
        date: d.date,
        location: d.location,
        grossSales: d.grossSales,
        revenue: d.netPayout,
        count: d.orders,
        platform: 'deliveroo',
        importDate: '',
        importSource: 'WEBHOOK' as const,
      })),
    [deliverooRows]
  )

  const allSales = useMemo(
    () => [...sales.filter((s) => s.platform !== 'deliveroo'), ...deliverooAsSales],
    [sales, deliverooAsSales]
  )

  const dailyRows = useMemo(() => {
    const grouped = new Map<string, { date: string; grossSales: number; orders: number }>()
    for (const s of allSales) {
      const existing = grouped.get(s.date) ?? { date: s.date, grossSales: 0, orders: 0 }
      existing.grossSales += Number(s.grossSales || 0)
      existing.orders += Number(s.count || 0)
      grouped.set(s.date, existing)
    }
    return Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [allSales])

  const platformRows = useMemo(() => {
    const grouped = new Map<string, { grossSales: number; orders: number }>()
    for (const s of allSales) {
      const key = s.platform || 'unknown'
      const existing = grouped.get(key) ?? { grossSales: 0, orders: 0 }
      existing.grossSales += Number(s.grossSales || 0)
      existing.orders += Number(s.count || 0)
      grouped.set(key, existing)
    }
    return Array.from(grouped.entries())
      .map(([platform, data]) => ({ platform, ...data }))
      .sort((a, b) => b.grossSales - a.grossSales)
  }, [allSales])

  const totalGrossSales = allSales.reduce((s, r) => s + Number(r.grossSales || 0), 0)
  const totalOrders = allSales.reduce((s, r) => s + Number(r.count || 0), 0)
  const aov = totalOrders > 0 ? totalGrossSales / totalOrders : 0
  const projection = getThirtyDayProjection(allSales)

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Summary header */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 border-l-4 border-l-orange-500 bg-white shadow-sm">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
              Sales Overview
            </p>
            <h2 className="mt-2 max-w-3xl text-xl font-bold leading-tight sm:mt-3 sm:text-3xl">
              Wing Shack Co Chatham sales activity.
            </h2>
            <p className="mt-3 hidden max-w-3xl text-sm leading-6 text-gray-600 sm:block">
              Third-party platform sales across Uber Eats, Deliveroo and other delivery platforms.
              Data shown from 9 June 2026 (new operator).
            </p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total gross sales
            </p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalGrossSales)}</p>
            <p className="mt-2 text-xs text-gray-500">Customer-paid incl. VAT. From 9 June 2026.</p>
          </div>
        </div>
      </section>

      {/* Platform channels */}
      <section>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sales channels</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Third-party platforms */}
          <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
                <Store className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-gray-900">Third-party Platforms</h3>
            </div>
            <p className="mb-5 text-sm text-gray-500">Uber Eats, Deliveroo and other delivery platforms.</p>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Gross Sales" value={formatCurrency(totalGrossSales)} />
              <Metric label="Orders" value={totalOrders.toLocaleString()} />
              <Metric label="AOV" value={formatCurrency(aov)} />
            </div>

            {/* Per-platform breakdown */}
            {(deliverooLoading || platformRows.length > 0) && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  By platform
                </p>
                {deliverooLoading ? (
                  <p className="text-xs text-gray-400">Loading Deliveroo data…</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Platform', 'Gross Sales', 'Orders', 'AOV'].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left font-medium uppercase tracking-wide text-gray-500"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {platformRows.map((row) => (
                          <tr key={row.platform} className="bg-white">
                            <td className="px-3 py-2">
                              <PlatformLogo platform={row.platform} height={28} />
                            </td>
                            <td className="px-3 py-2 text-gray-900">{formatCurrency(row.grossSales)}</td>
                            <td className="px-3 py-2 text-gray-700">{row.orders}</td>
                            <td className="px-3 py-2 text-gray-700">
                              {row.orders > 0 ? formatCurrency(row.grossSales / row.orders) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto pt-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Projected next 30 days
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-bold">{projection.orders.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">projected orders</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(projection.grossSales)}</p>
                    <p className="text-xs text-gray-600">projected gross sales</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  Run rate from latest {projection.daysObserved} days of data.
                </p>
              </div>
            </div>
          </article>

          {/* Wing Shack App — placeholder */}
          <article className="flex flex-col rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 p-2 text-gray-400">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-gray-400">Wing Shack App</h3>
            </div>
            <p className="mb-5 text-sm text-gray-400">Direct app orders — coming soon.</p>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Gross Sales" value="—" helper="Not connected" />
              <Metric label="Orders" value="—" helper="Not connected" />
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Wing Shack App sales not yet connected to Partners OS.
            </p>
          </article>
        </div>
      </section>

      {/* Daily breakdown */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Daily breakdown</h2>
          <p className="mt-1 text-sm text-gray-500">Gross sales and order count per day.</p>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Gross Sales', 'Orders', 'AOV'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    No data yet — import Uber Eats CSV to get started.
                  </td>
                </tr>
              ) : (
                dailyRows.map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatDate(row.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(row.grossSales)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{row.orders}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {row.orders > 0 ? formatCurrency(row.grossSales / row.orders) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 sm:hidden">
          {dailyRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No data yet — import Uber Eats CSV to get started.
            </p>
          ) : (
            dailyRows.map((row) => (
              <div key={row.date} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{formatDate(row.date)}</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(row.grossSales)}</p>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
                  <span>{row.orders} orders</span>
                  <span>{row.orders > 0 ? formatCurrency(row.grossSales / row.orders) : '—'} AOV</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
