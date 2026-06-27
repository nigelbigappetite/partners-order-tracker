import { NextResponse } from 'next/server'
import { getAllBrandAuth } from '@/lib/sheets'
import { getCanonicalBrands, getBrandDisplayName } from '@/lib/brands'

export const dynamic = 'force-dynamic'

/** Brands defined in BRAND_DEFINITIONS that have a BRAND_PASSWORD_* env var set. */
function getEnvVarBrands(): Array<{ brandName: string; slug: string }> {
  return getCanonicalBrands()
    .filter((brand) => {
      const envKey = `BRAND_PASSWORD_${brand.canonicalSlug.toUpperCase().replace(/-/g, '_')}`
      return !!process.env[envKey]
    })
    .map((brand) => ({
      slug: brand.canonicalSlug,
      brandName: brand.displayName,
    }))
}

export async function GET() {
  try {
    // Fetch Sheets brands (graceful fallback to empty list if Sheets not configured)
    let sheetsBrands: Array<{ brandName: string; slug: string }> = []
    const hasSheets =
      !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
      !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      !!process.env.GOOGLE_PRIVATE_KEY

    if (hasSheets) {
      try {
        const all = await getAllBrandAuth()
        sheetsBrands = all.map(({ password, ...rest }) => rest)
      } catch (err) {
        console.warn('[API /brands/auth] Sheets fetch failed, continuing with env-var brands only:', err)
      }
    }

    // Merge env-var brands; Sheets takes precedence for duplicates
    const slugsFromSheets = new Set(sheetsBrands.map((b) => b.slug))
    const envBrands = getEnvVarBrands().filter((b) => !slugsFromSheets.has(b.slug))

    const combined = [...sheetsBrands, ...envBrands]

    return NextResponse.json(combined, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (error: any) {
    console.error('[API /brands/auth] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

