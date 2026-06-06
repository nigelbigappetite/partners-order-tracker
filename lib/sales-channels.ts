import { KitchenSales } from './types'

type SalesChannel = NonNullable<KitchenSales['salesChannel']>

const HUNGRY_TUM_SITE_ALIASES: Record<string, Set<string>> = {
  'smsh-bn': new Set([
    'smsh bn bethnal green',
    'smsh bn bethnal green uk',
    'smsh bn bethnal green london',
  ]),
  'wing-shack-co': new Set([
    'bethnal green',
    'hungry tum bethnal green',
    'wsco bethnal green',
    'wsco bethnal green uk',
    'wing shack bethnal green',
    'wing shack co bethnal green',
    'chatham',
    'hungry tum chatham',
    'maidstone',
    'hungry tum maidstone',
    'loughton',
    'hungry tum loughton',
    'wanstead',
    'hungry tum wanstead',
  ]),
  'eggs-nstuff': new Set([
    'bethnal green',
    'eggs n stuff bethnal green',
    'eggs n stuff bethnal green uk',
    'hungry tum bethnal green',
  ]),
}

export function normalizeSalesLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getSalesChannel(
  brandSlug: string | null | undefined,
  location: string,
  _source: 'kitchen_sales' | 'operated_site' = 'kitchen_sales'
): SalesChannel {
  const normalizedLocation = normalizeSalesLocation(location)
  if (brandSlug && HUNGRY_TUM_SITE_ALIASES[brandSlug]?.has(normalizedLocation)) {
    return 'hungry_tum'
  }

  return 'gfv'
}
