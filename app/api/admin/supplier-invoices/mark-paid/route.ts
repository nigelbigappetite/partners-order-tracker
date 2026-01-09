import { NextResponse } from 'next/server'
import {
  findRowIndexByValue,
  updateRowCells,
  SUPPLIER_INVOICES_COLUMNS,
} from '@/lib/googleSheets'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { supplier_invoice_no, paid_date, payment_reference } = body

    // Validate required fields
    if (!supplier_invoice_no) {
      return NextResponse.json(
        { error: 'supplier_invoice_no is required' },
        { status: 400 }
      )
    }

    // Validate date format if provided
    if (paid_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(paid_date)) {
        return NextResponse.json(
          { error: 'paid_date must be in YYYY-MM-DD format' },
          { status: 400 }
        )
      }
    }

    // Find row by supplier invoice number (column A)
    const rowIndex = await findRowIndexByValue(
      'Supplier_Invoices',
      SUPPLIER_INVOICES_COLUMNS.INVOICE_NO,
      supplier_invoice_no
    )

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: `Supplier invoice ${supplier_invoice_no} not found in Supplier_Invoices` },
        { status: 404 }
      )
    }

    console.log('[POST /api/admin/supplier-invoices/mark-paid] Processing:', {
      supplier_invoice_no,
      rowIndex,
      paid_date,
      payment_reference,
    })

    // Build updates
    const updates: Array<{ col: string; value: any }> = [
      { col: SUPPLIER_INVOICES_COLUMNS.PAID, value: 'YES' },
    ]

    if (paid_date) {
      updates.push({ col: SUPPLIER_INVOICES_COLUMNS.PAID_DATE, value: paid_date })
    }

    if (payment_reference) {
      // Only add if column exists (optional column)
      updates.push({ col: SUPPLIER_INVOICES_COLUMNS.PAYMENT_REFERENCE, value: payment_reference })
    }

    // Update supplier invoice fields
    await updateRowCells('Supplier_Invoices', rowIndex, updates)

    console.log('[POST /api/admin/supplier-invoices/mark-paid] Supplier invoice marked as paid:', {
      supplier_invoice_no,
      paid_date,
      payment_reference,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[POST /api/admin/supplier-invoices/mark-paid] Error:', {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to mark supplier invoice as paid',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

