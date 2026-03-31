import { Order, OrderLine } from './types'

const BRAND_SKU_PREFIXES: Record<string, string> = {
  'smsh-bn': 'SBN-',
  'wing-shack-co': 'WS-',
  'eggs-nstuff': 'ENS-',
}

function normalizeRef(value?: string | null): string {
  if (!value) return ''
  return String(value).replace(/#/g, '').trim().toLowerCase()
}

type AggregatedLineMetrics = {
  revenue: number
  cogs: number
  lineCount: number
}

function aggregateOrderLines(orderLines: OrderLine[]) {
  const byOrderId = new Map<string, AggregatedLineMetrics>()
  const byInvoiceNo = new Map<string, AggregatedLineMetrics>()

  for (const line of orderLines) {
    const revenue = Number(line.lineTotal) || 0
    const cogsTotal =
      line.cogsTotal != null
        ? Number(line.cogsTotal) || 0
        : (Number(line.cogsPerUnit) || 0) * (Number(line.quantity) || 0)

    const orderIdKey = normalizeRef(line.orderId)
    const invoiceKey = normalizeRef(line.invoiceNo)

    if (orderIdKey) {
      const current = byOrderId.get(orderIdKey) ?? { revenue: 0, cogs: 0, lineCount: 0 }
      current.revenue += revenue
      current.cogs += cogsTotal
      current.lineCount += 1
      byOrderId.set(orderIdKey, current)
    }

    if (invoiceKey) {
      const current = byInvoiceNo.get(invoiceKey) ?? { revenue: 0, cogs: 0, lineCount: 0 }
      current.revenue += revenue
      current.cogs += cogsTotal
      current.lineCount += 1
      byInvoiceNo.set(invoiceKey, current)
    }
  }

  return { byOrderId, byInvoiceNo }
}

export function applyOrderLineOverrides(
  orders: Order[],
  orderLines: OrderLine[],
  brandSlug?: string | null
): Order[] {
  if (!orders.length || !orderLines.length) {
    return orders
  }

  const skuPrefix = brandSlug ? BRAND_SKU_PREFIXES[brandSlug] : undefined
  const applicableLines = skuPrefix
    ? orderLines.filter((line) => String(line.sku || '').startsWith(skuPrefix))
    : orderLines

  const { byOrderId, byInvoiceNo } = aggregateOrderLines(applicableLines)

  return orders.map((order) => {
    const invoiceKey = normalizeRef(order.invoiceNo)
    const orderIdKey = normalizeRef(order.orderId)
    const metrics = (invoiceKey ? byInvoiceNo.get(invoiceKey) : undefined) ?? byOrderId.get(orderIdKey)

    if (!metrics || metrics.lineCount === 0) {
      return order
    }

    const grossProfit = metrics.revenue - metrics.cogs
    const grossMargin = metrics.revenue > 0 ? (grossProfit / metrics.revenue) * 100 : 0

    return {
      ...order,
      orderTotal: metrics.revenue,
      totalCOGS: metrics.cogs,
      grossProfit,
      grossMargin,
    }
  })
}
