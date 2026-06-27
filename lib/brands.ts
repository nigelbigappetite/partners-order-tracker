export interface BrandDefinition {
  canonicalSlug: string
  displayName: string
  logoPath: string
  aliases: string[]
  /** When set, query kitchen_sales using this brand_slug instead of canonicalSlug */
  dataBrandSlug?: string
  /** When set, filter kitchen_sales to rows matching this location string */
  locationFilter?: string
  /** When set, do not return sales data before this date (YYYY-MM-DD). Used to exclude prior-operator data. */
  dataStartDate?: string
  /** When set (kitchen sites only), fetch supply orders from hungry-tum-ordering for this site_id */
  orderingSiteId?: string
  /** When set (kitchen sites only), fetch Deliveroo order data from brain Supabase using this location key */
  deliverooLocationKey?: string
  /** Canonical location name used to normalise all sales rows for this kitchen site */
  kitchenLocation?: string
}

const BRAND_DEFINITIONS: BrandDefinition[] = [
  {
    canonicalSlug: 'smsh-bn',
    displayName: 'SMSH BN',
    logoPath: '/smsh bn logo rnd.png',
    aliases: ['smsh bn'],
  },
  {
    canonicalSlug: 'wing-shack-co',
    displayName: 'Wing Shack Co',
    logoPath: '/transparent Wing Shack logo 1080x1080.png',
    aliases: ['wing-shack', 'wing shack', 'wingshack', 'wingshackco', 'wing shack co'],
  },
  {
    canonicalSlug: 'eggs-nstuff',
    displayName: 'Eggs n Stuff',
    logoPath: '/Eggs n Stuff logo.png',
    aliases: ['eggs-n-stuff', 'eggs n stuff', 'eggsnstuff'],
  },
  {
    canonicalSlug: 'wing-shack-chatham',
    displayName: 'Wing Shack Chatham',
    logoPath: '/transparent Wing Shack logo 1080x1080.png',
    aliases: ['wing shack chatham', 'wingshack chatham', 'ws chatham'],
    dataBrandSlug: 'wing-shack-co',
    locationFilter: 'Chatham',
    dataStartDate: '2026-06-09',
    orderingSiteId: '5f5b748c-ee24-47aa-9e52-7f40770c0c9a',
    deliverooLocationKey: 'chatham',
    kitchenLocation: 'Wing Shack Co- Chatham',
  },
  {
    canonicalSlug: 'admin',
    displayName: 'Admin',
    logoPath: '/Hungry Tum Logo.jpeg',
    aliases: [],
  },
]

const brandIndex = new Map<string, BrandDefinition>()

for (const brand of BRAND_DEFINITIONS) {
  brandIndex.set(brand.canonicalSlug, brand)
  brandIndex.set(brand.displayName.toLowerCase(), brand)
  for (const alias of brand.aliases) {
    brandIndex.set(alias.toLowerCase(), brand)
  }
}

export function normalizeBrandKey(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

export function getBrandDefinition(value: string | null | undefined): BrandDefinition | null {
  const key = normalizeBrandKey(value)
  if (!key) return null
  return brandIndex.get(key) ?? null
}

export function getCanonicalBrandSlug(value: string | null | undefined): string | null {
  const brand = getBrandDefinition(value)
  return brand?.canonicalSlug ?? (value ? normalizeBrandKey(value) : null)
}

export function getBrandDisplayName(value: string | null | undefined): string | null {
  const brand = getBrandDefinition(value)
  return brand?.displayName ?? (value ? value.trim() : null)
}

export function getBrandLogoPath(value: string | null | undefined): string {
  const brand = getBrandDefinition(value)
  return brand?.logoPath ?? '/Hungry Tum Logo.jpeg'
}

export function getCanonicalBrands(): BrandDefinition[] {
  return BRAND_DEFINITIONS.filter((brand) => brand.canonicalSlug !== 'admin')
}
