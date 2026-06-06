'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Package } from 'lucide-react'
import type { ReactNode } from 'react'
import { getBrandDisplayName } from '@/lib/brands'
import type { KitchenSales, Order } from '@/lib/types'

type DetailChannel = 'gfv' | 'hungry_tum' | 'supply'

interface CompanyBrandRevenueAccountProps {
  brandSlug: string
  sales: KitchenSales[]
  supplyOrders: Order[]
}

const GFV_EARNINGS_RATE = 0.039

function formatCurrency(value: number): string {
  return `£${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function summarizeKitchenSales(rows: KitchenSales[]) {
  const revenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0)
  const orders = rows.reduce((sum, row) => sum + Number(row.count || 0), 0)
  return {
    revenue,
    orders,
    aov: orders > 0 ? revenue / orders : 0,
  }
}

function getThirtyDayProjection(rows: KitchenSales[]) {
  const validDates = rows.map((row) => row.date).filter(Boolean).sort()
  if (validDates.length === 0) {
    return { revenue: 0, orders: 0, daysObserved: 0 }
  }

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
  const factor = daysObserved > 0 ? 30 / daysObserved : 0

  return {
    revenue: recentRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0) * factor,
    orders: Math.round(recentRows.reduce((sum, row) => sum + Number(row.count || 0), 0) * factor),
    daysObserved,
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
  emphasis?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${emphasis ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  )
}

function ChannelHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  )
}

function Projection({
  revenue,
  orders,
  daysObserved,
}: {
  revenue: number
  orders: number
  daysObserved: number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Predicted next 30 days</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xl font-bold text-gray-900">{orders.toLocaleString()}</p>
          <p className="text-xs text-gray-600">projected orders</p>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(revenue)}</p>
          <p className="text-xs text-gray-600">projected revenue</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Based on the latest {daysObserved} days of available performance.
      </p>
    </div>
  )
}

export default function CompanyBrandRevenueAccount({
  brandSlug,
  sales,
  supplyOrders,
}: CompanyBrandRevenueAccountProps) {
  const [detailChannel, setDetailChannel] = useState<DetailChannel>('gfv')
  const brandName = getBrandDisplayName(brandSlug) ?? brandSlug
  const gfvSales = useMemo(() => sales.filter((sale) => sale.salesChannel !== 'hungry_tum'), [sales])
  const hungryTumSales = useMemo(() => sales.filter((sale) => sale.salesChannel === 'hungry_tum'), [sales])
  const sortedSupplyOrders = useMemo(
    () => [...supplyOrders].sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || ''))),
    [supplyOrders]
  )

  const gfv = summarizeKitchenSales(gfvSales)
  const hungryTum = summarizeKitchenSales(hungryTumSales)
  const gfvProjection = getThirtyDayProjection(gfvSales)
  const hungryTumProjection = getThirtyDayProjection(hungryTumSales)
  const gfvEarnings = gfv.revenue * GFV_EARNINGS_RATE

  const supplyRevenue = supplyOrders.reduce((sum, order) => sum + Number(order.orderTotal || 0), 0)
  const supplyCogs = supplyOrders.reduce((sum, order) => sum + Number(order.totalCOGS || 0), 0)
  const supplyGrossProfit = supplyRevenue - supplyCogs
  const supplyGrossMargin = supplyRevenue > 0 ? (supplyGrossProfit / supplyRevenue) * 100 : 0
  const supplyAov = supplyOrders.length > 0 ? supplyRevenue / supplyOrders.length : 0

  const totalRevenue = gfv.revenue + hungryTum.revenue + supplyRevenue
  const companyEarnings = gfvEarnings + supplyGrossProfit
  const detailRows = detailChannel === 'gfv' ? gfvSales : hungryTumSales

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-2xl border border-gray-200 border-l-4 border-l-orange-500 bg-white shadow-sm">
        <div className="grid gap-4 p-4 sm:p-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Brand Revenue Account</p>
            <h2 className="mt-2 text-xl font-bold text-gray-900 sm:text-3xl">{brandName} revenue performance.</h2>
            <p className="mt-3 hidden text-sm text-gray-600 sm:block">
              Kitchen network and supply activity across GFV and Hungry Tum-operated locations.
            </p>
          </div>
          <Metric label="Total revenue generated" value={formatCurrency(totalRevenue)} helper="Actual tracked revenue only" emphasis />
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue channels</p>
        <div className="grid gap-4 xl:grid-cols-3">
          <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <ChannelHeader
              icon={
                <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <Image src="/gfv logo.png" alt="GFV" fill sizes="36px" className="object-contain p-1" />
                </span>
              }
              title="GFV Kitchen Network"
              description="Revenue generated through GFV-operated kitchens."
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Revenue" value={formatCurrency(gfv.revenue)} />
              <Metric label="Orders" value={gfv.orders.toLocaleString()} />
              <Metric label="AOV" value={formatCurrency(gfv.aov)} />
              <Metric label={`${brandName} earnings`} value={formatCurrency(gfvEarnings)} helper="3.9% of revenue" emphasis />
            </div>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Partner/GFV-reported data. Figures may require confirmation before settlement.
            </p>
            <div className="mt-auto pt-4">
              <Projection {...gfvProjection} />
            </div>
          </article>

          <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <ChannelHeader
              icon={
                <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-orange-100 bg-white">
                  <Image src="/Hungry Tum Logo.jpeg" alt="Hungry Tum" fill sizes="36px" className="object-cover" />
                </span>
              }
              title="Hungry Tum Kitchen Network"
              description="Revenue generated from Hungry Tum controlled locations."
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Revenue" value={formatCurrency(hungryTum.revenue)} />
              <Metric label="Orders" value={hungryTum.orders.toLocaleString()} />
              <div className="col-span-2">
                <Metric label="AOV" value={formatCurrency(hungryTum.aov)} helper="Operational revenue reporting" />
              </div>
            </div>
            <div className="mt-auto pt-4">
              <Projection {...hungryTumProjection} />
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <ChannelHeader
              icon={
                <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
                  <Package className="h-5 w-5" />
                </span>
              }
              title="Hungry Tum Supply Store"
              description="Supply activity from franchise locations."
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Supply revenue" value={formatCurrency(supplyRevenue)} />
              <Metric label="Supply orders" value={supplyOrders.length.toLocaleString()} />
              <Metric label="Supply AOV" value={formatCurrency(supplyAov)} />
              <Metric label="COGS" value={formatCurrency(supplyCogs)} />
              <Metric label="GP %" value={`${supplyGrossMargin.toFixed(1)}%`} />
              <Metric label="GP £" value={formatCurrency(supplyGrossProfit)} emphasis />
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Business Performance Summary</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{brandName} reporting account</h2>
          <p className="mt-1 text-sm text-gray-500">
            GFV earnings are 3.9% of GFV kitchen revenue. Hungry Tum kitchen revenue is reported operationally without an internal payout charge.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total tracked revenue" value={formatCurrency(totalRevenue)} />
          <Metric label="GFV kitchen revenue" value={formatCurrency(gfv.revenue)} />
          <Metric label="Hungry Tum kitchen revenue" value={formatCurrency(hungryTum.revenue)} />
          <Metric label="Supply revenue" value={formatCurrency(supplyRevenue)} />
          <Metric label="GFV earnings" value={formatCurrency(gfvEarnings)} helper="3.9% of GFV revenue" />
          <Metric label="Supply GP" value={formatCurrency(supplyGrossProfit)} />
          <Metric label="Company earnings" value={formatCurrency(companyEarnings)} helper="GFV earnings + supply GP" emphasis />
          <Metric
            label="Supply status"
            value={`${supplyOrders.filter((order) => order.partnerPaid).length} paid`}
            helper={`${supplyOrders.filter((order) => !order.partnerPaid).length} pending`}
          />
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

        <div className="mt-4 space-y-3">
          {(detailChannel === 'supply' ? sortedSupplyOrders : detailRows).slice(0, 12).map((row) => {
            const isSupply = detailChannel === 'supply'
            const title = isSupply ? (row as Order).franchisee : (row as KitchenSales).location
            const date = isSupply ? (row as Order).orderDate : (row as KitchenSales).date
            const revenue = isSupply ? Number((row as Order).orderTotal || 0) : Number((row as KitchenSales).revenue || 0)
            const helper = isSupply
              ? `GP ${formatCurrency(revenue - Number((row as Order).totalCOGS || 0))}`
              : detailChannel === 'gfv'
                ? `${(row as KitchenSales).count} orders · earnings ${formatCurrency(revenue * GFV_EARNINGS_RATE)}`
                : `${(row as KitchenSales).count} orders`

            return (
              <div key={isSupply ? (row as Order).orderId : `${(row as KitchenSales).id || date}-${title}`} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="mt-1 text-xs text-gray-500">{date} · {helper}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(revenue)}</p>
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
