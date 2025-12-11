/**
 * Brand utility functions for slug conversion and validation
 */

/**
 * Convert brand name to URL-friendly slug
 * Example: "SMSH BN" -> "smsh-bn"
 */
export function createBrandSlug(brandName: string): string {
  if (!brandName) return '';
  
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Convert slug back to brand name format (capitalize words)
 * Example: "smsh-bn" -> "SMSH BN"
 * Note: This is a best-guess conversion. Actual brand name should come from database.
 */
export function slugToBrandName(slug: string): string {
  if (!slug) return '';
  
  return slug
    .split('-')
    .map(word => word.toUpperCase())
    .join(' ');
}

/**
 * Validate brand slug format
 */
export function isValidBrandSlug(slug: string): boolean {
  if (!slug) return false;
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0;
}

