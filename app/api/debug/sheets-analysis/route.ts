import { NextResponse } from 'next/server'
import { google } from 'googleapis'

async function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets API credentials not configured')
  }

  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    throw new Error('Google Sheets Spreadsheet ID not configured')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

export async function GET(request: Request) {
  try {
    const sheets = await getSheetsClient()
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    
    // Get all sheets in the spreadsheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    })
    
    const allSheets = spreadsheet.data.sheets?.map((sheet: any) => ({
      title: sheet.properties?.title,
      sheetId: sheet.properties?.sheetId,
      index: sheet.properties?.index,
    })) || []
    
    // Analyze specific sheets we care about
    const sheetsToAnalyze = [
      'Order_Supplier_Allocations',
      'Supplier_Invoices',
      'Payments_Tracker_View',
    ]
    
    const analysis: any = {
      allSheets: allSheets,
      targetSheets: {},
      issues: [],
      recommendations: [],
    }
    
    for (const sheetName of sheetsToAnalyze) {
      const sheetInfo: any = {
        exists: false,
        exactName: null,
        headers: [],
        rowCount: 0,
        errors: [],
        testRanges: {},
      }
      
      // Check if sheet exists (exact match)
      const exactMatch = allSheets.find((s: any) => s.title === sheetName)
      if (exactMatch) {
        sheetInfo.exists = true
        sheetInfo.exactName = exactMatch.title
      } else {
        // Check for similar names (case-insensitive, spaces, etc.)
        const similar = allSheets.find((s: any) => 
          s.title?.toLowerCase().replace(/\s+/g, '_') === sheetName.toLowerCase()
        )
        if (similar) {
          sheetInfo.exists = true
          sheetInfo.exactName = similar.title
          analysis.issues.push({
            sheet: sheetName,
            issue: `Sheet name mismatch: Expected "${sheetName}" but found "${similar.title}"`,
            severity: 'warning',
          })
        } else {
          analysis.issues.push({
            sheet: sheetName,
            issue: `Sheet "${sheetName}" not found in spreadsheet`,
            severity: 'error',
          })
        }
      }
      
      if (sheetInfo.exists && sheetInfo.exactName) {
        // Try to read the sheet with different range formats
        const testRanges = [
          { name: 'A:ZZ', range: `${sheetInfo.exactName}!A:ZZ` },
          { name: 'sheet name only', range: sheetInfo.exactName },
          { name: 'quoted sheet name', range: `'${sheetInfo.exactName}'` },
          { name: 'A1:Z1 (headers)', range: `${sheetInfo.exactName}!A1:Z1` },
        ]
        
        for (const testRange of testRanges) {
          try {
            const response = await sheets.spreadsheets.values.get({
              spreadsheetId: SPREADSHEET_ID,
              range: testRange.range,
            })
            
            const rows = response.data.values || []
            sheetInfo.testRanges[testRange.name] = {
              success: true,
              rowCount: rows.length,
              firstRowColumns: rows[0]?.length || 0,
            }
            
            if (testRange.name === 'A1:Z1 (headers)' || rows.length > 0) {
              sheetInfo.headers = rows[0] || []
              sheetInfo.rowCount = rows.length
            }
          } catch (error: any) {
            sheetInfo.testRanges[testRange.name] = {
              success: false,
              error: error.message || String(error),
            }
            sheetInfo.errors.push({
              range: testRange.name,
              error: error.message || String(error),
            })
          }
        }
        
        // Check for special characters in sheet name that might cause issues
        if (sheetInfo.exactName.includes(' ') || sheetInfo.exactName.includes("'") || sheetInfo.exactName.includes('"')) {
          analysis.issues.push({
            sheet: sheetName,
            issue: `Sheet name "${sheetInfo.exactName}" contains special characters that may cause parsing issues`,
            severity: 'warning',
          })
        }
      }
      
      analysis.targetSheets[sheetName] = sheetInfo
    }
    
    // Generate recommendations
    if (analysis.issues.some((i: any) => i.severity === 'error')) {
      analysis.recommendations.push('Fix missing sheets or rename existing sheets to match expected names')
    }
    
    if (analysis.issues.some((i: any) => i.severity === 'warning' && i.issue.includes('mismatch'))) {
      analysis.recommendations.push('Update sheet names to match exactly (case-sensitive): Order_Supplier_Allocations, Supplier_Invoices')
    }
    
    const hasRangeErrors = Object.values(analysis.targetSheets).some((sheet: any) => 
      sheet.errors && sheet.errors.length > 0
    )
    if (hasRangeErrors) {
      analysis.recommendations.push('Some range formats are failing - check sheet structure and ensure headers are in row 1')
    }
    
    return NextResponse.json(analysis, { status: 200 })
  } catch (error: any) {
    console.error('Error analyzing sheets:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to analyze sheets',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

