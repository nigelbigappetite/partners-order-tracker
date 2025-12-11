import { NextResponse } from 'next/server'
import { getOrderLines } from '@/lib/sheets'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Decode the orderId (handles URL encoding like %23 for #)
    const decodedOrderId = decodeURIComponent(params.id)
    console.log(`[API] Fetching order lines for orderId: "${decodedOrderId}"`)
    
    // Get the order first to retrieve invoiceNo
    const { getOrderById } = await import('@/lib/sheets')
    const order = await getOrderById(decodedOrderId)
    
    if (!order) {
      console.log(`[API] Order not found for orderId: "${decodedOrderId}"`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    const invoiceNo = order?.invoiceNo || (order as any)?.['Invoice No'] || ''
    const brand = order?.brand || ''
    console.log(`[API] Order found. invoiceNo: "${invoiceNo}", brand: "${brand}", orderId from order: "${order.orderId}"`)
    console.log(`[API] Full order object:`, JSON.stringify(order, null, 2))
    
    const lines = await getOrderLines(decodedOrderId, invoiceNo, brand)
    console.log(`[API] Returning ${lines.length} order lines`)
    if (lines.length === 0) {
      console.log(`[API] ⚠️ No lines found! Check server logs for getOrderLines debug output`)
    }
    
    return NextResponse.json(lines)
  } catch (error: any) {
    console.error('[API] Error in GET /api/orders/[id]/lines:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

