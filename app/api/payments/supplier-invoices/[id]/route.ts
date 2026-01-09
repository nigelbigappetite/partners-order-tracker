import { NextResponse } from 'next/server'
import { updateSupplierInvoice } from '@/lib/sheets'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { paid, paid_date, payment_reference } = body
    
    if (paid === undefined) {
      return NextResponse.json(
        { error: 'paid is required' },
        { status: 400 }
      )
    }
    
    console.log('[API /payments/supplier-invoices/[id] PATCH] Updating supplier invoice:', {
      invoiceId: params.id,
      paid,
      paid_date,
      payment_reference,
    })
    
    await updateSupplierInvoice(params.id, {
      paid,
      paid_date,
      payment_reference,
    })
    
    console.log('[API /payments/supplier-invoices/[id] PATCH] Supplier invoice update completed successfully')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /payments/supplier-invoices/[id] PATCH] Error updating supplier invoice:', {
      invoiceId: params.id,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update supplier invoice',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

