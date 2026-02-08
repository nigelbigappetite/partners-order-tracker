import { NextResponse } from 'next/server'
import { getSupplierInvoiceReconSummary } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const salesInvoiceNo = searchParams.get('salesInvoiceNo')
    if (!salesInvoiceNo) {
      return NextResponse.json(
        { error: 'salesInvoiceNo is required' },
        { status: 400 }
      )
    }
    const summary = await getSupplierInvoiceReconSummary(salesInvoiceNo)
    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('[recon-summary] Error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch recon summary' },
      { status: 500 }
    )
  }
}
