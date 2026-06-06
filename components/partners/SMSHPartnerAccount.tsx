'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Package,
  Store,
  WalletCards,
} from 'lucide-react'
import { KitchenSales, Order } from '@/lib/types'

type DetailChannel = 'gfv' | 'hungry_tum' | 'supply'

interface SMSHPartnerAccountProps {
  brandSlug: string
  sales: KitchenSales[]
  supplyOrders: Order[]
}

const GFV_KITCHEN_EARNINGS_RATE = 0.039
const HUNGRY_TUM_KITCHEN_EARNINGS_RATE = 0.06
const HUNGRY_TUM_FEE_RATE = 0.2

function formatCurrency(value: number): string {
  return `£${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function summarizeKitchenSales(rows: KitchenSales[], earningsRate: number) {
  const revenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0)
  const orders = rows.reduce((sum, row) => sum + Number(row.count || 0), 0)

  return {
    revenue,
    orders,
    aov: orders > 0 ? revenue / orders : 0,
    earnings: revenue * earningsRate,
  }
}

function getThirtyDayProjection(rows: KitchenSales[]) {
  if (rows.length === 0) {
    return { revenue: 0, orders: 0, daysObserved: 0, startDate: null, endDate: null }
  }

  const validDates = rows.map((row) => row.date).filter(Boolean).sort()
  const endDate = new Date(`${validDates[validDates.length - 1]}T00:00:00`)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 29)
  const startIso = startDate.toISOString().split('T')[0]
  const endIso = endDate.toISOString().split('T')[0]
  const recentRows = rows.filter((row) => row.date >= startIso && row.date <= endIso)
  const observedDates = Array.from(new Set(recentRows.map((row) => row.date))).sort()
  const daysObserved = observedDates.length > 0
    ? Math.max(
        1,
        Math.round(
          (new Date(`${observedDates[observedDates.length - 1]}T00:00:00`).getTime() -
            new Date(`${observedDates[0]}T00:00:00`).getTime()) /
            (24 * 60 * 60 * 1000)
        ) + 1
      )
    : 0
  const recentRevenue = recentRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0)
  const recentOrders = recentRows.reduce((sum, row) => sum + Number(row.count || 0), 0)
  const projectionFactor = daysObserved > 0 ? 30 / daysObserved : 0

  return {
    revenue: recentRevenue * projectionFactor,
    orders: Math.round(recentOrders * projectionFactor),
    daysObserved,
    startDate: observedDates[0] ?? null,
    endDate: observedDates[observedDates.length - 1] ?? null,
  }
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
      <p className={`text-xs font-semibold uppercase tracking-wide ${emphasis === 'strong' ? 'text-orange-50' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold sm:text-2xl ${emphasis === 'strong' ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
      {helper && <p className={`mt-1 text-xs ${emphasis === 'strong' ? 'text-orange-50' : 'text-gray-500'}`}>{helper}</p>}
    </div>
  )
}

function MobileChannelRow({
  icon,
  title,
  revenue,
  earnings,
  earningsLabel,
  projectedRevenue,
}: {
  icon: ReactNode
  title: string
  revenue: number
  earnings: number
  earningsLabel: string
  projectedRevenue?: number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-orange-50 p-2 text-orange-600">{icon}</span>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Revenue</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(revenue)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">SMSH earnings</p>
          <p className="mt-1 text-lg font-bold text-orange-700">{formatCurrency(earnings)}</p>
          <p className="text-[10px] text-gray-500">{earningsLabel}</p>
        </div>
      </div>
      {projectedRevenue != null && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
          <span className="text-gray-500">Predicted next 30 days</span>
          <span className="font-semibold text-gray-900">{formatCurrency(projectedRevenue)}</span>
        </div>
      )}
    </div>
  )
}

export default function SMSHPartnerAccount({ brandSlug, sales, supplyOrders }: SMSHPartnerAccountProps) {
  const [detailChannel, setDetailChannel] = useState<DetailChannel>('gfv')
  const gfvSales = useMemo(
    () => sales.filter((sale) => sale.salesChannel !== 'hungry_tum'),
    [sales]
  )
  const hungryTumSales = useMemo(
    () => sales.filter((sale) => sale.salesChannel === 'hungry_tum'),
    [sales]
  )
  const sortedSupplyOrders = useMemo(
    () => [...supplyOrders].sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || ''))),
    [supplyOrders]
  )
  const gfv = summarizeKitchenSales(gfvSales, GFV_KITCHEN_EARNINGS_RATE)
  const hungryTum = summarizeKitchenSales(hungryTumSales, HUNGRY_TUM_KITCHEN_EARNINGS_RATE)
  const gfvProjection = getThirtyDayProjection(gfvSales)
  const hungryTumProjection = getThirtyDayProjection(hungryTumSales)

  const supplyRevenue = supplyOrders.reduce((sum, order) => sum + (Number(order.orderTotal) || 0), 0)
  const supplyCogs = supplyOrders.reduce((sum, order) => sum + (Number(order.totalCOGS) || 0), 0)
  const supplyGrossProfit = supplyRevenue - supplyCogs
  const supplyGrossMargin = supplyRevenue > 0 ? (supplyGrossProfit / supplyRevenue) * 100 : 0
  const supplyAov = supplyOrders.length > 0 ? supplyRevenue / supplyOrders.length : 0

  const totalRevenue = gfv.revenue + hungryTum.revenue + supplyRevenue
  const kitchenEarnings = gfv.earnings + hungryTum.earnings
  const partnerGrossEarnings = kitchenEarnings + supplyGrossProfit
  const hungryTumFee = partnerGrossEarnings * HUNGRY_TUM_FEE_RATE
  const netPartnerPayout = partnerGrossEarnings - hungryTumFee

  const detailRows = detailChannel === 'gfv' ? gfvSales : hungryTumSales

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-2xl border border-gray-200 border-l-4 border-l-orange-500 bg-white text-gray-900 shadow-sm">
        <div className="grid gap-4 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Partner Revenue Account</p>
            <h2 className="mt-2 max-w-3xl text-xl font-bold leading-tight sm:mt-3 sm:text-3xl">
              Your SMSH BN revenue and earnings.
            </h2>
            <p className="mt-3 hidden max-w-3xl text-sm leading-6 text-gray-600 sm:block">
              See revenue from GFV kitchens, Hungry Tum kitchens and supply orders, including earnings, fees and payout status.
            </p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total revenue generated</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="mt-2 text-xs text-gray-500">Actual tracked revenue only. Projections are excluded.</p>
          </div>
        </div>
      </section>

      <section className="sm:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Gross earnings" value={formatCurrency(partnerGrossEarnings)} emphasis="soft" />
          <Metric label="Net payout" value={formatCurrency(netPartnerPayout)} emphasis="strong" />
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">
          Includes a Hungry Tum fee of {formatCurrency(hungryTumFee)}.
        </p>
        <div className="mt-4 space-y-3">
          <MobileChannelRow
            icon={
              <span className="relative block h-5 w-5 overflow-hidden">
                <Image src="/gfv logo.png" alt="GFV" fill sizes="20px" className="object-contain" />
              </span>
            }
            title="GFV Kitchens"
            revenue={gfv.revenue}
            earnings={gfv.earnings}
            earningsLabel="3.9% of revenue"
            projectedRevenue={gfvProjection.revenue}
          />
          <MobileChannelRow
            icon={<Store className="h-4 w-4" />}
            title="Hungry Tum Kitchens"
            revenue={hungryTum.revenue}
            earnings={hungryTum.earnings}
            earningsLabel="6% of revenue"
            projectedRevenue={hungryTumProjection.revenue}
          />
          <MobileChannelRow
            icon={<Package className="h-4 w-4" />}
            title="Supply Store"
            revenue={supplyRevenue}
            earnings={supplyGrossProfit}
            earningsLabel="Gross profit after COGS"
          />
        </div>
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <p>GFV figures are partner-reported and may require confirmation before payout.</p>
        </div>
      </section>

      <section className="hidden sm:block">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue channels</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <Image
                      src="/gfv logo.png"
                      alt="GFV"
                      fill
                      sizes="36px"
                      className="object-contain p-1"
                    />
                  </span>
                  <h3 className="font-semibold text-gray-900">GFV Kitchen Network</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600">Revenue generated through GFV-operated kitchens.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Revenue" value={formatCurrency(gfv.revenue)} />
              <Metric label="Orders" value={gfv.orders.toLocaleString()} />
              <Metric label="AOV" value={formatCurrency(gfv.aov)} />
              <Metric label="SMSH earnings" value={formatCurrency(gfv.earnings)} helper="3.9% of revenue" emphasis="soft" />
            </div>
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p>Partner/GFV-reported data. Figures may require confirmation before payout.</p>
            </div>
            <div className="mt-auto pt-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Expected next 30 days</p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xl font-bold">{gfvProjection.orders.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">projected orders</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{formatCurrency(gfvProjection.revenue)}</p>
                  <p className="text-xs text-gray-600">projected revenue</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-600">
                Current active GFV network run rate from the latest {gfvProjection.daysObserved || 0} days. Excluded from earnings.
              </p>
              </div>
            </div>
          </article>

          <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-orange-100 bg-white">
                    <Image
                      src="/Hungry Tum Logo.jpeg"
                      alt="Hungry Tum"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </span>
                  <h3 className="font-semibold text-gray-900">Hungry Tum Kitchen Network</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600">Revenue generated from Hungry Tum controlled locations.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Actual revenue" value={formatCurrency(hungryTum.revenue)} />
              <Metric label="Actual orders" value={hungryTum.orders.toLocaleString()} />
              <Metric label="AOV" value={formatCurrency(hungryTum.aov)} />
              <Metric label="SMSH earnings" value={formatCurrency(hungryTum.earnings)} helper="6% of revenue" emphasis="soft" />
            </div>
            <div className="mt-auto pt-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Expected next 30 days</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-bold">{hungryTumProjection.orders.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">projected orders</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatCurrency(hungryTumProjection.revenue)}</p>
                    <p className="text-xs text-gray-600">projected revenue</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  Current active Hungry Tum location run rate from the latest {hungryTumProjection.daysObserved || 0} days.
                  It is directional and excluded from earnings.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-orange-100 bg-white">
                    <Image
                      src="/Hungry Tum Logo.jpeg"
                      alt="Hungry Tum"
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </span>
                  <h3 className="font-semibold text-gray-900">Hungry Tum Supply Store</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600">Supply activity from franchise locations.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Supply revenue" value={formatCurrency(supplyRevenue)} />
              <Metric label="Supply orders" value={supplyOrders.length.toLocaleString()} />
              <Metric label="Supply AOV" value={formatCurrency(supplyAov)} />
              <Metric label="GP %" value={`${supplyGrossMargin.toFixed(1)}%`} />
              <div className="col-span-2">
                <Metric label="SMSH supply GP earnings" value={formatCurrency(supplyGrossProfit)} emphasis="soft" />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:block sm:p-6">
        <div className="flex items-start gap-3">
          <WalletCards className="mt-0.5 h-5 w-5 text-orange-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Partner Account / Payout</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">SMSH BN earnings account</h2>
            <p className="mt-1 text-sm text-gray-500">
              GFV earnings are 3.9% of revenue, Hungry Tum kitchen earnings are 6%, and supply earnings are gross profit after COGS.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total revenue generated" value={formatCurrency(totalRevenue)} />
          <Metric
            label="Kitchen earnings"
            value={formatCurrency(kitchenEarnings)}
            helper="GFV at 3.9% + Hungry Tum sites at 6%"
          />
          <Metric label="Supply GP earnings" value={formatCurrency(supplyGrossProfit)} />
          <Metric label="Partner gross earnings" value={formatCurrency(partnerGrossEarnings)} emphasis="soft" />
          <Metric label="Hungry Tum fee" value={`-${formatCurrency(hungryTumFee)}`} helper="20% of partner gross earnings" />
          <Metric label="Net partner payout" value={formatCurrency(netPartnerPayout)} helper="After Hungry Tum's 20% fee" emphasis="strong" />
          <Metric label="Account balance" value="Awaiting reconciliation" helper="Requires payout ledger" />
          <Metric label="Next payout date" value="To be confirmed" helper="Requires agreed payout schedule" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Paid amount</p>
              <p className="text-sm text-gray-500">Awaiting payout ledger reconciliation</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <CalendarClock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Pending amount</p>
              <p className="text-sm text-gray-500">Awaiting payout ledger reconciliation</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Revenue detail</h2>
            <p className="mt-1 text-sm text-gray-500">Review each revenue channel independently.</p>
          </div>
          <div className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-1">
            {([
              ['gfv', 'GFV Kitchens'],
              ['hungry_tum', 'Hungry Tum Kitchens'],
              ['supply', 'Supply Store'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDetailChannel(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  detailChannel === value ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 hidden overflow-x-auto sm:block">
          {detailChannel === 'supply' ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">GP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedSupplyOrders.slice(0, 12).map((order) => {
                  const rowGp = (Number(order.orderTotal) || 0) - (Number(order.totalCOGS) || 0)
                  return (
                    <tr key={order.orderId || order.invoiceNo}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{order.orderDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{order.franchisee}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(Number(order.orderTotal) || 0)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-orange-700">{formatCurrency(rowGp)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">SMSH earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {detailRows.slice(0, 12).map((row) => (
                  <tr key={`${row.id || row.date}-${row.location}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.location}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(row.revenue)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{row.count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-orange-700">
                      {formatCurrency(
                        row.revenue *
                          (detailChannel === 'hungry_tum'
                            ? HUNGRY_TUM_KITCHEN_EARNINGS_RATE
                            : GFV_KITCHEN_EARNINGS_RATE)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 space-y-3 sm:hidden">
          {detailChannel === 'supply'
            ? sortedSupplyOrders.slice(0, 6).map((order) => {
                const rowGp = (Number(order.orderTotal) || 0) - (Number(order.totalCOGS) || 0)
                return (
                  <div key={order.orderId || order.invoiceNo} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{order.franchisee || 'Supply order'}</p>
                        <p className="mt-1 text-xs text-gray-500">{order.orderDate}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(order.orderTotal) || 0)}</p>
                    </div>
                    <p className="mt-2 text-xs font-medium text-orange-700">GP {formatCurrency(rowGp)}</p>
                  </div>
                )
              })
            : detailRows.slice(0, 6).map((row) => {
                const rate =
                  detailChannel === 'hungry_tum'
                    ? HUNGRY_TUM_KITCHEN_EARNINGS_RATE
                    : GFV_KITCHEN_EARNINGS_RATE
                return (
                  <div key={`${row.id || row.date}-${row.location}`} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{row.location}</p>
                        <p className="mt-1 text-xs text-gray-500">{row.date} · {row.count} orders</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(row.revenue)}</p>
                    </div>
                    <p className="mt-2 text-xs font-medium text-orange-700">
                      SMSH earnings {formatCurrency(row.revenue * rate)}
                    </p>
                  </div>
                )
              })}
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            href={detailChannel === 'supply' ? `/brands/${brandSlug}/orders` : `/brands/${brandSlug}/sales`}
            className="inline-flex items-center gap-1 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            View full channel detail
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
