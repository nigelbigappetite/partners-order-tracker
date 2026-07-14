import { NextRequest, NextResponse } from 'next/server'
import { getKitchenSitesFromDb, createKitchenSite } from '@/lib/kitchen-sites-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sites = await getKitchenSitesFromDb()
    return NextResponse.json({ sites })
  } catch (error: any) {
    console.error('[admin/sites GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, display_name, password, franchisee_email, logo_path,
            data_brand_slug, location_filter, deliveroo_location_key,
            kitchen_location, ordering_site_id, data_start_date } = body

    if (!slug || !display_name) {
      return NextResponse.json({ error: 'slug and display_name are required' }, { status: 400 })
    }

    const site = await createKitchenSite({
      slug,
      display_name,
      logo_path: logo_path || '/transparent Wing Shack logo 1080x1080.png',
      data_brand_slug: data_brand_slug || null,
      location_filter: location_filter || null,
      deliveroo_location_key: deliveroo_location_key || null,
      kitchen_location: kitchen_location || null,
      ordering_site_id: ordering_site_id || null,
      data_start_date: data_start_date || null,
      password: password || null,
      franchisee_email: franchisee_email || null,
    })
    return NextResponse.json({ site })
  } catch (error: any) {
    console.error('[admin/sites POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
