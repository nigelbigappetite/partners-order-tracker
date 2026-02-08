import { NextResponse } from 'next/server'
import { updateSupplierInvoice } from '@/lib/sheets'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { paid, paid_date, payment_reference, sales_invoice_no, amount } = body
    
    const updates: { paid?: boolean; paid_date?: string; payment_reference?: string; sales_invoice_no?: string; amount?: number } = {}
    if (paid !== undefined) updates.paid = Boolean(paid)
    if (paid_date !== undefined) updates.paid_date = String(paid_date).trim()
    if (payment_reference !== undefined) updates.payment_reference = String(payment_reference).trim()
    if (sales_invoice_no !== undefined) updates.sales_invoice_no = String(sales_invoice_no).trim()
    if (amount !== undefined) updates.amount = Number(amount)
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one of: paid, paid_date, payment_reference, sales_invoice_no, amount' },
        { status: 400 }
      )
    }
    
    console.log('[API /payments/supplier-invoices/[id] PATCH] Updating supplier invoice:', {
      invoiceId: params.id,
      updates,
    })
    
    await updateSupplierInvoice(params.id, updates)
    
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

