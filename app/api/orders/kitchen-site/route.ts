import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface KitchenSiteOrder {
  id: string
  orderDate: string
  deliveryDate: string | null
  status: string
  supplyStage: string | null
  orderTotal: number
  itemCount: number
  items: KitchenSiteOrderItem[]
}

export interface KitchenSiteOrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

async function fetchFromOrdering(path: string) {
  const url = process.env.HT_ORDERING_SUPABASE_URL
  const key = process.env.HT_ORDERING_SERVICE_KEY
  if (!url || !key) throw new Error('HT_ORDERING_SUPABASE_URL / HT_ORDERING_SERVICE_KEY not set')

  const res = await fetch(`${url}/rest/v1/${path}`, {
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Ordering DB error: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    // Fetch orders for this site, most recent first
    // total_resale = price site pays; delivery_charge added on top
    const orders = await fetchFromOrdering(
      `orders?select=id,created_at,delivery_date,status,supply_stage,total_resale,delivery_charge&site_id=eq.${siteId}&order=created_at.desc&limit=100`
    )

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Fetch order items + product names for all orders in one query
    const orderIds = orders.map((o: any) => o.id).join(',')
    const [items, products] = await Promise.all([
      fetchFromOrdering(
        `order_items?select=id,order_id,product_id,quantity,unit_resale&order_id=in.(${orderIds})`
      ),
      fetchFromOrdering(`products?select=id,name`),
    ])

    const productMap = new Map<string, string>(
      (products as any[]).map((p: any) => [p.id, p.name])
    )

    // Group items by order_id
    const itemsByOrder = new Map<string, KitchenSiteOrderItem[]>()
    for (const item of items as any[]) {
      const list = itemsByOrder.get(item.order_id) ?? []
      const unitPrice = Number(item.unit_resale) || 0
      const qty = Number(item.quantity) || 0
      list.push({
        id: item.id,
        productName: productMap.get(item.product_id) ?? 'Unknown product',
        quantity: qty,
        unitPrice,
        totalPrice: qty * unitPrice,
      })
      itemsByOrder.set(item.order_id, list)
    }

    const result: KitchenSiteOrder[] = orders.map((o: any) => ({
      id: o.id,
      orderDate: o.created_at?.split('T')[0] ?? '',
      deliveryDate: o.delivery_date ?? null,
      status: o.status ?? 'unknown',
      supplyStage: o.supply_stage ?? null,
      orderTotal: (Number(o.total_resale) || 0) + (Number(o.delivery_charge) || 0),
      itemCount: (itemsByOrder.get(o.id) ?? []).length,
      items: itemsByOrder.get(o.id) ?? [],
    }))

    return NextResponse.json({ orders: result })
  } catch (error: any) {
    console.error('[Kitchen Site Orders API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
