import { NextResponse } from 'next/server'
import { getFranchises } from '@/lib/sheets'

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

