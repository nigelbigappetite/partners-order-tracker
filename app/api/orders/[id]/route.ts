import { NextResponse } from 'next/server'
import { getOrderById, updateOrderStatus } from '@/lib/sheets'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Decode the orderId (handles URL encoding like %23 for #)
    const decodedOrderId = decodeURIComponent(params.id)
    const order = await getOrderById(decodedOrderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    return NextResponse.json(order)
  } catch (error: any) {
    console.error('Error in GET /api/orders/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Decode the orderId (handles URL encoding like %23 for #)
    const decodedOrderId = decodeURIComponent(params.id)
    const body = await request.json()
    await updateOrderStatus(decodedOrderId, body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/orders/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

