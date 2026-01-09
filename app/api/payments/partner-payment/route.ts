import { NextResponse } from 'next/server'
import { updatePartnerPayment } from '@/lib/sheets'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { salesInvoiceNo, partnerPaid, partnerPaidDate, partnerPaymentMethod, partnerPaymentRef } = body
    
    if (!salesInvoiceNo) {
      return NextResponse.json(
        { error: 'salesInvoiceNo is required' },
        { status: 400 }
      )
    }
    
    if (partnerPaid === undefined) {
      return NextResponse.json(
        { error: 'partnerPaid is required' },
        { status: 400 }
      )
    }
    
    console.log('[API /payments/partner-payment PATCH] Updating partner payment:', {
      salesInvoiceNo,
      partnerPaid,
      partnerPaidDate,
      partnerPaymentMethod,
      partnerPaymentRef,
    })
    
    await updatePartnerPayment(salesInvoiceNo, {
      partnerPaid,
      partnerPaidDate,
      partnerPaymentMethod,
      partnerPaymentRef,
    })
    
    console.log('[API /payments/partner-payment PATCH] Partner payment update completed successfully')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /payments/partner-payment PATCH] Error updating partner payment:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update partner payment',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

