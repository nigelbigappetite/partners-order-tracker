import { NextResponse } from 'next/server'
import { getOrderLines } from '@/lib/sheets'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Decode the id (handles URL encoding like %23 for #)
    // Try as invoice number first (primary identifier), then fall back to order ID
    const decodedId = decodeURIComponent(params.id)
    console.log(`[API] Fetching order lines for id: "${decodedId}"`)
    
    // Get the order first - try invoice number first, then order ID
    const { getOrderByInvoiceNo, getOrderById } = await import('@/lib/sheets')
    let order = await getOrderByInvoiceNo(decodedId)
    
    if (!order) {
      console.log(`[API] Not found by invoice number, trying order ID...`)
      order = await getOrderById(decodedId)
    }
    
    if (!order) {
      console.log(`[API] Order not found for id: "${decodedId}"`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    const invoiceNo = order?.invoiceNo || (order as any)?.['Invoice No'] || ''
    const brand = order?.brand || ''
    console.log(`[API] Order found. invoiceNo: "${invoiceNo}", brand: "${brand}", orderId from order: "${order.orderId}"`)
    
    // Use invoice number as primary identifier for getOrderLines
    const lines = await getOrderLines(order.orderId, invoiceNo, brand)
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

