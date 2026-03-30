/**
 * Brand logo mapping utility
 * Maps brand slugs/names to their logo file paths
 */
import { getBrandDisplayName, getBrandLogoPath } from './brands'

export function getBrandLogo(brandSlug: string, brandName?: string): string {
  return getBrandLogoPath(brandSlug || brandName)
}

export function getBrandLogoAlt(brandSlug: string, brandName?: string): string {
  if ((brandSlug || '').toLowerCase().trim() === 'admin') return 'Hungry Tum'
  return brandName || getBrandDisplayName(brandSlug) || brandSlug
}
