import { NextResponse } from 'next/server'
import { getOrders } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    
    let orders = await getOrders()
    
    // Filter by brand if provided (skip filtering for admin)
    if (brand && brand.toLowerCase() !== 'admin') {
      orders = orders.filter((order) => {
        const orderBrand = (order.brand || '').trim()
        return orderBrand.toLowerCase() === brand.toLowerCase()
      })
    }
    
    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('API Error in /api/orders:', error)
    const errorMessage = error?.message || 'Unknown error occurred'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

