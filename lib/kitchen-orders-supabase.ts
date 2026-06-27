const PARTNERS_URL = process.env.HT_PARTNERS_SUPABASE_URL
const PARTNERS_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY

export interface KitchenOrder {
  id: string
  brandSlug: string
  platform: string
  orderId: string
  date: string
  location: string | null
  grossAmount: number
  status: string | null
}

interface RawRow {
  id: string
  brand_slug: string
  platform: string
  order_id: string
  date: string
  location: string | null
  gross_amount: number
  status: string | null
}

function toKitchenOrder(row: RawRow): KitchenOrder {
  return {
    id: row.id,
    brandSlug: row.brand_slug,
    platform: row.platform,
    orderId: row.order_id,
    date: row.date,
    location: row.location,
    grossAmount: Number(row.gross_amount),
    status: row.status,
  }
}

export async function insertKitchenOrders(
  brandSlug: string,
  orders: Array<{
    orderId: string
    date: string
    location: string
    grossAmount: number
    status: string
    platform: string
  }>
): Promise<{ imported: number; skipped: number }> {
  if (!PARTNERS_URL || !PARTNERS_KEY) throw new Error('Partners Supabase env vars not set')
  if (orders.length === 0) return { imported: 0, skipped: 0 }

  const records = orders.map((o) => ({
    brand_slug: brandSlug,
    platform: o.platform,
    order_id: o.orderId,
    date: o.date,
    location: o.location,
    gross_amount: o.grossAmount,
    status: o.status,
  }))

  const res = await fetch(
    `${PARTNERS_URL}/rest/v1/kitchen_orders?on_conflict=${encodeURIComponent('platform,order_id')}`,
    {
      method: 'POST',
      headers: {
        apikey: PARTNERS_KEY,
        Authorization: `Bearer ${PARTNERS_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'sales',
        Prefer: 'return=representation,resolution=ignore-duplicates',
      },
      body: JSON.stringify(records),
    }
  )

  if (!res.ok) throw new Error(`Supabase insert error: ${res.status} ${await res.text()}`)

  const inserted: RawRow[] = await res.json()
  return { imported: inserted.length, skipped: orders.length - inserted.length }
}

export async function getKitchenOrders(
  brandSlug: string,
  startDate?: string,
  endDate?: string,
  locationFilter?: string
): Promise<KitchenOrder[]> {
  if (!PARTNERS_URL || !PARTNERS_KEY) throw new Error('Partners Supabase env vars not set')

  let url = `${PARTNERS_URL}/rest/v1/kitchen_orders?brand_slug=eq.${encodeURIComponent(brandSlug)}&order=date.desc&limit=5000`
  if (startDate) url += `&date=gte.${startDate}`
  if (endDate) {
    // Use lt(nextDay) rather than lte(endDate) to avoid a PostgREST boundary issue
    // where lte.CURRENT_UTC_DATE can exclude rows dated that day.
    const next = new Date(`${endDate}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    url += `&date=lt.${next.toISOString().split('T')[0]}`
  }
  if (locationFilter) url += `&location=ilike.*${locationFilter}*`

  const res = await fetch(url, {
    headers: {
      apikey: PARTNERS_KEY,
      Authorization: `Bearer ${PARTNERS_KEY}`,
      Accept: 'application/json',
      'Accept-Profile': 'sales',
    },
  })

  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status} ${await res.text()}`)

  const rows: RawRow[] = await res.json()
  return rows.map(toKitchenOrder)
}
