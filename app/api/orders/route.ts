import { NextResponse } from 'next/server'
import { getSupplyOrders } from '@/lib/supply'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand') ?? undefined

    const orders = await getSupplyOrders(brand)

    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('API Error in /api/orders:', error)
    const errorMessage = error?.message || 'Unknown error occurred'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

