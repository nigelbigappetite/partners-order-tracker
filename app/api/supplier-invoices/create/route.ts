import { NextResponse } from 'next/server'
import { createSupplierInvoices } from '@/lib/sheets'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sales_invoice_no, invoices } = body
    
    // Validate required fields
    if (!sales_invoice_no) {
      return NextResponse.json(
        { error: 'sales_invoice_no is required' },
        { status: 400 }
      )
    }
    
    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { error: 'invoices array is required and must not be empty' },
        { status: 400 }
      )
    }
    
    // Validate each invoice
    for (const invoice of invoices) {
      if (!invoice.supplier_invoice_no) {
        return NextResponse.json(
          { error: 'supplier_invoice_no is required for each invoice' },
          { status: 400 }
        )
      }
      
      if (!invoice.supplier) {
        return NextResponse.json(
          { error: 'supplier is required for each invoice' },
          { status: 400 }
        )
      }
      
      if (!invoice.amount || invoice.amount <= 0) {
        return NextResponse.json(
          { error: 'amount must be a positive number for each invoice' },
          { status: 400 }
        )
      }
      
      // allocated_amount is only required if sales_invoice_no is provided
      if (sales_invoice_no) {
        if (!invoice.allocated_amount || invoice.allocated_amount <= 0) {
          return NextResponse.json(
            { error: 'allocated_amount must be a positive number when sales_invoice_no is provided' },
            { status: 400 }
          )
        }
      } else {
        // If no sales invoice, use amount as allocated amount
        invoice.allocated_amount = invoice.amount
      }
      
      // Validate date format if provided
      if (invoice.paid_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(invoice.paid_date)) {
          return NextResponse.json(
            { error: 'paid_date must be in YYYY-MM-DD format' },
            { status: 400 }
          )
        }
      }
    }
    
    console.log('[POST /api/supplier-invoices/create] Creating supplier invoices:', {
      sales_invoice_no,
      invoice_count: invoices.length,
    })
    
    await createSupplierInvoices({
      sales_invoice_no,
      invoices,
    })
    
    console.log('[POST /api/supplier-invoices/create] Supplier invoices created successfully')
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully created ${invoices.length} supplier invoice(s)`,
    })
  } catch (error: any) {
    console.error('[POST /api/supplier-invoices/create] Error creating supplier invoices:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    })
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create supplier invoices',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }, 
      { status: 500 }
    )
  }
}

