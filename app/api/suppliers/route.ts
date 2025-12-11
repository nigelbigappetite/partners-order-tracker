import { NextResponse } from 'next/server'
import { getSuppliers } from '@/lib/sheets'
import { getAllOrderLines } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const brand = searchParams.get('brand')
    
    let suppliers = await getSuppliers()
    
    // Filter by brand if provided - get suppliers that have orders for this brand (skip filtering for admin)
    if (brand && brand.toLowerCase() !== 'admin') {
      const orderLines = await getAllOrderLines()
      const brandOrderLines = orderLines.filter((line) => {
        const lineBrand = (line.brand || '').trim()
        return lineBrand.toLowerCase() === brand.toLowerCase()
      })
      
      const supplierNames = new Set(
        brandOrderLines.map((line) => (line.supplier || '').trim()).filter(Boolean)
      )
      
      suppliers = suppliers.filter((supplier) =>
        supplierNames.has(supplier.name.trim())
      )
    }
    
    return NextResponse.json(suppliers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

