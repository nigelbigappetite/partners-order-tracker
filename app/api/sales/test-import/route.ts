import { NextResponse } from 'next/server'
import { getKitchenSales } from '@/lib/sheets'

// Test endpoint to verify data is in Google Sheets
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const testDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    // Get all sales data
    const allSales = await getKitchenSales()
    
    // Filter by test date
    const salesForDate = allSales.filter(s => s.date === testDate)
    
    // Get total count
    const totalCount = allSales.length
    
    return NextResponse.json({
      success: true,
      testDate,
      totalSalesRecords: totalCount,
      salesForDate: salesForDate.length,
      sampleRecords: salesForDate.slice(0, 5),
      message: `Found ${totalCount} total records in Google Sheets. ${salesForDate.length} records for ${testDate}.`,
    })
  } catch (error: any) {
    console.error('[Test Import] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to test import',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
