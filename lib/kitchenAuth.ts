import { cookies } from 'next/headers'
import { getKitchenSiteBySlug } from './kitchen-sites-db'

const ADMIN_COOKIE = 'kitchen-auth-admin'
const KITCHEN_COOKIE_PREFIX = 'kitchen-auth-'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function getKitchenPasswordFromEnv(slug: string): string | null {
  const envSlug = slug.toUpperCase().replace(/-/g, '_')
  const kitchenKey = `KITCHEN_PASSWORD_${envSlug}`
  const brandKey = `BRAND_PASSWORD_${envSlug}`
  return process.env[kitchenKey] || process.env[brandKey] || null
}

function getAdminPassword(): string | null {
  return process.env.KITCHEN_ADMIN_PASSWORD || null
}

/**
 * Verify a password for a given kitchen slug.
 * Admin password works for any kitchen.
 * Checks DB first (kitchen_sites table), then falls back to env vars.
 */
export async function verifyKitchenPassword(
  slug: string,
  password: string
): Promise<'admin' | 'kitchen' | null> {
  const adminPassword = getAdminPassword()
  if (adminPassword && password === adminPassword) return 'admin'

  // Check DB first
  try {
    const site = await getKitchenSiteBySlug(slug)
    if (site?.password && password === site.password) return 'kitchen'
    // If site exists in DB but password doesn't match, still fall through to env var
  } catch {
    // DB unavailable — fall through to env var check
  }

  // Fall back to env var
  const kitchenPassword = getKitchenPasswordFromEnv(slug)
  if (kitchenPassword && password === kitchenPassword) return 'kitchen'

  return null
}

/**
 * Check if the current request is authenticated for the given kitchen slug.
 * Returns true if they have the admin cookie OR the per-kitchen cookie.
 */
export async function getKitchenSession(slug: string): Promise<boolean> {
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get(ADMIN_COOKIE)
  if (adminCookie?.value === 'authenticated') return true
  const kitchenCookie = cookieStore.get(`${KITCHEN_COOKIE_PREFIX}${slug}`)
  return kitchenCookie?.value === 'authenticated'
}

/**
 * Set the session cookie for a kitchen login.
 */
export async function setKitchenSession(
  slug: string,
  role: 'admin' | 'kitchen'
): Promise<void> {
  const cookieStore = await cookies()
  const cookieName = role === 'admin' ? ADMIN_COOKIE : `${KITCHEN_COOKIE_PREFIX}${slug}`
  cookieStore.set(cookieName, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export { ADMIN_COOKIE, KITCHEN_COOKIE_PREFIX, COOKIE_MAX_AGE }
