'use client'

import { useEffect, useMemo, useState } from 'react'
import { Store, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { KitchenSales } from '@/lib/types'
import { getBrandDefinition } from '@/lib/brands'
import { toLocalDateStr } from '@/lib/utils'
import type { DeliverooDay } from '@/app/api/sales/deliveroo-site/route'
import PlatformLogo from '@/components/PlatformLogo'

function formatCurrency(value: number): string {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string): string {
  const parts = d.split('-')
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d
}

function fmtDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Period types ──────────────────────────────────────────────────────────────

type Period =
  | { type: 'this_week' }
  | { type: 'last_week' }
  | { type: 'week'; weekStart: string }
  | { type: 'all_time' }

function getMonday(weeksAgo: number): Date {
  const today = new Date()
  const daysSinceMonday = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysSinceMonday - 7 * weeksAgo)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function periodRange(period: Period): { start: string; end: string } | null {
  if (period.type === 'all_time') return null
  if (period.type === 'this_week') {
    const mon = getMonday(0)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { start: toLocalDateStr(mon), end: toLocalDateStr(sun) }
  }
  if (period.type === 'last_week') {
    const mon = getMonday(1)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { start: toLocalDateStr(mon), end: toLocalDateStr(sun) }
  }
  const mon = new Date(period.weekStart + 'T00:00:00')
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { start: period.weekStart, end: toLocalDateStr(sun) }
}

function getPeriodLabel(period: Period): string {
  if (period.type === 'all_time') return 'All Time'
  const range = periodRange(period)!
  return `${fmtDMY(range.start)} – ${fmtDMY(range.end)}`
}

function filterByPeriod(sales: KitchenSales[], period: Period): KitchenSales[] {
  const range = periodRange(period)
  if (!range) return sales
  return sales.filter((s) => s.date >= range.start && s.date <= range.end)
}

function getOlderWeeks(allSales: KitchenSales[]): { weekStart: string; label: string }[] {
  if (allSales.length === 0) return []
  const dates = allSales.map((s) => s.date).filter(Boolean).sort()
  const firstDate = new Date(dates[0] + 'T00:00:00')
  const cursor = getMonday(2)
  const weeks: { weekStart: string; label: string }[] = []
  while (cursor >= firstDate) {
    const start = toLocalDateStr(cursor)
    weeks.push({ weekStart: start, label: `Week of ${fmtDMY(start)}` })
    cursor.setDate(cursor.getDate() - 7)
  }
  return weeks
}

// ── Misc helpers ──────────────────────────────────────────────────────────────

function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold sm:text-2xl text-gray-900">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface WSCChathamPartnerAccountProps {
  brandSlug: string
  sales: KitchenSales[]
  startDate?: string
  endDate?: string
}

export default function WSCChathamPartnerAccount({
  brandSlug,
  sales,
  startDate,
  endDate,
}: WSCChathamPartnerAccountProps) {
  const brandDef = getBrandDefinition(brandSlug)
  const deliverooLocationKey = brandDef?.deliverooLocationKey ?? null
  const dataStartDate = brandDef?.dataStartDate ?? null

  const [deliverooRows, setDeliverooRows] = useState<DeliverooDay[]>([])
  const [deliverooLoading, setDeliverooLoading] = useState(!!deliverooLocationKey)
  const [period, setPeriod] = useState<Period>({ type: 'this_week' })

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

  const periodSales = useMemo(() => filterByPeriod(allSales, period), [allSales, period])

  const periodOrders = periodSales.reduce((s, r) => s + Number(r.count || 0), 0)
  const periodGross = periodSales.reduce((s, r) => s + Number(r.grossSales || 0), 0)
  const periodAov = periodOrders > 0 ? periodGross / periodOrders : 0

  const periodPlatformRows = useMemo(() => {
    const grouped = new Map<string, { grossSales: number; orders: number }>()
    for (const s of periodSales) {
      const key = s.platform || 'unknown'
      const existing = grouped.get(key) ?? { grossSales: 0, orders: 0 }
      existing.grossSales += Number(s.grossSales || 0)
      existing.orders += Number(s.count || 0)
      grouped.set(key, existing)
    }
    return Array.from(grouped.entries())
      .map(([platform, data]) => ({ platform, ...data }))
      .sort((a, b) => b.grossSales - a.grossSales)
  }, [periodSales])

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

  const olderWeeks = useMemo(() => getOlderWeeks(allSales), [allSales])

  const dropdownActive = period.type === 'week' || period.type === 'all_time'
  const dropdownValue =
    period.type === 'week'
      ? period.weekStart
      : period.type === 'all_time'
        ? '__all_time__'
        : ''

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── Sales Channels (period-aware) ─────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sales Channels</p>
            <p className="mt-0.5 text-xs text-gray-400">{getPeriodLabel(period)}</p>
          </div>

          {/* Period selector */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
            {(
              [
                { type: 'this_week' as const, label: 'This Week' },
                { type: 'last_week' as const, label: 'Last Week' },
              ] as const
            ).map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setPeriod({ type })}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                  period.type === type
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-500 hover:text-gray-900',
                ].join(' ')}
              >
                {label}
              </button>
            ))}

            <select
              value={dropdownValue}
              onChange={(e) => {
                const val = e.target.value
                if (!val) return
                if (val === '__all_time__') setPeriod({ type: 'all_time' })
                else setPeriod({ type: 'week', weekStart: val })
              }}
              className={[
                'rounded-lg py-2 pl-3 pr-2 text-sm font-medium transition-all cursor-pointer border-0 outline-none appearance-none',
                dropdownActive
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'bg-transparent text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              <option value="" disabled>Earlier…</option>
              {olderWeeks.map((w) => (
                <option key={w.weekStart} value={w.weekStart}>{w.label}</option>
              ))}
              <option value="__all_time__">All Time</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
                <Store className="h-4 w-4" />
              </span>
              <h3 className="font-semibold text-gray-900">Third-party Platforms</h3>
            </div>
            <p className="mb-5 text-sm text-gray-500">Uber Eats, Deliveroo and other delivery platforms.</p>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Gross Sales" value={formatCurrency(periodGross)} />
              <Metric label="Orders" value={periodOrders.toLocaleString()} />
              <Metric label="AOV" value={periodOrders > 0 ? formatCurrency(periodAov) : '—'} />
            </div>

            {(deliverooLoading || periodPlatformRows.length > 0) && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">By platform</p>
                {deliverooLoading ? (
                  <p className="text-xs text-gray-400">Loading Deliveroo data…</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Platform', 'Gross Sales', 'Orders', 'AOV'].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium uppercase tracking-wide text-gray-500">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {periodPlatformRows.map((row) => (
                          <tr key={row.platform} className="bg-white">
                            <td className="px-3 py-2"><PlatformLogo platform={row.platform} height={28} /></td>
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

          </article>

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
            <p className="mt-4 text-xs text-gray-400">Wing Shack App sales not yet connected to Partners OS.</p>
          </article>
        </div>
      </section>

      {/* ── Daily breakdown (full history) ───────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Daily breakdown</h2>
          <p className="mt-1 text-sm text-gray-500">Gross sales and order count per day — all time.</p>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Gross Sales', 'Orders', 'AOV'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
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
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(row.grossSales)}</td>
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

        <div className="space-y-3 sm:hidden">
          {dailyRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No data yet.</p>
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
