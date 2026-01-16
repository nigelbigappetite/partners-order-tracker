import { NextResponse } from 'next/server'
import { getKitchenSales } from '@/lib/sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const franchiseCode = searchParams.get('franchiseCode') || undefined
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month
    
    // Get sales data
    const sales = await getKitchenSales(startDate, endDate, franchiseCode)
    
    // Group data if requested
    let groupedData: any = sales
    if (groupBy !== 'day') {
      groupedData = groupSalesData(sales, groupBy)
    }
    
    // Calculate summary metrics
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0)
    const totalGrossSales = sales.reduce((sum, s) => sum + s.grossSales, 0)
    const totalOrders = sales.reduce((sum, s) => sum + s.count, 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const uniqueLocations = new Set(sales.map(s => s.location)).size
    const uniqueFranchises = new Set(sales.filter(s => s.franchiseCode).map(s => s.franchiseCode)).size
    
    return NextResponse.json({
      sales: groupedData,
      summary: {
        totalRevenue,
        totalGrossSales,
        totalOrders,
        averageOrderValue,
        uniqueLocations,
        uniqueFranchises,
        dateRange: {
          start: startDate || (sales.length > 0 ? sales[0].date : null),
          end: endDate || (sales.length > 0 ? sales[sales.length - 1].date : null),
        },
      },
      filters: {
        startDate,
        endDate,
        franchiseCode,
        groupBy,
      },
    })
  } catch (error: any) {
    console.error('[Sales API] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch sales data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Group sales data by day, week, or month
function groupSalesData(sales: any[], groupBy: string): any[] {
  const grouped = new Map<string, any>()
  
  sales.forEach((sale) => {
    let key = sale.date
    
    if (groupBy === 'week') {
      // Get week start date (Monday)
      const date = new Date(sale.date)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
      const monday = new Date(date.setDate(diff))
      key = monday.toISOString().split('T')[0]
    } else if (groupBy === 'month') {
      // Get first day of month
      const date = new Date(sale.date)
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: key,
        revenue: 0,
        grossSales: 0,
        count: 0,
        locations: new Set(),
        franchises: new Set(),
      })
    }
    
    const group = grouped.get(key)!
    group.revenue += sale.revenue
    group.grossSales += sale.grossSales
    group.count += sale.count
    if (sale.location) group.locations.add(sale.location)
    if (sale.franchiseCode) group.franchises.add(sale.franchiseCode)
  })
  
  // Convert to array and calculate averages
  return Array.from(grouped.values()).map((group) => ({
    date: group.date,
    revenue: group.revenue,
    grossSales: group.grossSales,
    count: group.count,
    averageOrderValue: group.count > 0 ? group.revenue / group.count : 0,
    uniqueLocations: group.locations.size,
    uniqueFranchises: group.franchises.size,
  }))
}
