import { NextResponse } from 'next/server'

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
    'Deliveroo commission': string
    'VAT on Deliveroo commission': string
  }
}

export interface DeliverooDay {
  date: string
  location: string
  grossSales: number
  commission: number
  netPayout: number
  orders: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const locationKey = searchParams.get('locationKey')
    if (!locationKey) return NextResponse.json({ error: 'locationKey required' }, { status: 400 })

    if (!BRAIN_URL || !BRAIN_KEY)
      throw new Error('HT_BRAIN_SUPABASE_URL / HT_BRAIN_SERVICE_KEY not set')

    const res = await fetch(
      `${BRAIN_URL}/rest/v1/raw_events?source=eq.deliveroo&source_id=like.deliveroo-${locationKey}-*&select=payload&limit=1000&order=ts.desc`,
      {
        headers: {
          apikey: BRAIN_KEY,
          Authorization: `Bearer ${BRAIN_KEY}`,
          Accept: 'application/json',
        },
      }
    )
    if (!res.ok) throw new Error(`Brain DB error: ${res.status} ${await res.text()}`)

    const events: RawDeliverooEvent[] = await res.json()

    // Aggregate completed orders by date
    const byDate = new Map<string, { location: string; grossSales: number; commission: number; orders: number }>()

    for (const event of events) {
      const p = event.payload
      if (p['Order status'] !== 'Completed') continue

      const date = p['Date submitted']
      if (!date) continue

      const subtotal = parseFloat(p['Subtotal']) || 0
      const deliverooCommission = parseFloat(p['Deliveroo commission']) || 0
      const vatOnCommission = parseFloat(p['VAT on Deliveroo commission']) || 0
      const totalCommission = deliverooCommission + vatOnCommission
      const location = p['Restaurant name'] || ''

      const existing = byDate.get(date) ?? { location, grossSales: 0, commission: 0, orders: 0 }
      existing.grossSales += subtotal
      existing.commission += totalCommission
      existing.orders += 1
      byDate.set(date, existing)
    }

    const rows: DeliverooDay[] = Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        location: data.location,
        grossSales: Math.round(data.grossSales * 100) / 100,
        commission: Math.round(data.commission * 100) / 100,
        netPayout: Math.round((data.grossSales - data.commission) * 100) / 100,
        orders: data.orders,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ rows })
  } catch (error: any) {
    console.error('[Deliveroo Site Sales API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
