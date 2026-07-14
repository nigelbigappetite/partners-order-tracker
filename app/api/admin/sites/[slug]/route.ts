import { NextRequest, NextResponse } from 'next/server'
import { updateKitchenSite, deactivateKitchenSite } from '@/lib/kitchen-sites-db'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json()
    await updateKitchenSite(params.slug, body)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[admin/sites PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await deactivateKitchenSite(params.slug)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[admin/sites DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
