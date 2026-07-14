import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BRAIN_URL = process.env.HT_BRAIN_SUPABASE_URL
const BRAIN_KEY = process.env.HT_BRAIN_SERVICE_KEY

export interface UberDay {
  date: string
  grossSales: number
  commission: number
  netPayout: number
  orders: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

    if (!BRAIN_URL || !BRAIN_KEY)
      throw new Error('HT_BRAIN_SUPABASE_URL / HT_BRAIN_SERVICE_KEY not set')

    // Fetch all events for this location (paginated)
    const allEvents: { payload: Record<string, string> }[] = []
    const pageSize = 1000
    for (let offset = 0; ; offset += pageSize) {
      const res = await fetch(
        `${BRAIN_URL}/rest/v1/raw_events?source=eq.uber_eats&location_id=eq.${locationId}&select=payload&order=ts.desc`,
        {
          cache: 'no-store',
          headers: {
            apikey: BRAIN_KEY,
            Authorization: `Bearer ${BRAIN_KEY}`,
            Accept: 'application/json',
            Range: `${offset}-${offset + pageSize - 1}`,
            'Range-Unit': 'items',
          },
        }
      )
      if (!res.ok) throw new Error(`Brain DB error: ${res.status} ${await res.text()}`)
      const batch: { payload: Record<string, string> }[] = await res.json()
      allEvents.push(...batch)
      if (batch.length < pageSize) break
    }

    // Aggregate completed orders by date (only new-format events with Total payout)
    const byDate = new Map<
      string,
      { grossSales: number; commission: number; netPayout: number; orders: number }
    >()

    for (const event of allEvents) {
      const p = event.payload
      if (!p) continue

      // Only process new-format events that have Total payout
      const totalPayoutRaw = p['Total payout']
      if (totalPayoutRaw === undefined || totalPayoutRaw === null) continue

      if (p['Order status'] !== 'Completed') continue

      const dateStr = p['Order date'] || ''
      if (!dateStr) continue

      // Convert DD/MM/YYYY to YYYY-MM-DD
      const parts = dateStr.split('/')
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr

      const grossSales = parseFloat(p['Sales (incl. VAT)']) || 0
      const commission = Math.abs(parseFloat(p['Marketplace Fee after promotion (incl. VAT)']) || 0)
      const netPayout = parseFloat(totalPayoutRaw) || 0

      const existing = byDate.get(isoDate) ?? { grossSales: 0, commission: 0, netPayout: 0, orders: 0 }
      existing.grossSales += grossSales
      existing.commission += commission
      existing.netPayout += netPayout
      existing.orders += 1
      byDate.set(isoDate, existing)
    }

    const rows: UberDay[] = Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        grossSales: Math.round(data.grossSales * 100) / 100,
        commission: Math.round(data.commission * 100) / 100,
        netPayout: Math.round(data.netPayout * 100) / 100,
        orders: data.orders,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ rows })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Uber Site Sales API]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
