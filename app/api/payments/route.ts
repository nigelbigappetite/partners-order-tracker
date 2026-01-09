import { NextResponse } from 'next/server'
import { getPaymentsTracker, calculateSettlementStatus } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const settlementStatus = searchParams.get('settlementStatus')
    const brand = searchParams.get('brand')
    const franchisee = searchParams.get('franchisee')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const payments = await getPaymentsTracker()
    
    // Calculate and override settlement_status from Supplier_Invoices data
    const paymentsWithCalculatedStatus = await Promise.all(
      payments.map(async (payment) => {
        const calculatedStatus = await calculateSettlementStatus(
          payment.sales_invoice_no,
          payment.partner_paid,
          payment.funds_cleared
        )
        return {
          ...payment,
          settlement_status: calculatedStatus,
        }
      })
    )
    
    // Apply filters
    let filtered = paymentsWithCalculatedStatus
    
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

