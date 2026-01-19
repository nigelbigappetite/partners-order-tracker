import { NextResponse } from 'next/server'
import { getOrderSupplierAllocations } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const salesInvoiceNo = searchParams.get('salesInvoiceNo')
    
    if (!salesInvoiceNo) {
      return NextResponse.json(
        { error: 'salesInvoiceNo parameter is required' },
        { status: 400 }
      )
    }
    
    // Get allocations for this sales invoice
    const allocations = await getOrderSupplierAllocations(salesInvoiceNo)
    
    // Calculate total allocated amount
    const totalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.allocated_amount || 0), 0)
    
    return NextResponse.json({
      sales_invoice_no: salesInvoiceNo,
      allocations_count: allocations.length,
      allocations: allocations.map(alloc => ({
        supplier_invoice_no: alloc.supplier_invoice_no,
        allocated_amount: alloc.allocated_amount,
      })),
      calculated_total: totalAllocated,
      note: 'This is what the Supplier Allocated Total should be in the Payments_Tracker_View sheet',
    })
  } catch (error: any) {
    console.error('Error verifying allocated total:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to verify allocated total',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

