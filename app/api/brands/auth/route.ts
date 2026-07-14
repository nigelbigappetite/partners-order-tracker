import { NextResponse } from 'next/server'
import { getCanonicalBrands, getBrandDefinition } from '@/lib/brands'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const partnerBrands = getCanonicalBrands()
      .filter((brand) => {
        // Exclude kitchen sites — they use /kitchens/ login, not brand-select
        if (brand.orderingSiteId || brand.deliverooLocationKey) return false
        const envKey = `BRAND_PASSWORD_${brand.canonicalSlug.toUpperCase().replace(/-/g, '_')}`
        return !!process.env[envKey]
      })
      .map((brand) => ({ slug: brand.canonicalSlug, brandName: brand.displayName }))

    // Admin is always available — no password required
    const adminDef = getBrandDefinition('admin')
    const admin = adminDef ? [{ slug: 'admin', brandName: adminDef.displayName }] : []

    return NextResponse.json([...partnerBrands, ...admin])
  } catch (error: any) {
    console.error('[API /brands/auth] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}
