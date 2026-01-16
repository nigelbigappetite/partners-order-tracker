import { NextResponse } from 'next/server'
import { getKitchenSales, getKitchenMappings, matchLocationToFranchise } from '@/lib/sheets'
import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''

async function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets API credentials not configured')
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

// This endpoint refreshes the Franchise Code column (F) for existing rows
// by looking up locations in Kitchen_Mapping and writing franchise codes directly
export async function POST() {
  try {
    const sheets = await getSheetsClient()
    const sales = await getKitchenSales()
    
    if (sales.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sales data to refresh',
        updated: 0,
      })
    }
    
    // Get all rows from the sheet to match by date and location
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Kitchen_Sales!A2:L10000', // Get data rows (skip header)
    })
    
    const rows = response.data.values || []
    
    // Get mappings for lookup
    const mappings = await getKitchenMappings()
    const mappingMap = new Map<string, string>()
    mappings.forEach((m) => {
      if (m.active && m.franchiseCode) {
        mappingMap.set(m.location.trim().toLowerCase(), m.franchiseCode)
        mappingMap.set(m.location.trim(), m.franchiseCode)
      }
    })
    
    const updates: any[] = []
    let updatedCount = 0
    
    // Process each row and update franchise code if needed
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 2) continue // Need at least date and location
      
      const date = row[0]?.toString().trim()
      const location = row[1]?.toString().trim()
      const currentFranchiseCode = row[5]?.toString().trim() || '' // Column F (index 5)
      
      if (!date || !location) continue
      
      // Try to find franchise code
      const normalizedLocation = location.toLowerCase()
      const franchiseCode = mappingMap.get(normalizedLocation) || 
                            mappingMap.get(location) ||
                            await matchLocationToFranchise(location)
      
      // Update if we found a franchise code and it's different from current
      if (franchiseCode && franchiseCode !== currentFranchiseCode) {
        const rowNumber = i + 2 // +2 because: +1 for header, +1 for 0-based index
        updates.push({
          range: `Kitchen_Sales!F${rowNumber}`,
          values: [[franchiseCode]],
        })
        updatedCount++
      }
    }
    
    if (updates.length > 0) {
      // Batch update in chunks of 100 (Google Sheets API limit)
      for (let i = 0; i < updates.length; i += 100) {
        const chunk = updates.slice(i, i + 100)
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: chunk,
          },
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated Franchise Code column for ${updatedCount} rows based on Kitchen_Mapping.`,
      updated: updatedCount,
    })
  } catch (error: any) {
    console.error('[Refresh Franchise Codes] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to refresh franchise codes',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
