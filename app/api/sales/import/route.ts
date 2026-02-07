import { NextResponse } from 'next/server'
import { importKitchenSalesFromDeliverectCSV } from '@/lib/sheets'
import { DeliverectCSVRow } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type')
    
    let csvRows: DeliverectCSVRow[] = []
    
    // Handle JSON array upload
    if (contentType?.includes('application/json')) {
      const body = await request.json()
      csvRows = Array.isArray(body) ? body : []
    }
    // Handle CSV file upload (multipart/form-data)
    else if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }
      
      const text = await file.text()
      csvRows = parseCSV(text)
    }
    // Handle plain text CSV
    else {
      const text = await request.text()
      csvRows = parseCSV(text)
    }
    
    if (csvRows.length === 0) {
      return NextResponse.json(
        { error: 'No data provided or CSV is empty' },
        { status: 400 }
      )
    }
    
    // Validate CSV structure
    const validationErrors = validateCSVRows(csvRows)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'CSV validation failed',
          details: validationErrors
        },
        { status: 400 }
      )
    }
    
    // Import to Google Sheets
    console.log(`[CSV Import API] Starting import of ${csvRows.length} CSV rows`);
    const result = await importKitchenSalesFromDeliverectCSV(csvRows)
    console.log(`[CSV Import API] Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    
    if (result.errors.length > 0) {
      console.error(`[CSV Import API] Import errors:`, result.errors);
    }
    
    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      unmappedLocations: result.unmappedLocations,
      message: `Successfully imported ${result.imported} rows to Google Sheets. ${result.skipped} duplicates skipped.${result.errors.length > 0 ? ` ${result.errors.length} errors occurred.` : ''}`,
    })
  } catch (error: any) {
    console.error('[CSV Import API] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to import CSV',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Parse CSV text into DeliverectCSVRow objects
function parseCSV(csvText: string): DeliverectCSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    return []
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0])
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase()
    headerMap[normalized] = index
  })
  
  // Find column indices
  const dateIndex = headerMap['date'] ?? -1
  const revenueIndex = headerMap['revenue'] ?? -1
  const grossSalesIndex = headerMap['grosssales'] ?? headerMap['gross sales'] ?? -1
  const countIndex = headerMap['count'] ?? -1
  const locationIndex = headerMap['location'] ?? -1
  
  if (dateIndex === -1 || revenueIndex === -1 || countIndex === -1 || locationIndex === -1) {
    throw new Error('CSV missing required columns: Date, Revenue, Count, Location')
  }
  
  // Parse data rows
  const rows: DeliverectCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    
    const date = values[dateIndex]?.trim() || ''
    const revenue = parseFloat(values[revenueIndex]?.trim() || '0')
    const grossSales = grossSalesIndex >= 0 ? parseFloat(values[grossSalesIndex]?.trim() || '0') : revenue
    const count = parseInt(values[countIndex]?.trim() || '0', 10)
    const location = values[locationIndex]?.trim() || ''
    
    if (date && location) {
      rows.push({
        Date: date,
        Revenue: isNaN(revenue) ? 0 : revenue,
        GrossSales: isNaN(grossSales) ? revenue : grossSales,
        Count: isNaN(count) ? 0 : count,
        Location: location,
      })
    }
  }
  
  return rows
}

// Parse a CSV line handling quoted fields
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

// Validate CSV rows
function validateCSVRows(rows: DeliverectCSVRow[]): string[] {
  const errors: string[] = []
  
  rows.forEach((row, index) => {
    if (!row.Date) {
      errors.push(`Row ${index + 1}: Missing Date`)
    }
    if (!row.Location) {
      errors.push(`Row ${index + 1}: Missing Location`)
    }
    if (row.Revenue === undefined || isNaN(row.Revenue)) {
      errors.push(`Row ${index + 1}: Invalid Revenue`)
    }
    if (row.Count === undefined || isNaN(row.Count) || row.Count < 0) {
      errors.push(`Row ${index + 1}: Invalid Count`)
    }
    
    // Validate date format (YYYY-MM-DD)
    if (row.Date && !/^\d{4}-\d{2}-\d{2}$/.test(row.Date)) {
      errors.push(`Row ${index + 1}: Invalid date format (expected YYYY-MM-DD): ${row.Date}`)
    }
  })
  
  return errors
}
