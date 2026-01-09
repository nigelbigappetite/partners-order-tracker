import { NextResponse } from 'next/server'
import { getOrderById, updateOrderStatus, deleteOrder } from '@/lib/sheets'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Decode the orderId (handles URL encoding like %23 for #)
    const decodedOrderId = decodeURIComponent(params.id)
    console.log('[API /orders/[id] GET] Fetching order:', {
      rawId: params.id,
      decodedOrderId,
    });
    
    const order = await getOrderById(decodedOrderId)
    if (!order) {
      console.warn('[API /orders/[id] GET] Order not found:', decodedOrderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    console.log('[API /orders/[id] GET] Order found:', {
      orderId: order.orderId,
      brand: order.brand,
      orderStage: order.orderStage,
    });
    
    return NextResponse.json(order)
  } catch (error: any) {
    console.error('[API /orders/[id] GET] Error fetching order:', {
      orderId: params.id,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
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
    
    console.log('[API /orders/[id] PATCH] Updating order status:', {
      rawId: params.id,
      decodedOrderId,
      updates: body,
    });
    
    await updateOrderStatus(decodedOrderId, body)
    
    console.log('[API /orders/[id] PATCH] Order status update completed successfully:', {
      orderId: decodedOrderId,
      updates: body,
    });
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /orders/[id] PATCH] Error updating order status:', {
      orderId: params.id,
      updates: (error as any).updates || 'unknown',
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Decode the orderId (handles URL encoding like %23 for #)
    const decodedOrderId = decodeURIComponent(params.id)
    
    console.log('[API /orders/[id] DELETE] Deleting order:', {
      rawId: params.id,
      decodedOrderId,
    });
    
    await deleteOrder(decodedOrderId)
    
    console.log('[API /orders/[id] DELETE] Order deletion completed successfully:', {
      orderId: decodedOrderId,
    });
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /orders/[id] DELETE] Error deleting order:', {
      orderId: params.id,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}
