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
    
    console.log('[GET /api/payments/supplier-invoices] Fetching supplier invoices for:', salesInvoiceNo)
    
    // Get allocations to find linked supplier invoices
    let allocations: any[] = []
    try {
      allocations = await getOrderSupplierAllocations(salesInvoiceNo)
      console.log('[GET /api/payments/supplier-invoices] Found allocations:', allocations.length)
    } catch (error: any) {
      console.error('[GET /api/payments/supplier-invoices] Error fetching allocations:', error)
      // If allocations fail, we can still try to get invoices by sales invoice number directly
      // Return empty array to indicate no allocations found
      allocations = []
      console.warn('[GET /api/payments/supplier-invoices] Continuing without allocations, will try direct lookup')
    }
    
    const supplierInvoiceNos = allocations.map((a) => a.supplier_invoice_no)
    console.log('[GET /api/payments/supplier-invoices] Supplier invoice numbers from allocations:', supplierInvoiceNos)
    
    // Get all supplier invoices
    let allInvoices: any[] = []
    try {
      allInvoices = await getSupplierInvoices()
      console.log('[GET /api/payments/supplier-invoices] Total supplier invoices:', allInvoices.length)
    } catch (error: any) {
      console.error('[GET /api/payments/supplier-invoices] Error fetching supplier invoices:', error)
      // If we can't get invoices, return empty array
      return NextResponse.json([])
    }
    
    // If no allocations found, try to find invoices by sales invoice number directly
    if (allocations.length === 0) {
      console.log('[GET /api/payments/supplier-invoices] No allocations found, trying direct lookup by sales invoice number')
      const normalizeInvoiceNo = (inv: string): string => {
        return String(inv).replace(/#/g, '').trim().toLowerCase()
      }
      const searchInvoiceNo = normalizeInvoiceNo(salesInvoiceNo)
      const directMatchInvoices = allInvoices.filter((inv) => {
        const invSalesInvoiceNo = normalizeInvoiceNo(inv.sales_invoice_no || inv['Sales Invoice No'] || '')
        return invSalesInvoiceNo === searchInvoiceNo
      })
      console.log('[GET /api/payments/supplier-invoices] Found', directMatchInvoices.length, 'invoices by direct sales invoice match')
      return NextResponse.json(directMatchInvoices)
    }
    
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
    
    console.log('[GET /api/payments/supplier-invoices] Matched linked invoices:', linkedInvoices.length)
    console.log('[GET /api/payments/supplier-invoices] Linked invoice numbers:', linkedInvoices.map(inv => inv.invoice_no))
    
    return NextResponse.json(linkedInvoices)
  } catch (error: any) {
    console.error('[GET /api/payments/supplier-invoices] Error fetching supplier invoices:', {
      error: error.message,
      stack: error.stack,
      salesInvoiceNo: new URL(request.url).searchParams.get('salesInvoiceNo'),
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch supplier invoices',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

