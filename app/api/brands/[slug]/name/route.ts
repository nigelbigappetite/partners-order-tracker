import { NextResponse } from 'next/server'
import { getBrandNameFromSlug } from '@/lib/brandAuth'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug
    const brandName = await getBrandNameFromSlug(slug)
    
    if (!brandName) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }
    
    return NextResponse.json({ brandName })
  } catch (error: any) {
    console.error('Error fetching brand name:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

