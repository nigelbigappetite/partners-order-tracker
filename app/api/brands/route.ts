import { NextResponse } from 'next/server'
import { getBrands } from '@/lib/sheets'

export async function GET() {
  try {
    const brands = await getBrands()
    return NextResponse.json(brands)
  } catch (error: any) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}
