import { NextResponse } from 'next/server'
import { getPaymentsTracker, getSupplierInvoices, getSheetData, rowsToObjects } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const settlementStatus = searchParams.get('settlementStatus')
    const excludeSettled = searchParams.get('excludeSettled') === 'true'
    const brand = searchParams.get('brand')
    const franchisee = searchParams.get('franchisee')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Get all data from Payments_Tracker_View (source of truth)
    const payments = await getPaymentsTracker()
    
    // Fetch all allocations and supplier invoices once (more efficient than per-payment calls)
    let allAllocations: any[] = []
    let allSupplierInvoices: any[] = []
    
    try {
      // Get all allocations from Order_Supplier_Allocations sheet
      const { headers: allocHeaders, data: allocData } = await getSheetData('Order_Supplier_Allocations')
      if (allocHeaders && allocHeaders.length > 0) {
        const allocations = rowsToObjects<any>(allocData, allocHeaders, 'Order_Supplier_Allocations')
        allAllocations = allocations.map((alloc: any) => ({
          sales_invoice_no: (alloc.sales_invoice_no || alloc['Sales Invoice No'] || '').toString().trim(),
          supplier_invoice_no: (alloc.supplier_invoice_no || alloc['Supplier Invoice No'] || '').toString().trim(),
        }))
      }
    } catch (error) {
      console.warn('[Payments API] Error fetching all allocations:', error)
    }
    
    try {
      // Get all supplier invoices from Supplier_Invoices sheet
      allSupplierInvoices = await getSupplierInvoices()
    } catch (error) {
      console.warn('[Payments API] Error fetching all supplier invoices:', error)
    }
    
    // Helper to normalize invoice numbers for matching
    const normalizeInvoiceNo = (inv: string): string => {
      return String(inv).replace(/#/g, '').trim().toLowerCase()
    }
    
    // Create lookup maps for efficient matching
    const allocationsBySalesInvoice = new Map<string, Set<string>>()
    allAllocations.forEach((alloc) => {
      if (alloc.sales_invoice_no && alloc.supplier_invoice_no) {
        const salesInv = normalizeInvoiceNo(alloc.sales_invoice_no)
        if (!allocationsBySalesInvoice.has(salesInv)) {
          allocationsBySalesInvoice.set(salesInv, new Set())
        }
        allocationsBySalesInvoice.get(salesInv)!.add(alloc.supplier_invoice_no.trim())
      }
    })
    
    const supplierInvoicesBySalesInvoice = new Map<string, Set<string>>()
    allSupplierInvoices.forEach((inv) => {
      if (inv.sales_invoice_no && inv.invoice_no) {
        const salesInv = normalizeInvoiceNo(inv.sales_invoice_no)
        if (!supplierInvoicesBySalesInvoice.has(salesInv)) {
          supplierInvoicesBySalesInvoice.set(salesInv, new Set())
        }
        supplierInvoicesBySalesInvoice.get(salesInv)!.add(inv.invoice_no.trim())
      }
    })
    
    // Enrich payments with supplier invoice numbers using in-memory lookups
    const enrichedPayments = payments.map((payment) => {
      const supplierInvoiceNumbers = new Set<string>()
      const normalizedSalesInv = normalizeInvoiceNo(payment.sales_invoice_no)
      
      // Primary source: Order_Supplier_Allocations
      const allocations = allocationsBySalesInvoice.get(normalizedSalesInv)
      if (allocations) {
        allocations.forEach((invNo) => supplierInvoiceNumbers.add(invNo))
      }
      
      // Fallback: Supplier_Invoices (match by sales_invoice_no)
      const supplierInvs = supplierInvoicesBySalesInvoice.get(normalizedSalesInv)
      if (supplierInvs) {
        supplierInvs.forEach((invNo) => supplierInvoiceNumbers.add(invNo))
      }
      
      return {
        ...payment,
        supplier_invoice_numbers: Array.from(supplierInvoiceNumbers).sort(),
      }
    })
    
    // Apply filters
    let filtered = enrichedPayments
    
    // Exclude SETTLED orders if requested (for live tracker)
    // Also exclude paid invoices - only show unpaid sales invoices
    if (excludeSettled) {
      filtered = filtered.filter((p) => 
        p.settlement_status !== 'SETTLED' && !p.partner_paid
      )
    }
    
    if (settlementStatus && settlementStatus !== 'all') {
      filtered = filtered.filter((p) => p.settlement_status === settlementStatus)
    }
    
    if (brand && brand !== 'all') {
      filtered = filtered.filter((p) => 
        p.brand.toLowerCase().includes(brand.toLowerCase())
      )
    }
    
    if (franchisee && franchisee !== 'all') {
      filtered = filtered.filter((p) => 
        p.franchisee_name.toLowerCase().includes(franchisee.toLowerCase())
      )
    }
    
    if (startDate) {
      filtered = filtered.filter((p) => {
        const orderDate = new Date(p.order_date)
        const start = new Date(startDate)
        return orderDate >= start
      })
    }
    
    if (endDate) {
      filtered = filtered.filter((p) => {
        const orderDate = new Date(p.order_date)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // Include full end date
        return orderDate <= end
      })
    }
    
    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch payments',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

