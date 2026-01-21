import { NextResponse } from 'next/server'
import { getFranchises, createFranchiseEntry } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[API /franchises] Fetching franchises...')
    const franchises = await getFranchises()
    console.log('[API /franchises] Returning', franchises.length, 'franchises')
    
    // Prevent caching to ensure fresh data
    return NextResponse.json(franchises, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('[API /franchises] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, name, city, country, status, activeBrands } = body || {}

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Franchisee Code and Franchisee Name are required' },
        { status: 400 }
      )
    }

    await createFranchiseEntry({
      code: String(code).trim(),
      name: String(name).trim(),
      city: city ? String(city).trim() : undefined,
      country: country ? String(country).trim() : undefined,
      status: status ? String(status).trim() : undefined,
      activeBrands: activeBrands ? String(activeBrands).trim() : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API /franchises] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create franchise entry' },
      { status: 500 }
    )
  }
}

