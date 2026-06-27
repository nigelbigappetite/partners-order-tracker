/**
 * Brand authentication utilities
 */

import { cookies } from 'next/headers';
import { getCanonicalBrandSlug, getBrandDefinition, getBrandDisplayName } from './brands';

/**
 * Look up password from env var for brands defined in brands.ts.
 * Convention: BRAND_PASSWORD_{SLUG_UPPERCASED_UNDERSCORED}
 * e.g. wing-shack-chatham → BRAND_PASSWORD_WING_SHACK_CHATHAM
 */
function getBrandPasswordFromEnv(slug: string): string | null {
  const key = `BRAND_PASSWORD_${slug.toUpperCase().replace(/-/g, '_')}`
  return process.env[key] || null
}

const BRAND_AUTH_COOKIE_PREFIX = 'brand-auth-';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface BrandAuth {
  brandName: string;
  slug: string;
  password: string;
}

/**
 * Set brand authentication cookie
 */
export async function setBrandSession(slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`${BRAND_AUTH_COOKIE_PREFIX}${slug}`, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: `/brands/${slug}`,
  });
}

/**
 * Get authenticated brand slug from cookie
 */
export async function getBrandSession(slug: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(`${BRAND_AUTH_COOKIE_PREFIX}${slug}`);
  return cookie?.value === 'authenticated';
}

/**
 * Clear brand authentication cookie
 */
export async function clearBrandSession(slug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(`${BRAND_AUTH_COOKIE_PREFIX}${slug}`);
}

/**
 * Verify brand password
 */
export async function verifyBrandPassword(
  slug: string,
  password: string
): Promise<boolean> {
  // Check env var first (for brands defined in brands.ts without a Sheets entry)
  const envPassword = getBrandPasswordFromEnv(slug)
  if (envPassword !== null) {
    return envPassword === password
  }

  try {
    const { getBrandAuth } = await import('./sheets');
    const brandAuth = await getBrandAuth(slug);
    if (!brandAuth) return false;
    return brandAuth.password === password;
  } catch (error) {
    console.error('Error verifying brand password:', error);
    return false;
  }
}

/**
 * Get brand name from slug
 */
export async function getBrandNameFromSlug(slug: string): Promise<string | null> {
  const canonicalSlug = getCanonicalBrandSlug(slug)
  if (canonicalSlug === 'admin') return 'Admin'

  // If the brand is defined in brands.ts, use it directly (no Sheets call needed)
  const brandDef = getBrandDefinition(slug)
  if (brandDef) return brandDef.displayName

  try {
    const { getBrandAuth } = await import('./sheets');
    const brandAuth = await getBrandAuth(slug);
    return brandAuth?.brandName || getBrandDisplayName(slug) || null;
  } catch (error) {
    console.error('Error getting brand name from slug:', error);
    return getBrandDisplayName(slug) || null;
  }
}
