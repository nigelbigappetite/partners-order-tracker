import { NextResponse } from 'next/server'
import { getBrandDefinition, getCanonicalBrandSlug } from '@/lib/brands'
import { getKitchenOrders, KitchenOrder } from '@/lib/kitchen-orders-supabase'

export const dynamic = 'force-dynamic'

const BRAIN_URL = process.env.HT_BRAIN_SUPABASE_URL
const BRAIN_KEY = process.env.HT_BRAIN_SERVICE_KEY

interface RawDeliverooEvent {
  payload: {
    Subtotal: string
    'Order number': string
    'Order status': string
    'Date submitted': string
    'Restaurant name': string
  }
}

async function getDeliverooOrders(
  locationKey: string,
  startDate?: string,
  endDate?: string,
  dataStartDate?: string
): Promise<KitchenOrder[]> {
  if (!BRAIN_URL || !BRAIN_KEY) return []

  const res = await fetch(
    `${BRAIN_URL}/rest/v1/raw_events?source=eq.deliveroo&source_id=like.deliveroo-${locationKey}-*&select=payload&limit=5000&order=ts.desc`,
    {
      cache: 'no-store',
      headers: {
        apikey: BRAIN_KEY,
        Authorization: `Bearer ${BRAIN_KEY}`,
        Accept: 'application/json',
      },
    }
  )
  if (!res.ok) return []

  const events: RawDeliverooEvent[] = await res.json()

  return events
    .filter((e) => {
      const date = e.payload['Date submitted']
      if (!date) return false
      if (dataStartDate && date < dataStartDate) return false
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    })
    .map((e) => ({
      id: `deliveroo-${e.payload['Order number']}`,
      brandSlug: '',
      platform: 'deliveroo',
      orderId: e.payload['Order number'] || '',
      date: e.payload['Date submitted'],
      location: e.payload['Restaurant name'] || null,
      grossAmount: parseFloat(e.payload['Subtotal']) || 0,
      status: e.payload['Order status'] || null,
    }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    if (!brand) return NextResponse.json({ error: 'brand required' }, { status: 400 })

    const brandDef = getBrandDefinition(brand)
    const canonicalSlug = getCanonicalBrandSlug(brand) ?? brand
    const dataBrandSlug = brandDef?.dataBrandSlug
    const locationFilter = brandDef?.locationFilter
    const dataStartDate = brandDef?.dataStartDate

    const effectiveStart =
      dataStartDate && (!startDate || startDate < dataStartDate) ? dataStartDate : startDate

    // Query both the dataBrandSlug and the canonicalSlug — records may have been stored
    // under either slug depending on which was selected at import time.
    const slugsToQuery = dataBrandSlug
      ? Array.from(new Set([dataBrandSlug, canonicalSlug]))
      : [canonicalSlug]

    const [kitchenOrderSets, deliverooOrders] = await Promise.all([
      Promise.all(
        slugsToQuery.map((slug) => getKitchenOrders(slug, effectiveStart, endDate, locationFilter))
      ),
      brandDef?.deliverooLocationKey
        ? getDeliverooOrders(brandDef.deliverooLocationKey, effectiveStart, endDate, dataStartDate)
        : Promise.resolve([] as KitchenOrder[]),
    ])

    // Merge and deduplicate by platform+orderId
    const seen = new Set<string>()
    const kitchenOrders: KitchenOrder[] = []
    for (const set of kitchenOrderSets) {
      for (const o of set) {
        const key = `${o.platform}::${o.orderId}`
        if (!seen.has(key)) {
          seen.add(key)
          kitchenOrders.push(o)
        }
      }
    }

    // Normalise location to kitchenLocation if set
    const canonicalLocation = brandDef?.kitchenLocation
    const normalise = (o: KitchenOrder): KitchenOrder =>
      canonicalLocation ? { ...o, location: canonicalLocation } : o

    const orders = [...kitchenOrders.map(normalise), ...deliverooOrders.map(normalise)].sort(
      (a, b) => b.date.localeCompare(a.date) || b.orderId.localeCompare(a.orderId)
    )

    return NextResponse.json({ orders })
  } catch (error: any) {
    console.error('[Sales Orders API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
