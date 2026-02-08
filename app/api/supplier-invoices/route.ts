import { NextResponse } from 'next/server'
import { getSupplierInvoices } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const invoices = await getSupplierInvoices()
    return NextResponse.json(invoices)
  } catch (error: any) {
    console.error('[GET /api/supplier-invoices] Error:', error?.message)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch supplier invoices' },
      { status: 500 }
    )
  }
}
