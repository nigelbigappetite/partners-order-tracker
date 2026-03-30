export interface BrandDefinition {
  canonicalSlug: string
  displayName: string
  logoPath: string
  aliases: string[]
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
