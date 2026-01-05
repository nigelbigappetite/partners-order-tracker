import { NextResponse } from 'next/server'
import { getOrders } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    
    let orders = await getOrders()
    
    // Filter by brand if provided (skip filtering for admin)
    if (brand && brand.toLowerCase() !== 'admin') {
      const normalizedBrand = brand.trim().toLowerCase()
      orders = orders.filter((order) => {
        const orderBrand = (order.brand || '').trim().toLowerCase()
        const matches = orderBrand === normalizedBrand
        
        // Log mismatches for debugging
        if (!matches && process.env.NODE_ENV === 'development') {
          console.log(`[API /orders] Filtering out order ${order.orderId || order.invoiceNo}: expected brand "${brand}", got "${order.brand}"`)
        }
        
        return matches
      })
    }
    
    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('API Error in /api/orders:', error)
    const errorMessage = error?.message || 'Unknown error occurred'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

