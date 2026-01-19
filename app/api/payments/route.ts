import { NextResponse } from 'next/server'
import { getPaymentsTracker, getOrderSupplierAllocations, getSupplierInvoices } from '@/lib/sheets'

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
    
    // Enrich payments with supplier invoice numbers
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const supplierInvoiceNumbers = new Set<string>()
        
        try {
          // Primary source: Order_Supplier_Allocations
          const allocations = await getOrderSupplierAllocations(payment.sales_invoice_no)
          allocations.forEach((alloc) => {
            if (alloc.supplier_invoice_no && alloc.supplier_invoice_no.trim()) {
              supplierInvoiceNumbers.add(alloc.supplier_invoice_no.trim())
            }
          })
        } catch (error) {
          console.warn(`[Payments API] Error fetching allocations for ${payment.sales_invoice_no}:`, error)
        }
        
        try {
          // Fallback: Supplier_Invoices (match by sales_invoice_no)
          const supplierInvoices = await getSupplierInvoices(payment.sales_invoice_no)
          supplierInvoices.forEach((inv) => {
            if (inv.invoice_no && inv.invoice_no.trim()) {
              supplierInvoiceNumbers.add(inv.invoice_no.trim())
            }
          })
        } catch (error) {
          console.warn(`[Payments API] Error fetching supplier invoices for ${payment.sales_invoice_no}:`, error)
        }
        
        return {
          ...payment,
          supplier_invoice_numbers: Array.from(supplierInvoiceNumbers).sort(),
        }
      })
    )
    
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

