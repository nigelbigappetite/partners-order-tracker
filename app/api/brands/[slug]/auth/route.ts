import { NextResponse } from 'next/server'
import { verifyBrandPassword, setBrandSession } from '@/lib/brandAuth'

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { password } = await request.json()
    const slug = params.slug

    const isValid = await verifyBrandPassword(slug, password)
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    await setBrandSession(slug)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error authenticating brand:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

