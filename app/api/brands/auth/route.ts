import { NextResponse } from 'next/server'
import { getAllBrandAuth } from '@/lib/sheets'

export async function GET() {
  try {
    // Check environment variables first
    const hasSpreadsheetId = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const hasPrivateKey = !!process.env.GOOGLE_PRIVATE_KEY
    
    console.log('[API /brands/auth] Environment check:', {
      hasSpreadsheetId,
      hasServiceAccount,
      hasPrivateKey
    })
    
    if (!hasSpreadsheetId || !hasServiceAccount || !hasPrivateKey) {
      return NextResponse.json({ 
        error: 'Google Sheets credentials not configured',
        missing: {
          spreadsheetId: !hasSpreadsheetId,
          serviceAccount: !hasServiceAccount,
          privateKey: !hasPrivateKey
        }
      }, { status: 500 })
    }
    
    console.log('[API /brands/auth] Starting fetch...')
    const brands = await getAllBrandAuth()
    console.log(`[API /brands/auth] Fetched ${brands.length} brands`)
    
    if (brands.length === 0) {
      console.warn('[API /brands/auth] No brands found - this might indicate a connection issue')
      return NextResponse.json({ 
        error: 'No brands found in Brand_Auth sheet',
        brands: []
      }, { status: 200 }) // Return 200 but with error message
    }
    
    // Don't return passwords in the response
    const brandsWithoutPasswords = brands.map(({ password, ...rest }) => rest)
    return NextResponse.json(brandsWithoutPasswords)
  } catch (error: any) {
    console.error('[API /brands/auth] Error:', error)
    console.error('[API /brands/auth] Error stack:', error.stack)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch brands',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

