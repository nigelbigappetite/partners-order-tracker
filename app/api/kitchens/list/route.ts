import { NextResponse } from 'next/server'
import { getCanonicalBrands } from '@/lib/brands'

export const dynamic = 'force-dynamic'

export async function GET() {
  const kitchens = getCanonicalBrands()
    .filter((brand) => brand.orderingSiteId || brand.deliverooLocationKey)
    .map((brand) => ({ slug: brand.canonicalSlug, kitchenName: brand.displayName }))

  return NextResponse.json(kitchens)
}
