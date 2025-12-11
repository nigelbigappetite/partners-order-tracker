import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/sheets'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await createOrder(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

