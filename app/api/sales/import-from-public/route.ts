import { NextResponse } from 'next/server'
import { importKitchenSalesFromDeliverectCSV } from '@/lib/sheets'
import { DeliverectCSVRow } from '@/lib/types'
import * as fs from 'fs'
import * as path from 'path'

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add last field
  result.push(current.trim())
  
  return result
}

// Parse CSV file
function parseCSVFile(filePath: string): DeliverectCSVRow[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`)
    return []
  }
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    return []
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0])
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    const normalized = header.replace(/"/g, '').trim().toLowerCase()
    headerMap[normalized] = index
  })
  
  // Find column indices
  const dateIndex = headerMap['date'] ?? -1
  const revenueIndex = headerMap['revenue'] ?? -1
  const grossSalesIndex = headerMap['grosssales'] ?? -1
  const countIndex = headerMap['count'] ?? -1
  const locationIndex = headerMap['location'] ?? -1
  
  if (dateIndex === -1 || revenueIndex === -1 || countIndex === -1 || locationIndex === -1) {
    throw new Error(`CSV missing required columns: Date, Revenue, Count, Location`)
  }
  
  // Parse data rows
  const rows: DeliverectCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    
    const date = values[dateIndex]?.replace(/"/g, '').trim() || ''
    const revenueStr = values[revenueIndex]?.replace(/"/g, '').trim() || ''
    const grossSalesStr = values[grossSalesIndex]?.replace(/"/g, '').trim() || ''
    const countStr = values[countIndex]?.replace(/"/g, '').trim() || ''
    const location = values[locationIndex]?.replace(/"/g, '').trim() || ''
    
    // Skip rows with empty required fields
    if (!date || !location) continue
    
    // Skip rows where all numeric fields are empty
    if (!revenueStr && !grossSalesStr && !countStr) continue
    
    const revenue = revenueStr ? parseFloat(revenueStr) : 0
    const grossSales = grossSalesStr ? parseFloat(grossSalesStr) : revenue
    const count = countStr ? parseInt(countStr, 10) : 0
    
    // Only include rows with valid numeric data
    if (isNaN(revenue) || isNaN(count) || count < 0) continue
    
    rows.push({
      Date: date,
      Revenue: isNaN(revenue) ? 0 : revenue,
      GrossSales: isNaN(grossSales) ? revenue : grossSales,
      Count: isNaN(count) ? 0 : count,
      Location: location,
    })
  }
  
  return rows
}

export async function POST(request: Request) {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const csvFiles = [
      path.join(publicDir, 'exportReport-69693e9884fb43b04bdc1895.csv'),
      path.join(publicDir, 'exportReport-69693f323194d63bbdfc1a86.csv'),
    ]
    
    let allRows: DeliverectCSVRow[] = []
    
    // Parse all CSV files
    for (const filePath of csvFiles) {
      console.log(`[Import] Parsing ${path.basename(filePath)}...`)
      const rows = parseCSVFile(filePath)
      console.log(`[Import] Found ${rows.length} valid rows`)
      allRows = allRows.concat(rows)
    }
    
    console.log(`[Import] Total valid rows to import: ${allRows.length}`)
    
    if (allRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid data found in CSV files',
        imported: 0,
        skipped: 0,
        errors: [],
        unmappedLocations: [],
      })
    }
    
    // Import to Google Sheets
    const result = await importKitchenSalesFromDeliverectCSV(allRows)
    
    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      unmappedLocations: result.unmappedLocations,
      message: `Successfully imported ${result.imported} rows. ${result.skipped} duplicates skipped.`,
    })
  } catch (error: any) {
    console.error('[Import from Public] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to import CSV',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
