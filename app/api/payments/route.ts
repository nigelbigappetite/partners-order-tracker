import { NextResponse } from 'next/server'
import { getPaymentsTracker, getSupplierInvoices, getSheetData, rowsToObjects } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const settlementStatus = searchParams.get('settlementStatus')
    const excludeSettled = searchParams.get('excludeSettled') === 'true'
    const brand = searchParams.get('brand')
    const franchisee = searchParams.get('franchisee')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    console.log('[Payments API] Fetching payments...')
    
    // Get all data from Payments_Tracker_View (source of truth)
    let payments: any[] = []
    try {
      payments = await getPaymentsTracker()
      console.log(`[Payments API] Successfully fetched ${payments.length} payments from Payments_Tracker_View`)
    } catch (error: any) {
      console.error('[Payments API] Error fetching payments from getPaymentsTracker:', error?.message || error)
      console.error('[Payments API] Error stack:', error?.stack)
      // Re-throw to be caught by outer catch
      throw error
    }
    
    // Enrich payments with supplier invoice numbers (optional - if this fails, still return payments)
    let enrichedPayments = payments
    
    try {
      // Fetch all allocations and supplier invoices once (more efficient than per-payment calls)
      let allAllocations: any[] = []
      let allSupplierInvoices: any[] = []
      
      try {
        // Get all allocations from Order_Supplier_Allocations sheet
        const { headers: allocHeaders, data: allocData } = await getSheetData('Order_Supplier_Allocations')
        console.log(`[Payments API] Order_Supplier_Allocations headers:`, allocHeaders)
        if (allocHeaders && allocHeaders.length > 0) {
          const allocations = rowsToObjects<any>(allocData, allocHeaders, 'Order_Supplier_Allocations')
          console.log(`[Payments API] Parsed ${allocations.length} allocations, sample raw:`, allocations[0])
          allAllocations = allocations.map((alloc: any) => ({
            sales_invoice_no: (alloc.sales_invoice_no || alloc['Sales Invoice No'] || '').toString().trim(),
            supplier_invoice_no: (alloc.supplier_invoice_no || alloc['Supplier Invoice No'] || '').toString().trim(),
          }))
          console.log(`[Payments API] Fetched ${allAllocations.length} allocations from Order_Supplier_Allocations`)
          const withData = allAllocations.filter(a => a.sales_invoice_no && a.supplier_invoice_no)
          console.log(`[Payments API] ${withData.length} allocations have both sales_invoice_no and supplier_invoice_no`)
          if (withData.length > 0) {
            console.log(`[Payments API] Sample allocation:`, withData[0])
          }
        } else {
          console.warn('[Payments API] Order_Supplier_Allocations sheet has no headers')
        }
      } catch (error: any) {
        console.warn('[Payments API] Error fetching all allocations:', error?.message || error)
      }
      
      try {
        // Get all supplier invoices from Supplier_Invoices sheet
        allSupplierInvoices = await getSupplierInvoices()
        console.log(`[Payments API] Fetched ${allSupplierInvoices.length} supplier invoices`)
        if (allSupplierInvoices.length > 0) {
          const withSupplierInvNo = allSupplierInvoices.filter(inv => inv.supplier_invoice_no || inv.invoice_no)
          console.log(`[Payments API] ${withSupplierInvNo.length} supplier invoices have supplier_invoice_no or invoice_no`)
          const withSalesInv = allSupplierInvoices.filter(inv => inv.sales_invoice_no && (inv.supplier_invoice_no || inv.invoice_no))
          console.log(`[Payments API] ${withSalesInv.length} supplier invoices have both sales_invoice_no and supplier invoice number`)
          if (withSalesInv.length > 0) {
            console.log(`[Payments API] Sample supplier invoice:`, {
              supplier_invoice_no: withSalesInv[0].supplier_invoice_no,
              invoice_no: withSalesInv[0].invoice_no,
              sales_invoice_no: withSalesInv[0].sales_invoice_no,
              raw_keys: Object.keys(withSalesInv[0]),
            })
          } else if (withSupplierInvNo.length > 0) {
            console.log(`[Payments API] Sample supplier invoice (no sales_invoice_no):`, {
              supplier_invoice_no: withSupplierInvNo[0].supplier_invoice_no,
              invoice_no: withSupplierInvNo[0].invoice_no,
              sales_invoice_no: withSupplierInvNo[0].sales_invoice_no,
              raw_keys: Object.keys(withSupplierInvNo[0]),
            })
          }
        }
      } catch (error: any) {
        console.warn('[Payments API] Error fetching all supplier invoices:', error?.message || error)
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
      console.log(`[Payments API] Created allocations lookup map with ${allocationsBySalesInvoice.size} sales invoices`)
      if (allocationsBySalesInvoice.size > 0) {
        const firstKey = Array.from(allocationsBySalesInvoice.keys())[0]
        console.log(`[Payments API] Sample allocation key: "${firstKey}" -> ${Array.from(allocationsBySalesInvoice.get(firstKey)!).join(', ')}`)
      }
      
      const supplierInvoicesBySalesInvoice = new Map<string, Set<string>>()
      allSupplierInvoices.forEach((inv) => {
        // Use supplier_invoice_no if available, fallback to invoice_no
        const supplierInvNo = inv.supplier_invoice_no || inv.invoice_no
        if (inv.sales_invoice_no && supplierInvNo) {
          const salesInv = normalizeInvoiceNo(inv.sales_invoice_no)
          if (!supplierInvoicesBySalesInvoice.has(salesInv)) {
            supplierInvoicesBySalesInvoice.set(salesInv, new Set())
          }
          supplierInvoicesBySalesInvoice.get(salesInv)!.add(supplierInvNo.toString().trim())
        }
      })
      console.log(`[Payments API] Created supplier invoices lookup map with ${supplierInvoicesBySalesInvoice.size} sales invoices`)
      if (supplierInvoicesBySalesInvoice.size > 0) {
        const firstKey = Array.from(supplierInvoicesBySalesInvoice.keys())[0]
        console.log(`[Payments API] Sample supplier invoice key: "${firstKey}" -> ${Array.from(supplierInvoicesBySalesInvoice.get(firstKey)!).join(', ')}`)
      }
      
      // Enrich payments with supplier invoice numbers using in-memory lookups
      let matchedCount = 0
      enrichedPayments = payments.map((payment) => {
        const supplierInvoiceNumbers = new Set<string>()
        const normalizedSalesInv = normalizeInvoiceNo(payment.sales_invoice_no)
        
        // Primary source: Order_Supplier_Allocations
        const allocations = allocationsBySalesInvoice.get(normalizedSalesInv)
        if (allocations) {
          allocations.forEach((invNo) => supplierInvoiceNumbers.add(invNo))
          matchedCount++
        }
        
        // Fallback: Supplier_Invoices (match by sales_invoice_no)
        const supplierInvs = supplierInvoicesBySalesInvoice.get(normalizedSalesInv)
        if (supplierInvs) {
          supplierInvs.forEach((invNo) => supplierInvoiceNumbers.add(invNo))
          if (!allocations) matchedCount++
        }
        
        // Debug first few payments
        if (payments.indexOf(payment) < 5) {
          const hasAlloc = !!allocationsBySalesInvoice.get(normalizedSalesInv)
          const hasSupplierInv = !!supplierInvoicesBySalesInvoice.get(normalizedSalesInv)
          console.log(`[Payments API] Payment ${payment.sales_invoice_no} (normalized: "${normalizedSalesInv}"): found ${supplierInvoiceNumbers.size} supplier invoices (hasAlloc: ${hasAlloc}, hasSupplierInv: ${hasSupplierInv})`)
          if (supplierInvoiceNumbers.size === 0) {
            // Show what keys exist in the maps
            const allocKeys = Array.from(allocationsBySalesInvoice.keys()).slice(0, 5)
            const supplierKeys = Array.from(supplierInvoicesBySalesInvoice.keys()).slice(0, 5)
            console.log(`[Payments API] Available allocation keys (sample):`, allocKeys)
            console.log(`[Payments API] Available supplier invoice keys (sample):`, supplierKeys)
          }
        }
        
        return {
          ...payment,
          supplier_invoice_numbers: Array.from(supplierInvoiceNumbers).sort(),
        }
      })
      console.log(`[Payments API] Matched supplier invoices for ${matchedCount} out of ${payments.length} payments`)
    } catch (error: any) {
      // If enrichment fails, log but continue with unenriched payments
      console.error('[Payments API] Error enriching payments with supplier invoice numbers:', error?.message || error)
      console.warn('[Payments API] Returning payments without supplier invoice numbers')
      // enrichedPayments already equals payments, so we can continue
    }
    
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
    
    console.log(`[Payments API] Returning ${filtered.length} filtered payments`)
    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error('[Payments API] Error in GET handler:', error?.message || error)
    console.error('[Payments API] Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch payments',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

