import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, KITCHEN_COOKIE_PREFIX } from '@/lib/kitchenAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kitchenSlug = searchParams.get('kitchen') || ''

  const response = NextResponse.redirect(
    new URL('/kitchens/login', request.url),
    { status: 303 }
  )
  response.cookies.delete(ADMIN_COOKIE)
  if (kitchenSlug) {
    response.cookies.delete(`${KITCHEN_COOKIE_PREFIX}${kitchenSlug}`)
  }
  return response
}
