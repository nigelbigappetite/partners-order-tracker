import { NextResponse } from 'next/server'
import { insertKitchenSales } from '@/lib/sales-supabase'
import { DeliverectCSVRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type')

    let csvRows: DeliverectCSVRow[] = []
    let brandSlug = ''

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File
      brandSlug = (formData.get('brand_slug') as string) || ''

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const text = await file.text()
      csvRows = parseCSV(text)
    } else if (contentType?.includes('application/json')) {
      const body = await request.json()
      csvRows = Array.isArray(body.rows) ? body.rows : Array.isArray(body) ? body : []
      brandSlug = body.brand_slug || ''
    } else {
      const text = await request.text()
      csvRows = parseCSV(text)
    }

    if (!brandSlug) {
      return NextResponse.json({ error: 'brand_slug is required' }, { status: 400 })
    }

    if (csvRows.length === 0) {
      return NextResponse.json({ error: 'No data provided or CSV is empty' }, { status: 400 })
    }

    const validationErrors = validateCSVRows(csvRows)
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'CSV validation failed', details: validationErrors }, { status: 400 })
    }

    const rows = csvRows.map((r) => ({
      date: r.Date,
      location: r.Location,
      revenue: r.Revenue,
      grossSales: r.GrossSales,
      count: r.Count,
    }))

    const result = await insertKitchenSales(brandSlug, rows)

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: [],
      message: `Successfully imported ${result.imported} rows. ${result.skipped} duplicates skipped.`,
    })
  } catch (error: any) {
    console.error('[CSV Import API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import CSV' },
      { status: 500 }
    )
  }
}

function parseCSV(csvText: string): DeliverectCSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const headerMap: Record<string, number> = {}
  headers.forEach((header, index) => {
    headerMap[header.trim().toLowerCase()] = index
  })

  const dateIndex = headerMap['date'] ?? -1
  const revenueIndex = headerMap['revenue'] ?? -1
  const grossSalesIndex = headerMap['grosssales'] ?? headerMap['gross sales'] ?? -1
  const countIndex = headerMap['count'] ?? -1
  const locationIndex = headerMap['location'] ?? -1

  if (dateIndex === -1 || revenueIndex === -1 || countIndex === -1 || locationIndex === -1) {
    throw new Error('CSV missing required columns: Date, Revenue, Count, Location')
  }

  const rows: DeliverectCSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const date = values[dateIndex]?.trim() || ''
    const rawRevenue = values[revenueIndex]?.trim() || ''
    const rawCount = values[countIndex]?.trim() || ''
    const location = values[locationIndex]?.trim() || ''

    // Skip rows with no revenue data — Deliverect always includes today with blank values
    if (!rawRevenue && !rawCount) continue

    const revenue = parseFloat(rawRevenue || '0')
    const grossSales = grossSalesIndex >= 0 ? parseFloat(values[grossSalesIndex]?.trim() || '0') : revenue
    const count = parseInt(rawCount || '0', 10)

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

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function validateCSVRows(rows: DeliverectCSVRow[]): string[] {
  const errors: string[] = []
  rows.forEach((row, index) => {
    if (!row.Date) errors.push(`Row ${index + 1}: Missing Date`)
    if (!row.Location) errors.push(`Row ${index + 1}: Missing Location`)
    if (row.Revenue === undefined || isNaN(row.Revenue)) errors.push(`Row ${index + 1}: Invalid Revenue`)
    if (row.Count === undefined || isNaN(row.Count) || row.Count < 0) errors.push(`Row ${index + 1}: Invalid Count`)
    if (row.Date && !/^\d{4}-\d{2}-\d{2}$/.test(row.Date)) {
      errors.push(`Row ${index + 1}: Invalid date format (expected YYYY-MM-DD): ${row.Date}`)
    }
  })
  return errors
}
