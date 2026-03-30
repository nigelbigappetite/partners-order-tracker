import { NextResponse } from 'next/server'
import { getKitchenSalesFromSupabase } from '@/lib/sales-supabase'
import { getCanonicalBrandSlug } from '@/lib/brands'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const brand = searchParams.get('brand') || null
    const brandSlug = !brand || brand === 'admin' ? null : getCanonicalBrandSlug(brand)

    const sales = await getKitchenSalesFromSupabase(brandSlug, startDate, endDate)

    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0)
    const totalGrossSales = sales.reduce((sum, s) => sum + s.grossSales, 0)
    const totalOrders = sales.reduce((sum, s) => sum + s.count, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const uniqueLocations = new Set(sales.map((s) => s.location)).size

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
