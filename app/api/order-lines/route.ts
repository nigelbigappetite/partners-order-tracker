import { NextResponse } from 'next/server'
import { getAllOrderLines } from '@/lib/sheets'

export async function GET() {
  try {
    const orderLines = await getAllOrderLines()
    return NextResponse.json(orderLines)
  } catch (error: any) {
    console.error('Error in /api/order-lines:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

