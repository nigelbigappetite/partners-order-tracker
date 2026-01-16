import { NextResponse } from 'next/server'
import { getKitchenMappings, getFranchises } from '@/lib/sheets'
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

// GET - List all mappings
export async function GET() {
  try {
    const mappings = await getKitchenMappings()
    return NextResponse.json({ mappings })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mappings' },
      { status: 500 }
    )
  }
}

// POST - Create new mapping
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { location, franchiseCode, franchiseName, active = true, notes } = body

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      )
    }
    
    // Franchise code is optional - can be added later
    const finalFranchiseCode = franchiseCode || ''

    const sheets = await getSheetsClient()
    
    // Get current data to find next row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Kitchen_Mapping!A:A',
    })
    
    const numExistingRows = response.data.values ? response.data.values.length : 1
    const nextRow = numExistingRows + 1
    
    // Insert new row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Kitchen_Mapping!A${nextRow}:E${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          location,
          finalFranchiseCode,
          franchiseName || '',
          active ? 'YES' : 'NO',
          notes || '',
        ]],
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Mapping created successfully',
    })
  } catch (error: any) {
    console.error('[Create Mapping] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create mapping' },
      { status: 500 }
    )
  }
}
