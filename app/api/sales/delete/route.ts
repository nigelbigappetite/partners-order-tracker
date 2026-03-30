import { NextResponse } from 'next/server'
import { deleteKitchenSales } from '@/lib/sales-supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }
    await deleteKitchenSales(ids)
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error: any) {
    console.error('[Sales Delete API] Error:', error)
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 })
  }
}
