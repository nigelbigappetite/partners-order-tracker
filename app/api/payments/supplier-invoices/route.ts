import { NextResponse } from 'next/server'
import { getSupplierInvoices, getOrderSupplierAllocations } from '@/lib/sheets'

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
    
    // Get allocations to find linked supplier invoices
    const allocations = await getOrderSupplierAllocations(salesInvoiceNo)
    const supplierInvoiceNos = allocations.map((a) => a.supplier_invoice_no)
    
    // Get all supplier invoices and filter by the ones linked to this sales invoice
    const allInvoices = await getSupplierInvoices()
    
    // Match supplier invoices by invoice number from allocations
    const linkedInvoices = allInvoices.filter((inv) => {
      const normalizeInvoiceNo = (inv: string): string => {
        return String(inv).replace(/#/g, '').trim().toLowerCase()
      }
      
      const invNo = normalizeInvoiceNo(inv.invoice_no || '')
      return supplierInvoiceNos.some((allocNo) => 
        normalizeInvoiceNo(allocNo) === invNo
      )
    })
    
    return NextResponse.json(linkedInvoices)
  } catch (error: any) {
    console.error('Error fetching supplier invoices:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch supplier invoices',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

