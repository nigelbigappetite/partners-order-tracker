import { NextResponse } from 'next/server'
import { getCompanyEarnings } from '@/lib/sheets'

export async function GET() {
  try {
    const earnings = await getCompanyEarnings()
    return NextResponse.json(earnings)
  } catch (error: any) {
    console.error('Error in /api/company-earnings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

