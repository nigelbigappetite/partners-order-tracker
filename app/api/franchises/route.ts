import { NextResponse } from 'next/server'
import { getFranchises } from '@/lib/sheets'

export async function GET() {
  try {
    const franchises = await getFranchises()
    return NextResponse.json(franchises)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

