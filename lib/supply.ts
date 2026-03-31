import { Order } from './types'
import { getCanonicalBrandSlug, getBrandDisplayName } from './brands'

const PARTNERS_SUPABASE_URL = process.env.HT_PARTNERS_SUPABASE_URL!
const PARTNERS_SERVICE_ROLE_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY!

const ORDERING_SUPABASE_URL =
  process.env.HT_ORDERING_SUPABASE_URL ??
  process.env.ORDERING_SUPABASE_URL ??
  null
const ORDERING_SERVICE_ROLE_KEY =
  process.env.HT_ORDERING_SERVICE_ROLE_KEY ??
  process.env.ORDERING_SUPABASE_SERVICE_ROLE_KEY ??
  null

const BRAND_SKU_PREFIXES: Record<string, string> = {
  'smsh-bn': 'SBN-',
  'wing-shack-co': 'WS-',
  'eggs-nstuff': 'ENS-',
}

interface SupplyOrderSnapshot {
  id: string
  site_id: string | null
  brand_slug: string
  site_name: string | null
  total: number
  total_cogs: number | null
  currency: string
  order_created_at: string | null
  settled_at: string | null
  received_at: string
}

interface OrderingOrderRow {
  id: string
  created_at: string | null
  site_id: string | null
  status: string
  sites?: { name?: string | null } | { name?: string | null }[] | null
}

interface OrderingItemRow {
  order_id: string
  quantity: number | null
  unit_cost: number | null
  unit_resale: number | null
  products?: { sku?: string | null } | { sku?: string | null }[] | null
}

function getOrderingHeaders() {
  if (!ORDERING_SUPABASE_URL || !ORDERING_SERVICE_ROLE_KEY) {
    return null
  }

  return {
    apikey: ORDERING_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${ORDERING_SERVICE_ROLE_KEY}`,
  }
}

function getSiteName(sites: OrderingOrderRow['sites']): string {
  if (!sites) return ''
  if (Array.isArray(sites)) {
    return sites[0]?.name ?? ''
  }
  return sites.name ?? ''
}

async function getSupplyOrdersFromSnapshot(brandParam?: string): Promise<Order[]> {
  const isAdmin = !brandParam || brandParam.toLowerCase() === 'admin'
  const brandSlug = isAdmin ? undefined : (getCanonicalBrandSlug(brandParam) ?? undefined)

  const url = `${PARTNERS_SUPABASE_URL}/rest/v1/supply_orders?select=*&order=settled_at.desc`

  const res = await fetch(url, {
    headers: {
      apikey: PARTNERS_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${PARTNERS_SERVICE_ROLE_KEY}`,
      'Accept-Profile': 'sales',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[supply] Failed to fetch supply_orders snapshot: ${err}`)
  }

  const rows: SupplyOrderSnapshot[] = await res.json()
  const filteredRows = brandSlug
    ? rows.filter((row) => getCanonicalBrandSlug(row.brand_slug) === brandSlug)
    : rows

  return filteredRows.map((row) => ({
    orderId: row.id,
    invoiceNo: row.id,
    brand: getBrandDisplayName(row.brand_slug) ?? row.brand_slug,
    franchisee: row.site_name ?? '',
    orderDate: row.order_created_at
      ? row.order_created_at.split('T')[0]
      : row.settled_at?.split('T')[0] ?? '',
    orderStage: 'Settled',
    supplierOrdered: true,
    supplierShipped: true,
    deliveredToPartner: true,
    partnerPaid: true,
    orderTotal: Number(row.total),
    totalCOGS: row.total_cogs != null ? Number(row.total_cogs) : undefined,
    grossProfit:
      row.total_cogs != null ? Number(row.total) - Number(row.total_cogs) : undefined,
    grossMargin:
      row.total_cogs != null && Number(row.total) > 0
        ? ((Number(row.total) - Number(row.total_cogs)) / Number(row.total)) * 100
        : undefined,
    daysOpen: 0,
    nextAction: '',
  }))
}

async function getBrandSupplyOrdersFromOrdering(brandSlug: string): Promise<Order[]> {
  const skuPrefix = BRAND_SKU_PREFIXES[brandSlug]
  const orderingHeaders = getOrderingHeaders()

  if (!orderingHeaders || !skuPrefix) {
    return getSupplyOrdersFromSnapshot(brandSlug)
  }

  const orderItemsUrl = new URL(`${ORDERING_SUPABASE_URL}/rest/v1/order_items`)
  orderItemsUrl.searchParams.set('select', 'order_id,quantity,unit_cost,unit_resale,products!inner(sku)')
  orderItemsUrl.searchParams.set('products.sku', `like.${skuPrefix}%`)

  const itemsRes = await fetch(orderItemsUrl.toString(), {
    headers: orderingHeaders,
    cache: 'no-store',
  })

  if (!itemsRes.ok) {
    const err = await itemsRes.text()
    throw new Error(`[supply] Failed to fetch ordering items for ${brandSlug}: ${err}`)
  }

  const itemRows = (await itemsRes.json()) as OrderingItemRow[]
  if (itemRows.length === 0) {
    return []
  }

  const metricsByOrder = new Map<string, { revenue: number; cost: number }>()
  for (const item of itemRows) {
    const orderId = item.order_id
    const existing = metricsByOrder.get(orderId) ?? { revenue: 0, cost: 0 }
    existing.revenue += (Number(item.quantity) || 0) * (Number(item.unit_resale) || 0)
    existing.cost += (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)
    metricsByOrder.set(orderId, existing)
  }

  const orderIds = Array.from(metricsByOrder.keys())
  const chunkSize = 200
  const orderRows: OrderingOrderRow[] = []

  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize)
    const inList = `(${chunk.join(',')})`
    const ordersUrl = new URL(`${ORDERING_SUPABASE_URL}/rest/v1/orders`)
    ordersUrl.searchParams.set('select', 'id,created_at,site_id,status,sites(name)')
    ordersUrl.searchParams.set('id', `in.${inList}`)
    ordersUrl.searchParams.set('status', 'in.(paid,fulfilled)')
    ordersUrl.searchParams.set('order', 'created_at.desc')

    const ordersRes = await fetch(ordersUrl.toString(), {
      headers: orderingHeaders,
      cache: 'no-store',
    })

    if (!ordersRes.ok) {
      const err = await ordersRes.text()
      throw new Error(`[supply] Failed to fetch ordering orders for ${brandSlug}: ${err}`)
    }

    orderRows.push(...((await ordersRes.json()) as OrderingOrderRow[]))
  }

  return orderRows.map((order) => {
    const metrics = metricsByOrder.get(order.id) ?? { revenue: 0, cost: 0 }
    const grossProfit = metrics.revenue - metrics.cost

    return {
      orderId: order.id,
      invoiceNo: order.id,
      brand: getBrandDisplayName(brandSlug) ?? brandSlug,
      franchisee: getSiteName(order.sites),
      orderDate: order.created_at?.split('T')[0] ?? '',
      orderStage: order.status,
      supplierOrdered: true,
      supplierShipped: true,
      deliveredToPartner: true,
      partnerPaid: true,
      orderTotal: metrics.revenue,
      totalCOGS: metrics.cost,
      grossProfit,
      grossMargin: metrics.revenue > 0 ? (grossProfit / metrics.revenue) * 100 : 0,
      daysOpen: 0,
      nextAction: '',
    } satisfies Order
  })
}

export async function getSupplyOrders(brandParam?: string): Promise<Order[]> {
  const canonicalBrandSlug = brandParam ? getCanonicalBrandSlug(brandParam) : null

  if (canonicalBrandSlug && canonicalBrandSlug !== 'admin') {
    return getBrandSupplyOrdersFromOrdering(canonicalBrandSlug)
  }

  return getSupplyOrdersFromSnapshot(brandParam)
}
