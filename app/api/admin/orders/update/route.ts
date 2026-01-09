import { NextResponse } from 'next/server'
import {
  findRowIndexByValue,
  updateRowCells,
  validateOrderStage,
  validatePaymentMethod,
  ORDERS_HEADER_COLUMNS,
  ALLOWED_PAYMENT_METHODS,
} from '@/lib/googleSheets'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sales_invoice_no, action, payload } = body

    // Validate required fields
    if (!sales_invoice_no) {
      return NextResponse.json(
        { error: 'sales_invoice_no is required' },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      )
    }

    if (!payload) {
      return NextResponse.json(
        { error: 'payload is required' },
        { status: 400 }
      )
    }

    // Find row by invoice number (column H)
    const rowIndex = await findRowIndexByValue(
      'Orders_Header',
      ORDERS_HEADER_COLUMNS.INVOICE_NO,
      sales_invoice_no
    )

    if (rowIndex === -1) {
      return NextResponse.json(
        { error: `Sales invoice ${sales_invoice_no} not found in Orders_Header` },
        { status: 404 }
      )
    }

    console.log('[POST /api/admin/orders/update] Processing action:', {
      sales_invoice_no,
      action,
      rowIndex,
    })

    // Handle different actions
    if (action === 'set_stage') {
      const { stage } = payload

      if (!stage) {
        return NextResponse.json(
          { error: 'stage is required for set_stage action' },
          { status: 400 }
        )
      }

      // Validate stage is in allowlist
      if (!validateOrderStage(stage)) {
        return NextResponse.json(
          { 
            error: `Invalid stage: ${stage}. Allowed stages: ${ALLOWED_ORDER_STAGES.join(', ')}` 
          },
          { status: 400 }
        )
      }

      // Update Order Stage (column L)
      await updateRowCells('Orders_Header', rowIndex, [
        { col: ORDERS_HEADER_COLUMNS.ORDER_STAGE, value: stage },
      ])

      console.log('[POST /api/admin/orders/update] Stage updated successfully:', {
        sales_invoice_no,
        stage,
      })

      return NextResponse.json({ success: true, stage })

    } else if (action === 'mark_partner_paid') {
      const { paid_date, payment_method, payment_ref } = payload

      // Validate payment_method if provided
      if (payment_method && !validatePaymentMethod(payment_method)) {
        return NextResponse.json(
          { 
            error: `Invalid payment_method: ${payment_method}. Allowed methods: ${ALLOWED_PAYMENT_METHODS.join(', ')}` 
          },
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

      // Build updates
      const updates: Array<{ col: string; value: any }> = [
        { col: ORDERS_HEADER_COLUMNS.PARTNER_PAID, value: 'YES' },
      ]

      if (paid_date) {
        updates.push({ col: ORDERS_HEADER_COLUMNS.PARTNER_PAID_DATE, value: paid_date })
      }

      if (payment_method) {
        updates.push({ col: ORDERS_HEADER_COLUMNS.PARTNER_PAYMENT_METHOD, value: payment_method })
      }

      if (payment_ref) {
        // Only add if column exists (optional column)
        updates.push({ col: ORDERS_HEADER_COLUMNS.PARTNER_PAYMENT_REF, value: payment_ref })
      }

      // Update partner payment fields
      await updateRowCells('Orders_Header', rowIndex, updates)

      console.log('[POST /api/admin/orders/update] Partner payment marked successfully:', {
        sales_invoice_no,
        paid_date,
        payment_method,
        payment_ref,
      })

      return NextResponse.json({ success: true })

    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}. Allowed actions: set_stage, mark_partner_paid` },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[POST /api/admin/orders/update] Error:', {
      error: error.message,
      stack: error.stack,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to update order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

