import { NextResponse } from 'next/server'
import { getAllBrandAuth } from '@/lib/sheets'

export async function GET() {
  try {
    const brands = await getAllBrandAuth()
    // Don't return passwords in the response
    const brandsWithoutPasswords = brands.map(({ password, ...rest }) => rest)
    return NextResponse.json(brandsWithoutPasswords)
  } catch (error: any) {
    console.error('Error fetching brand auth:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

