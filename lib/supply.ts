import { Order } from './types'
import { getCanonicalBrandSlug, getBrandDisplayName } from './brands'

const SUPABASE_URL = process.env.HT_PARTNERS_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY!

interface SupplyOrder {
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

export async function getSupplyOrders(brandParam?: string): Promise<Order[]> {
  const isAdmin = !brandParam || brandParam.toLowerCase() === 'admin'
  const brandSlug = isAdmin ? undefined : (getCanonicalBrandSlug(brandParam) ?? undefined)

  const url = `${SUPABASE_URL}/rest/v1/supply_orders?select=*&order=settled_at.desc`

  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Accept-Profile': 'sales',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[supply] Failed to fetch supply_orders: ${err}`)
  }

  const rows: SupplyOrder[] = await res.json()
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
    daysOpen: 0,
    nextAction: '',
  }))
}
