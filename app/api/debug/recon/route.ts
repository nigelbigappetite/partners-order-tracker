import { NextResponse } from 'next/server'
import { getOrderSupplierAllocations } from '@/lib/sheets'
import { getSupplierInvoices } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const salesInvoiceNo = searchParams.get('sales_invoice_no')
    
    if (!salesInvoiceNo) {
      return NextResponse.json(
        { error: 'sales_invoice_no parameter is required' },
        { status: 400 }
      )
    }
    
    // Get allocations for this sales invoice
    const allocations = await getOrderSupplierAllocations(salesInvoiceNo)
    
    // Get supplier invoices for this sales invoice
    const supplierInvoices = await getSupplierInvoices(salesInvoiceNo)
    
    // Group allocations by supplier invoice number
    const allocationsBySupplierInvoice: Record<string, number> = {}
    allocations.forEach((alloc) => {
      const key = alloc.supplier_invoice_no || ''
      allocationsBySupplierInvoice[key] = (allocationsBySupplierInvoice[key] || 0) + alloc.allocated_amount
    })
    
    // Calculate total allocated amount
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0)
    
    return NextResponse.json({
      sales_invoice_no: salesInvoiceNo,
      allocations: allocations.map((alloc) => ({
        supplier_invoice_no: alloc.supplier_invoice_no,
        allocated_amount: alloc.allocated_amount,
      })),
      allocations_by_supplier_invoice: allocationsBySupplierInvoice,
      total_allocated: totalAllocated,
      supplier_invoices: supplierInvoices.map((inv) => ({
        invoice_no: inv.invoice_no,
        supplier: inv.supplier,
        amount: inv.amount,
        sales_invoice_no: inv.sales_invoice_no,
      })),
      diagnostic: {
        allocation_count: allocations.length,
        supplier_invoice_count: supplierInvoices.length,
        expected_total: totalAllocated,
        note: 'Check if Supplier_Recon formulas are matching by the correct identifier (invoice number vs order ID)',
      },
    })
  } catch (error: any) {
    console.error('Error in recon debug:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reconciliation data' },
      { status: 500 }
    )
  }
}

