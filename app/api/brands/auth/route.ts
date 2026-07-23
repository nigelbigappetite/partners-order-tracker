import { NextResponse } from 'next/server'
import { getCanonicalBrands, getBrandDefinition } from '@/lib/brands'
import { getKitchenSitesFromDb } from '@/lib/kitchen-sites-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const partnerBrands = getCanonicalBrands()
      .filter((brand) => {
        // Exclude kitchen sites — they appear in the Kitchens section, not brand-select
        if (brand.orderingSiteId || brand.deliverooLocationKey) return false
        const envKey = `BRAND_PASSWORD_${brand.canonicalSlug.toUpperCase().replace(/-/g, '_')}`
        return !!process.env[envKey]
      })
      .map((brand) => ({ slug: brand.canonicalSlug, brandName: brand.displayName }))

    // Admin is always available — no password required
    const adminDef = getBrandDefinition('admin')
    const admin = adminDef ? [{ slug: 'admin', brandName: adminDef.displayName }] : []

    const kitchenSites = await getKitchenSitesFromDb()
    const kitchens = kitchenSites.map((site) => ({
      slug: site.slug,
      brandName: site.display_name,
    }))

    return NextResponse.json({ brands: [...partnerBrands, ...admin], kitchens })
  } catch (error: any) {
    console.error('[API /brands/auth] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}
