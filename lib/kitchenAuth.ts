import { cookies } from 'next/headers'

const ADMIN_COOKIE = 'kitchen-auth-admin'
const KITCHEN_COOKIE_PREFIX = 'kitchen-auth-'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function getKitchenPasswordFromEnv(slug: string): string | null {
  const key = `KITCHEN_PASSWORD_${slug.toUpperCase().replace(/-/g, '_')}`
  return process.env[key] || null
}

function getAdminPassword(): string | null {
  return process.env.KITCHEN_ADMIN_PASSWORD || null
}

/**
 * Verify a password for a given kitchen slug.
 * Admin password works for any kitchen.
 * Kitchen-specific password only works for that kitchen.
 * Returns 'admin' | 'kitchen' | null
 */
export function verifyKitchenPassword(
  slug: string,
  password: string
): 'admin' | 'kitchen' | null {
  const adminPassword = getAdminPassword()
  if (adminPassword && password === adminPassword) return 'admin'

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
 * Uses cookies() from next/headers so the cookie is written to the response headers.
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
