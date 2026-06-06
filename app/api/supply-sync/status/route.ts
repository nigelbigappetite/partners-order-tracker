import { NextResponse } from 'next/server'
import { getCanonicalBrandSlug } from '@/lib/brands'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.HT_PARTNERS_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.HT_PARTNERS_SERVICE_ROLE_KEY!

interface SupplyBrandTotalRow {
  brand_slug: string
  revenue: number
  cogs: number
  source_order_id: string
  completed_at: string | null
  settled_at: string | null
  synced_at: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedBrand = searchParams.get('brand')
    const brandSlug = requestedBrand ? getCanonicalBrandSlug(requestedBrand) : null
    const url = new URL(`${SUPABASE_URL}/rest/v1/supply_order_brand_totals`)
    url.searchParams.set(
      'select',
      'brand_slug,revenue,cogs,source_order_id,completed_at,settled_at,synced_at'
    )
    url.searchParams.set('order', 'synced_at.desc')
    if (brandSlug && brandSlug !== 'admin') {
      url.searchParams.set('brand_slug', `eq.${brandSlug}`)
    }

    const response = await fetch(url.toString(), {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept-Profile': 'sales',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const message = await response.text()
      const notDeployed = message.includes('PGRST205') || message.includes('Could not find the table')
      return NextResponse.json(
        {
          deployed: false,
          error: notDeployed ? 'Supply brand totals snapshot is not deployed' : message,
        },
        { status: notDeployed ? 200 : 500 }
      )
    }

    const rows = (await response.json()) as SupplyBrandTotalRow[]
    const revenue = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0)
    const cogs = rows.reduce((sum, row) => sum + Number(row.cogs || 0), 0)

    return NextResponse.json({
      deployed: true,
      brand: brandSlug,
      rows: rows.length,
      orders: new Set(rows.map((row) => row.source_order_id)).size,
      revenue,
      cogs,
      grossProfit: revenue - cogs,
      completedRows: rows.filter((row) => row.completed_at).length,
      settledRows: rows.filter((row) => row.settled_at).length,
      latestSyncedAt: rows[0]?.synced_at ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { deployed: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
