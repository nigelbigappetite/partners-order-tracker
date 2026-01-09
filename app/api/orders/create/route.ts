import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/sheets'

export async function POST(request: Request) {
  try {
    console.log('[API /orders/create] Received order creation request');
    const body = await request.json()
    console.log('[API /orders/create] Order data:', {
      orderId: body.orderId,
      invoiceNo: body.invoiceNo,
      brand: body.brand,
      franchisee: body.franchisee,
      franchiseeCode: body.franchiseeCode,
      orderLinesCount: body.orderLines?.length || 0,
    });
    
    await createOrder(body)
    
    console.log('[API /orders/create] Order creation completed successfully:', {
      orderId: body.orderId,
    });
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /orders/create] Error creating order:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      orderId: (error as any).orderId || 'unknown',
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

