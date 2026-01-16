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
function parseCSVFile(filePath: string): any[] {
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
  const rows: any[] = []
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

// Main import function
async function importSalesCSV() {
  const csvFiles = [
    path.join(process.cwd(), 'public', 'exportReport-69693e9884fb43b04bdc1895.csv'),
    path.join(process.cwd(), 'public', 'exportReport-69693f323194d63bbdfc1a86.csv'),
  ]
  
  let allRows: any[] = []
  
  // Parse all CSV files
  for (const filePath of csvFiles) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`)
      continue
    }
    
    console.log(`Parsing ${path.basename(filePath)}...`)
    const rows = parseCSVFile(filePath)
    console.log(`  Found ${rows.length} valid rows`)
    allRows = allRows.concat(rows)
  }
  
  console.log(`\nTotal valid rows to import: ${allRows.length}`)
  
  if (allRows.length === 0) {
    console.log('No valid data to import')
    return
  }
  
  // Import via API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/sales/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(allRows),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('Import failed:', result)
      return
    }
    
    console.log('\nImport Results:')
    console.log(`  Imported: ${result.imported} rows`)
    console.log(`  Skipped: ${result.skipped} rows (duplicates)`)
    if (result.errors && result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`)
      result.errors.slice(0, 5).forEach((err: string) => console.log(`    - ${err}`))
    }
    if (result.unmappedLocations && result.unmappedLocations.length > 0) {
      console.log(`  Unmapped Locations: ${result.unmappedLocations.length}`)
      const unique = Array.from(new Set(result.unmappedLocations)) as string[]
      unique.slice(0, 10).forEach((loc: string) => console.log(`    - ${loc}`))
      if (unique.length > 10) {
        console.log(`    ... and ${unique.length - 10} more`)
      }
    }
  } catch (error: any) {
    console.error('Error importing:', error.message)
  }
}

// Run if called directly
if (require.main === module) {
  importSalesCSV().catch(console.error)
}

export { importSalesCSV, parseCSVFile }
