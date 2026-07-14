import { NextResponse } from 'next/server'
import { getKitchenSalesFromSupabase } from '@/lib/sales-supabase'
import { getCanonicalBrandSlug, getBrandDefinition } from '@/lib/brands'

export const dynamic = 'force-dynamic'

async function getSalesData(
  brandSlug: string | null,
  startDate?: string,
  endDate?: string,
  locationFilter?: string
) {
  return getKitchenSalesFromSupabase(brandSlug, startDate, endDate, locationFilter)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const brand = searchParams.get('brand') || null

    // Resolve brand config — supports location-specific slugs like wing-shack-chatham
    const brandDef = brand && brand !== 'admin' ? getBrandDefinition(brand) : null
    const brandSlug = !brand || brand === 'admin'
      ? null
      : (brandDef?.dataBrandSlug ?? getCanonicalBrandSlug(brand))
    const locationFilter = brandDef?.locationFilter

    // Clamp start date to brand's dataStartDate (e.g. new operator start) if set
    const effectiveStartDate =
      brandDef?.dataStartDate && (!startDate || startDate < brandDef.dataStartDate)
        ? brandDef.dataStartDate
        : startDate

    const sales = await getSalesData(brandSlug, effectiveStartDate, endDate, locationFilter)

    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0)
    const totalGrossSales = sales.reduce((sum, s) => sum + s.grossSales, 0)
    const totalOrders = sales.reduce((sum, s) => sum + s.count, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const uniqueLocations = new Set(sales.map((s) => s.location)).size
    const channelSummary = {
      gfv: summarizeSales(sales.filter((sale) => sale.salesChannel !== 'hungry_tum')),
      hungryTum: summarizeSales(sales.filter((sale) => sale.salesChannel === 'hungry_tum')),
    }

    return NextResponse.json({
      sales,
      summary: {
        totalRevenue,
        totalGrossSales,
        totalOrders,
        averageOrderValue,
        uniqueLocations,
        dateRange: {
          start: startDate || (sales.length > 0 ? sales[sales.length - 1].date : null),
          end: endDate || (sales.length > 0 ? sales[0].date : null),
        },
        channels: channelSummary,
      },
    })
  } catch (error: any) {
    console.error('[Sales API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}

function summarizeSales(sales: Awaited<ReturnType<typeof getSalesData>>) {
  const revenue = sales.reduce((sum, sale) => sum + sale.revenue, 0)
  const orders = sales.reduce((sum, sale) => sum + sale.count, 0)

  return {
    revenue,
    orders,
    averageOrderValue: orders > 0 ? revenue / orders : 0,
    locations: new Set(sales.map((sale) => sale.location)).size,
  }
}
