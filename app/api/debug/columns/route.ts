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
    const { searchParams } = new URL(request.url)
    const sheetName = searchParams.get('sheet') || 'Orders_Header'
    
    const sheets = await getSheetsClient()
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z1`, // Just get the header row
    })

    const headers = response.data.values?.[0] || []
    
    return NextResponse.json({
      sheetName,
      headers,
      headerCount: headers.length,
      message: `Found ${headers.length} columns in ${sheetName}`,
    })
  } catch (error: any) {
    console.error('Error fetching columns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch columns' },
      { status: 500 }
    )
  }
}

