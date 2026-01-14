import { NextResponse } from 'next/server'
import { getPaymentsTracker, getOrders, getOrderSupplierAllocations, getSupplierInvoices } from '@/lib/sheets'

function normalizeInvoiceNo(inv: string): string {
  return String(inv).replace(/#/g, '').trim().toLowerCase()
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const salesInvoiceNoRaw =
      searchParams.get('sales_invoice_no') ||
      searchParams.get('salesInvoiceNo') ||
      ''

    if (!salesInvoiceNoRaw) {
      return NextResponse.json(
        { error: 'sales_invoice_no (or salesInvoiceNo) query param is required' },
        { status: 400 }
      )
    }

    const salesInvoiceNo = salesInvoiceNoRaw
    const search = normalizeInvoiceNo(salesInvoiceNo)

    // Orders_Header view via getOrders()
    const orders = await getOrders()
    const orderMatch = orders.find((o) => normalizeInvoiceNo(o.invoiceNo || '') === search)

    // Payments_Tracker_View via getPaymentsTracker()
    const payments = await getPaymentsTracker()
    const paymentMatch = payments.find(
      (p) => normalizeInvoiceNo(p.sales_invoice_no || '') === search
    )

    // Allocation + supplier invoice linkage (used for WAITING_SUPPLIERS logic)
    const allocations = await getOrderSupplierAllocations(salesInvoiceNo)
    const supplierInvoices = await getSupplierInvoices()
    const allocInvoiceNos = allocations.map((a) => a.supplier_invoice_no)
    const linkedSupplierInvoices = supplierInvoices.filter((inv) =>
      allocInvoiceNos.some((aNo) => normalizeInvoiceNo(aNo) === normalizeInvoiceNo(inv.invoice_no || ''))
    )

    return NextResponse.json(
      {
        query: {
          sales_invoice_no: salesInvoiceNo,
          normalized: search,
        },
        orders_header: {
          found: !!orderMatch,
          order: orderMatch || null,
        },
        payments_tracker_view: {
          found: !!paymentMatch,
          row: paymentMatch || null,
        },
        supplier_linkage: {
          allocation_count: allocations.length,
          allocations_sample: allocations.slice(0, 20),
          supplier_invoices_total: supplierInvoices.length,
          linked_supplier_invoices_count: linkedSupplierInvoices.length,
          linked_supplier_invoices_sample: linkedSupplierInvoices.slice(0, 20),
          linked_unpaid_count: linkedSupplierInvoices.filter((i) => !i.paid).length,
        },
        likely_causes: [
          'If orders_header.found is false: invoice number mismatch in Orders_Header (extra spaces, different prefix, etc.)',
          'If payments_tracker_view.row.partner_paid is false but orders_header.order.partnerPaid is true: Payments_Tracker_View formula is not referencing the right column',
          'If supplier_linkage.allocation_count is 0: the order is not linked to supplier invoices in Order_Supplier_Allocations',
          'If allocation_count > 0 but linked_supplier_invoices_count is 0: invoice numbers don’t match between Order_Supplier_Allocations and Supplier_Invoices',
        ],
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[GET /api/debug/order-check] Error:', {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to check order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}


