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
      if (allocations.length > 0) {
        console.log('[GET /api/payments/supplier-invoices] Allocation details:', allocations.map(a => ({
          sales_invoice_no: a.sales_invoice_no,
          supplier_invoice_no: a.supplier_invoice_no,
          allocated_amount: a.allocated_amount
        })))
      }
    } catch (error: any) {
      console.error('[GET /api/payments/supplier-invoices] Error fetching allocations:', error)
      // If allocations fail, we can still try to get invoices by sales invoice number directly
      // Return empty array to indicate no allocations found
      allocations = []
      console.warn('[GET /api/payments/supplier-invoices] Continuing without allocations, will try direct lookup')
    }
    
    const supplierInvoiceNos = allocations.map((a) => a.supplier_invoice_no).filter(Boolean)
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
    if (allocations.length === 0 || supplierInvoiceNos.length === 0) {
      console.log('[GET /api/payments/supplier-invoices] No allocations found, trying direct lookup by sales invoice number')
      const normalizeInvoiceNo = (inv: string): string => {
        return String(inv).replace(/#/g, '').replace(/\s/g, '').trim().toLowerCase()
      }
      const searchInvoiceNo = normalizeInvoiceNo(salesInvoiceNo)
      console.log('[GET /api/payments/supplier-invoices] Searching for sales invoice:', searchInvoiceNo)
      
      // Check what sales invoice numbers exist in supplier invoices
      const sampleSalesInvoiceNos = allInvoices.slice(0, 10).map(inv => ({
        invoice_no: inv.invoice_no,
        sales_invoice_no: inv.sales_invoice_no || inv['Sales Invoice No'],
        normalized: normalizeInvoiceNo(inv.sales_invoice_no || inv['Sales Invoice No'] || '')
      }))
      console.log('[GET /api/payments/supplier-invoices] Sample supplier invoice sales invoice numbers:', sampleSalesInvoiceNos)
      
      const directMatchInvoices = allInvoices.filter((inv) => {
        const invSalesInvoiceNo = normalizeInvoiceNo(inv.sales_invoice_no || inv['Sales Invoice No'] || '')
        const matches = invSalesInvoiceNo === searchInvoiceNo
        if (matches) {
          console.log('[GET /api/payments/supplier-invoices] Direct match found:', {
            invoice_no: inv.invoice_no,
            sales_invoice_no: inv.sales_invoice_no,
            has_file_link: !!inv.invoice_file_link
          })
        }
        return matches
      })
      console.log('[GET /api/payments/supplier-invoices] Found', directMatchInvoices.length, 'invoices by direct sales invoice match')
      return NextResponse.json(directMatchInvoices)
    }
    
    // Match supplier invoices by invoice number from allocations
    const normalizeInvoiceNo = (inv: string): string => {
      return String(inv).replace(/#/g, '').replace(/\s/g, '').trim().toLowerCase()
    }
    
    console.log('[GET /api/payments/supplier-invoices] Attempting to match invoices...')
    console.log('[GET /api/payments/supplier-invoices] Supplier invoice numbers from allocations:', supplierInvoiceNos)
    console.log('[GET /api/payments/supplier-invoices] Total supplier invoices available:', allInvoices.length)
    console.log('[GET /api/payments/supplier-invoices] Sample supplier invoice numbers:', allInvoices.slice(0, 5).map(inv => ({
      invoice_no: inv.invoice_no,
      has_file_link: !!inv.invoice_file_link
    })))
    
    const linkedInvoices = allInvoices.filter((inv) => {
      const invNo = normalizeInvoiceNo(inv.invoice_no || '')
      const matches = supplierInvoiceNos.some((allocNo) => {
        const normalizedAllocNo = normalizeInvoiceNo(allocNo)
        return normalizedAllocNo === invNo
      })
      
      if (!matches && supplierInvoiceNos.length > 0) {
        // Log why it didn't match for debugging
        console.log(`[GET /api/payments/supplier-invoices] Invoice "${inv.invoice_no}" (normalized: "${invNo}") didn't match any allocation numbers`)
      }
      
      return matches
    })
    
    console.log('[GET /api/payments/supplier-invoices] Matched linked invoices:', linkedInvoices.length)
    console.log('[GET /api/payments/supplier-invoices] Linked invoice numbers:', linkedInvoices.map(inv => inv.invoice_no))
    console.log('[GET /api/payments/supplier-invoices] Linked invoices with file links:', linkedInvoices.filter(inv => inv.invoice_file_link && inv.invoice_file_link.trim()).length)
    
    if (linkedInvoices.length > 0) {
      linkedInvoices.forEach((inv, idx) => {
        console.log(`[GET /api/payments/supplier-invoices] Linked invoice ${idx + 1}:`, {
          invoice_no: inv.invoice_no,
          supplier: inv.supplier,
          has_file_link: !!inv.invoice_file_link,
          file_link_length: inv.invoice_file_link ? inv.invoice_file_link.length : 0
        })
      })
    }
    
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

