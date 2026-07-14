import { NextRequest, NextResponse } from 'next/server'
import { verifyKitchenPassword, setKitchenSession } from '@/lib/kitchenAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, kitchenSlug } = body as { password?: string; kitchenSlug?: string }

    if (!password || !kitchenSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await verifyKitchenPassword(kitchenSlug, password)

    if (!result) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    await setKitchenSession(kitchenSlug, result)

    return NextResponse.json({ ok: true, kitchenSlug })
  } catch (error) {
    console.error('Kitchen auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
