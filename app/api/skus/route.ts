import { NextResponse } from 'next/server'
import { getSKUs } from '@/lib/sheets'
import { getAllOrderLines } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    
    let skus = await getSKUs()
    
    // Filter by brand if provided - get SKUs that have orders for this brand (skip filtering for admin)
    if (brand && brand.toLowerCase() !== 'admin') {
      const orderLines = await getAllOrderLines()
      const brandOrderLines = orderLines.filter((line) => {
        const lineBrand = (line.brand || '').trim()
        return lineBrand.toLowerCase() === brand.toLowerCase()
      })
      
      const skuCodes = new Set(
        brandOrderLines.map((line) => (line.sku || '').trim()).filter(Boolean)
      )
      
      skus = skus.filter((sku) => skuCodes.has(sku.sku.trim()))
    }
    
    return NextResponse.json(skus)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

