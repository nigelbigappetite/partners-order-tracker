import { google } from 'googleapis';

// Hardcoded column mappings for safety
export const ORDERS_HEADER_COLUMNS = {
  INVOICE_NO: 'H',      // Lookup key
  ORDER_STAGE: 'L',
  PARTNER_PAID: 'P',
  PARTNER_PAID_DATE: 'Q',
  PARTNER_PAYMENT_METHOD: 'R',
  PARTNER_PAYMENT_REF: 'S',  // Optional
} as const;

export const SUPPLIER_INVOICES_COLUMNS = {
  INVOICE_NO: 'A',      // Lookup key
  PAID: 'G',
  PAID_DATE: 'H',
  PAYMENT_REFERENCE: 'I',  // Optional
} as const;

// Order stage allowlist
export const ALLOWED_ORDER_STAGES = [
  'New',
  'Ordered with Supplier',
  'In Transit',
  'Delivered',
  'Completed',
  'Cancelled'
] as const;

// Payment method options
export const ALLOWED_PAYMENT_METHODS = [
  'SHOPIFY',
  'BANK_TRANSFER',
  'CASH',
  'OTHER'
] as const;

// Get spreadsheet ID from environment (same as lib/sheets.ts)
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

// Get sheets client (reuse from lib/sheets.ts pattern)
let sheetsClient: any = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Google Sheets API credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your .env.local file.'
    );
  }

  if (!SPREADSHEET_ID) {
    throw new Error(
      'Google Sheets Spreadsheet ID not configured. Please set GOOGLE_SHEETS_SPREADSHEET_ID in your .env.local file.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Get sheet values for a given range
 */
export async function getSheetValues(
  sheetName: string,
  range: string
): Promise<any[][]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`[getSheetValues] Error reading ${sheetName}!${range}:`, error);
    throw error;
  }
}

/**
 * Find row index by value in a specific column
 * Returns 0-based index (data row, excluding header)
 * Returns -1 if not found
 */
export async function findRowIndexByValue(
  sheetName: string,
  columnLetter: string,
  value: string
): Promise<number> {
  try {
    // Normalize the search value (remove #, trim, lowercase)
    const normalizeValue = (val: string): string => {
      return String(val).replace(/#/g, '').trim().toLowerCase();
    };

    const searchValue = normalizeValue(value);

    // Read the entire column (skip header row)
    const range = `${columnLetter}:${columnLetter}`;
    const values = await getSheetValues(sheetName, range);

    // Skip header row (index 0), search from index 1
    for (let i = 1; i < values.length; i++) {
      const cellValue = values[i]?.[0];
      if (cellValue && normalizeValue(String(cellValue)) === searchValue) {
        // Return 0-based index (i - 1 because we skipped header)
        return i - 1;
      }
    }

    return -1;
  } catch (error) {
    console.error(`[findRowIndexByValue] Error finding row in ${sheetName} column ${columnLetter}:`, error);
    throw error;
  }
}

/**
 * Update specific cells in a row
 * @param sheetName - Name of the sheet
 * @param rowIndex - 0-based row index (data row, excluding header)
 * @param updates - Array of {col: column letter, value: value to write}
 */
export async function updateRowCells(
  sheetName: string,
  rowIndex: number,
  updates: Array<{ col: string; value: any }>
): Promise<void> {
  try {
    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    const sheets = await getSheetsClient();

    // Convert 0-based data index to 1-based sheet row (add 1 for header, add 1 for 1-based indexing)
    const sheetRow = rowIndex + 2;

    // Build update values
    const updateValues = updates.map(({ col, value }) => ({
      range: `${sheetName}!${col}${sheetRow}`,
      values: [[value]],
    }));

    console.log(`[updateRowCells] Updating ${sheetName} row ${sheetRow}:`, {
      rowIndex,
      sheetRow,
      updates: updates.map(u => ({ col: u.col, value: u.value })),
    });

    // Batch update
    const result = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateValues,
      },
    });

    console.log(`[updateRowCells] Successfully updated ${sheetName} row ${sheetRow}:`, {
      updatedRanges: result.data.responses?.map((r: any) => r.updatedRange),
      totalUpdatedCells: result.data.totalUpdatedCells,
    });
  } catch (error: any) {
    console.error(`[updateRowCells] Error updating ${sheetName} row ${rowIndex}:`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Validate order stage is in allowlist
 */
export function validateOrderStage(stage: string): boolean {
  return ALLOWED_ORDER_STAGES.includes(stage as any);
}

/**
 * Validate payment method is in allowlist
 */
export function validatePaymentMethod(method: string): boolean {
  return ALLOWED_PAYMENT_METHODS.includes(method as any);
}

