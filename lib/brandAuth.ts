/**
 * Brand authentication utilities
 */

import { cookies } from 'next/headers';

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
  try {
    const { getBrandAuth } = await import('./sheets');
    const brandAuth = await getBrandAuth(slug);
    
    if (!brandAuth) {
      return false;
    }
    
    // Simple password comparison (case-sensitive)
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
  try {
    // Admin always returns "Admin" as brand name
    if (slug.toLowerCase() === 'admin') {
      return 'Admin';
    }
    
    const { getBrandAuth } = await import('./sheets');
    const brandAuth = await getBrandAuth(slug);
    return brandAuth?.brandName || null;
  } catch (error) {
    console.error('Error getting brand name from slug:', error);
    return null;
  }
}

