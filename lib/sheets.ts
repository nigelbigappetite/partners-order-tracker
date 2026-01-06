import { google } from 'googleapis';
import { Order, OrderLine, SKU, Franchise, Supplier, Brand } from './types';

// Initialize Google Sheets API client
let sheetsClient: any = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  // Check if credentials are configured
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

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

// Brand to Store URL mapping
function getBrandStoreUrl(brand: string): string {
  const brandLower = (brand || '').trim().toLowerCase();
  
  const urlMap: Record<string, string> = {
    'smsh bn': 'https://fax0ch-it.myshopify.com/',
    'smsh-bn': 'https://fax0ch-it.myshopify.com/',
    'eggs n stuff': 'https://kebuxd-ca.myshopify.com/',
    'eggsnstuff': 'https://kebuxd-ca.myshopify.com/',
    'eggs-n-stuff': 'https://kebuxd-ca.myshopify.com/',
    'wing shack co': 'https://wingshackco.store/',
    'wingshackco': 'https://wingshackco.store/',
    'wing-shack-co': 'https://wingshackco.store/',
  };
  
  return urlMap[brandLower] || '';
}

// Column name mapping from sheet headers to TypeScript properties
const columnMapping: Record<string, Record<string, string>> = {
  'Orders_Header': {
    'orderId': 'orderId',
    'Order ID': 'orderId',
    'Invoice No': 'invoiceNo',
    'invoiceNo': 'invoiceNo',
    'Invoice Number': 'invoiceNo',
    'invoiceNumber': 'invoiceNo',
    'Brand': 'brand',
    'brand': 'brand',
    'Franchisee': 'franchisee',
    'Franchisee Name': 'franchisee',
    'Franchisee Code': 'franchiseeCode',
    'Order Date': 'orderDate',
    'orderDate': 'orderDate',
    'Order Stage': 'orderStage',
    'orderStage': 'orderStage',
    'Supplier Ordered?': 'supplierOrdered',
    'supplierOrdered': 'supplierOrdered',
    'Supplier Shipped?': 'supplierShipped',
    'supplierShipped': 'supplierShipped',
    'Delivered to Partner?': 'deliveredToPartner',
    'deliveredToPartner': 'deliveredToPartner',
    'Partner Paid?': 'partnerPaid',
    'partnerPaid': 'partnerPaid',
    'Order Total': 'orderTotal',
    'Total Order Value': 'orderTotal',
    'Total COGS': 'totalCOGS',
    'totalCOGS': 'totalCOGS',
    'Gross Profit': 'grossProfit',
    'grossProfit': 'grossProfit',
    'Gross Margin %': 'grossMargin',
    'grossMargin': 'grossMargin',
    'Gross Margin': 'grossMargin',
    'Days Open': 'daysOpen',
    'Next Action': 'nextAction',
  },
  'Order_Lines': {
    'Order ID': 'orderId',
    'orderId': 'orderId',
    'OrderID': 'orderId',
    'Brand': 'brand',
    'brand': 'brand',
    'Order Store URL': 'orderStoreUrl',
    'Order Store': 'orderStoreUrl',
    'Store URL': 'orderStoreUrl',
    'orderStoreUrl': 'orderStoreUrl',
    'Order Date': 'orderDate',
    'orderDate': 'orderDate',
    'Franchisee Code': 'franchiseeCode',
    'Franchise Code': 'franchiseeCode',
    'franchiseeCode': 'franchiseeCode',
    'Franchisee Name': 'franchiseeName',
    'franchiseeName': 'franchiseeName',
    'City': 'city',
    'city': 'city',
    'Product Name': 'productName',
    'productName': 'productName',
    'Product': 'productName',
    'SKU': 'sku',
    'sku': 'sku',
    'Quantity': 'quantity',
    'quantity': 'quantity',
    'Qty': 'quantity',
    'Unit Price (selling price)': 'unitPrice',
    'unitPrice': 'unitPrice',
    'Unit Price': 'unitPrice',
    'Price': 'unitPrice',
    'Line Total': 'lineTotal',
    'lineTotal': 'lineTotal',
    'Total': 'lineTotal',
    'Supplier': 'supplier',
    'supplier': 'supplier',
    'Invoice No': 'invoiceNo',
    'invoiceNo': 'invoiceNo',
    'Invoice Number': 'invoiceNo',
    'invoiceNumber': 'invoiceNo',
    'COGS per Unit': 'cogsPerUnit',
    'cogsPerUnit': 'cogsPerUnit',
    'COGS Per Unit': 'cogsPerUnit',
    'Cost Per Unit': 'cogsPerUnit',
    'COGS Total': 'cogsTotal',
    'cogsTotal': 'cogsTotal',
    'Total COGS': 'cogsTotal',
    'Gross Profit': 'grossProfit',
    'grossProfit': 'grossProfit',
    'Gross Margin %': 'grossMargin',
    'Gross Margin': 'grossMargin',
    'grossMargin': 'grossMargin',
  },
  'SKU_COGS': {
    'SKU': 'sku',
    'sku': 'sku',
    'Product Name': 'productName',
    'productName': 'productName',
    'Product': 'productName',
    'Unit Size': 'unitSize',
    'unitSize': 'unitSize',
    'Size': 'unitSize',
    'Cost Per Unit': 'costPerUnit',
    'costPerUnit': 'costPerUnit',
    'Cost': 'costPerUnit',
    'Supplier': 'supplier',
    'supplier': 'supplier',
    'Selling Price': 'sellingPrice',
    'sellingPrice': 'sellingPrice',
    'Price': 'sellingPrice',
    'Selling': 'sellingPrice',
  },
  'Company_Earnings': {
    // Metric mappings
    'Metric': 'metric',
    'metric': 'metric',
    'Value': 'value',
    'value': 'value',
    'Period': 'period',
    'period': 'period',
    'Revenue': 'revenue',
    'revenue': 'revenue',
    'COGS': 'cogs',
    'cogs': 'cogs',
    'Cost of Goods Sold': 'cogs',
    'Gross Profit': 'grossProfit',
    'grossProfit': 'grossProfit',
    'Gross Margin %': 'grossMargin',
    'grossMargin': 'grossMargin',
    'Gross Margin': 'grossMargin',
  },
  'Franchise_Summary': {
    // Franchise Code mappings
    'Franchisee Code': 'code',
    'code': 'code',
    'Code': 'code',
    'Franchise Code': 'code',
    'FranchiseeCode': 'code',
    
    // Franchise Name mappings
    'Franchisee Name': 'name',
    'name': 'name',
    'Name': 'name',
    'Franchise Name': 'name',
    'FranchiseeName': 'name',
    
    // Brand/Region mappings
    'Brand': 'brand',
    'brand': 'brand',
    'Region': 'region',
    'region': 'region',
    
    // Additional columns
    'Orders Count': 'ordersCount',
    'ordersCount': 'ordersCount',
    'Orders_Count': 'ordersCount',
    'Total Revenue': 'totalRevenue',
    'totalRevenue': 'totalRevenue',
    'Total_Revenue': 'totalRevenue',
    'Last Order Date': 'lastOrderDate',
    'lastOrderDate': 'lastOrderDate',
    'Last_Order_Date': 'lastOrderDate',
  },
  'Brand_Summary': {
    // Brand Name mappings
    'Brand': 'name',
    'brand': 'name',
    'Brand Name': 'name',
    'name': 'name',
    'Name': 'name',
    
    // Additional columns
    'Orders Count': 'ordersCount',
    'ordersCount': 'ordersCount',
    'Orders_Count': 'ordersCount',
    'Total Revenue': 'totalRevenue',
    'totalRevenue': 'totalRevenue',
    'Total_Revenue': 'totalRevenue',
    'Total COGS': 'totalCOGS',
    'totalCOGS': 'totalCOGS',
    'Total_COGS': 'totalCOGS',
    'Gross Profit': 'grossProfit',
    'grossProfit': 'grossProfit',
    'Gross_Profit': 'grossProfit',
    'Gross Margin %': 'grossMargin',
    'grossMargin': 'grossMargin',
    'Gross_Margin': 'grossMargin',
    'Gross Margin': 'grossMargin',
    'Last Order Date': 'lastOrderDate',
    'lastOrderDate': 'lastOrderDate',
    'Last_Order_Date': 'lastOrderDate',
  },
  'Brand_Auth': {
    'Brand Name': 'brandName',
    'brandName': 'brandName',
    'Brand': 'brandName',
    'Name': 'brandName',
    'Slug': 'slug',
    'slug': 'slug',
    'Password': 'password',
    'password': 'password',
  },
  'Supplier_Summary': {
    // Supplier Name mappings
    'Supplier': 'name',
    'supplier': 'name',
    'Supplier Name': 'name',
    'name': 'name',
    'Name': 'name',
    'Company': 'name',
    'Company Name': 'name',
    'Vendor': 'name',
    'Vendor Name': 'name',
    
    // On-Time Percentage mappings
    'On-Time %': 'onTimePercentage',
    'onTimePercentage': 'onTimePercentage',
    'On Time Percentage': 'onTimePercentage',
    'On-Time Percentage': 'onTimePercentage',
    'On Time %': 'onTimePercentage',
    'OnTime%': 'onTimePercentage',
    'On-Time%': 'onTimePercentage',
    'On Time': 'onTimePercentage',
    'On-Time': 'onTimePercentage',
    'OnTime': 'onTimePercentage',
    'Delivery Performance': 'onTimePercentage',
    'On-Time Delivery': 'onTimePercentage',
    'On-Time Delivery %': 'onTimePercentage',
    
    // Average Ship Time mappings
    'Avg Ship Time': 'averageShipTime',
    'averageShipTime': 'averageShipTime',
    'Average Ship Time': 'averageShipTime',
    'Avg Shipping Time': 'averageShipTime',
    'Average Shipping Time': 'averageShipTime',
    'Ship Time': 'averageShipTime',
    'Shipping Time': 'averageShipTime',
    'Avg Days': 'averageShipTime',
    'Average Days': 'averageShipTime',
    'Days to Ship': 'averageShipTime',
    'Days to Deliver': 'averageShipTime',
    'Lead Time': 'averageShipTime',
    'Average Lead Time': 'averageShipTime',
    
    // Additional columns from actual sheet
    'Orders_Count': 'ordersCount',
    'ordersCount': 'ordersCount',
    'Orders Count': 'ordersCount',
    'Total_Items': 'totalItems',
    'totalItems': 'totalItems',
    'Total Items': 'totalItems',
    'Total_Revenue': 'totalValueOrdered',
    'totalRevenue': 'totalValueOrdered',
    'Total Revenue': 'totalValueOrdered',
    'Last_Order_Date': 'lastOrderDate',
    'lastOrderDate': 'lastOrderDate',
    'Last Order Date': 'lastOrderDate',
  },
};

// Helper to normalize column names (case-insensitive, trim whitespace, remove special chars)
function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to find mapped key for a column header
function findMappedKey(header: string, mapping: Record<string, string>): string | null {
  const normalized = normalizeColumnName(header);
  
  // Try exact match first
  for (const [sheetCol, tsProp] of Object.entries(mapping)) {
    if (normalizeColumnName(sheetCol) === normalized) {
      return tsProp;
    }
  }
  
  // Try case-insensitive match
  const headerLower = header.trim().toLowerCase();
  for (const [sheetCol, tsProp] of Object.entries(mapping)) {
    if (sheetCol.trim().toLowerCase() === headerLower) {
      return tsProp;
    }
  }
  
  // Try partial match (header contains mapping key or vice versa)
  for (const [sheetCol, tsProp] of Object.entries(mapping)) {
    const sheetColNormalized = normalizeColumnName(sheetCol);
    if (normalized.includes(sheetColNormalized) || sheetColNormalized.includes(normalized)) {
      return tsProp;
    }
  }
  
  return null;
}

// Helper to find column index with fuzzy matching
function findColumnIndex(headers: string[], targetName: string): number {
  const normalized = normalizeColumnName(targetName);
  const exact = headers.findIndex((h) => normalizeColumnName(h) === normalized);
  if (exact !== -1) return exact;
  
  // Try case-insensitive match
  const lower = targetName.trim().toLowerCase();
  const caseInsensitive = headers.findIndex((h) => h.trim().toLowerCase() === lower);
  if (caseInsensitive !== -1) return caseInsensitive;
  
  // Try partial match
  const partial = headers.findIndex((h) => normalizeColumnName(h).includes(normalized) || normalized.includes(normalizeColumnName(h)));
  return partial;
}

// Helper to convert rows to objects
function rowsToObjects<T>(rows: any[][], headers: string[], sheetName?: string): T[] {
  if (!rows || rows.length === 0) return [];
  
  const mapping = sheetName ? columnMapping[sheetName] || {} : {};
  const unmappedColumns: string[] = [];
  
  // Log unmapped columns in development (only once per sheet)
  if (process.env.NODE_ENV === 'development' && sheetName) {
    headers.forEach((header) => {
      const mappedKey = findMappedKey(header, mapping);
      if (!mappedKey && !unmappedColumns.includes(header)) {
        unmappedColumns.push(header);
      }
    });
    if (unmappedColumns.length > 0) {
      console.log(`[Sheets] Unmapped columns in ${sheetName}:`, unmappedColumns);
    }
  }
  
  return rows.map((row) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      const value = row[index];
      const mappedKey = findMappedKey(header, mapping);
      
      // Use mapped key if found, otherwise use normalized header name
      const key = mappedKey || header.trim().replace(/[^a-zA-Z0-9]/g, '_');
      
      // Skip if value is undefined or null
      if (value === undefined || value === null) {
        obj[key] = '';
        return;
      }
      
      // Convert string booleans to actual booleans (handle YES/NO, TRUE/FALSE, true/false)
      if (
        value === 'TRUE' || 
        value === 'true' || 
        value === true ||
        value === 'YES' ||
        value === 'Yes' ||
        value === 'yes' ||
        value === 'Y' ||
        value === 'y'
      ) {
        obj[key] = true;
      } else if (
        value === 'FALSE' || 
        value === 'false' || 
        value === false ||
        value === 'NO' ||
        value === 'No' ||
        value === 'no' ||
        value === 'N' ||
        value === 'n'
      ) {
        obj[key] = false;
      } else if (typeof value === 'number') {
        obj[key] = value;
      } else if (value && !isNaN(Number(value)) && value !== '' && key !== 'orderId' && !key.toLowerCase().includes('id') && !key.toLowerCase().includes('sku')) {
        // Convert string numbers to numbers (but not IDs or SKUs which might have prefixes)
        const numValue = Number(value);
        // Only convert if it's a reasonable number (not NaN, not Infinity)
        if (!isNaN(numValue) && isFinite(numValue)) {
          obj[key] = numValue;
        } else {
          obj[key] = value;
        }
      } else {
        obj[key] = value || '';
      }
    });
    return obj as T;
  });
}

// Helper to get headers and data rows
async function getSheetData(sheetName: string) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return { headers: [], data: [] };

  const headers = rows[0];
  const data = rows.slice(1);
  return { headers, data };
}

// ORDERS_HEADER operations
export async function getOrders(): Promise<Order[]> {
  try {
    const { headers, data } = await getSheetData('Orders_Header');
    if (!headers || headers.length === 0) {
      throw new Error('Orders_Header sheet is empty or has no headers');
    }
    const orders = rowsToObjects<Order>(data, headers, 'Orders_Header');
    
    // Validate required fields and normalize franchisee field
    const ordersWithDefaults = orders.map((order: any) => {
      // Normalize franchisee field - try multiple possible column names
      const franchisee = order.franchisee || 
                        order['Franchisee Name'] || 
                        order['Franchisee'] || 
                        order['Franchisee Code'] ||
                        order.franchiseeCode ||
                        ''
      
      // Extract financial metrics from Orders_Header
      const orderTotal = Number(order.orderTotal || order['Total Order Value'] || 0)
      const totalCOGS = Number(order.totalCOGS || order['Total COGS'] || 0)
      const grossProfit = Number(order.grossProfit || order['Gross Profit'] || 0)
      const grossMargin = Number(order.grossMargin || order['Gross Margin %'] || order['Gross Margin'] || 0)
      
      return {
        ...order,
        orderId: order.orderId || '',
        invoiceNo: order.invoiceNo || order['Invoice No'] || order.InvoiceNo || '',
        brand: (order.brand || '').trim(),
        franchisee: (franchisee || '').trim(), // Normalize franchisee field
        orderDate: order.orderDate || new Date().toISOString().split('T')[0],
        orderStage: order.orderStage || 'New',
        orderTotal: orderTotal,
        totalCOGS: isNaN(totalCOGS) ? undefined : totalCOGS,
        grossProfit: isNaN(grossProfit) ? undefined : grossProfit,
        grossMargin: isNaN(grossMargin) ? undefined : grossMargin,
        daysOpen: Number(order.daysOpen || 0),
        nextAction: order.nextAction || '',
        supplierOrdered: order.supplierOrdered ?? false,
        supplierShipped: order.supplierShipped ?? false,
        deliveredToPartner: order.deliveredToPartner ?? false,
        partnerPaid: order.partnerPaid ?? false,
      }
    });
    
    return ordersWithDefaults;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const orders = await getOrders();
    
    // Normalize orderId for matching - remove all #, trim whitespace, case-insensitive
    const normalizeOrderId = (id: string): string => {
      if (!id) return '';
      return String(id).replace(/#/g, '').trim().toLowerCase();
    };
    
    const searchOrderId = normalizeOrderId(orderId);
    
    // Try exact match first
    let order = orders.find((o) => o.orderId === orderId);
    
    // If not found, try normalized match
    if (!order) {
      order = orders.find((o) => {
        const normalized = normalizeOrderId(o.orderId);
        return normalized === searchOrderId;
      });
    }
    
    // If still not found, try matching numeric part
    if (!order && searchOrderId) {
      const searchNum = searchOrderId.replace(/\D/g, '');
      if (searchNum) {
        order = orders.find((o) => {
          const normalized = normalizeOrderId(o.orderId);
          const orderNum = normalized.replace(/\D/g, '');
          return orderNum === searchNum;
        });
      }
    }
    
    return order || null;
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    throw error;
  }
}

export async function updateOrderStatus(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    const { headers, data } = await getSheetData('Orders_Header');
    
    // Reverse mapping from TypeScript property to sheet column
    const reverseMapping: Record<string, string> = {};
    Object.entries(columnMapping['Orders_Header'] || {}).forEach(([sheetCol, tsProp]) => {
      reverseMapping[tsProp] = sheetCol;
    });
    
    // Find the row index of the order
    const orderIdIndex = findColumnIndex(headers, 'Order ID');
    if (orderIdIndex === -1) {
      throw new Error('Order ID column not found in sheet');
    }
    
    const rowIndex = data.findIndex((row: any) => row[orderIdIndex] === orderId);
    if (rowIndex === -1) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Helper to convert column index to A1 notation
    const getColumnLetter = (colIndex: number): string => {
      let result = '';
      while (colIndex >= 0) {
        result = String.fromCharCode(65 + (colIndex % 26)) + result;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return result;
    };

    // Build update values
    const updateValues: any[] = [];
    Object.entries(updates).forEach(([tsKey, value]) => {
      const sheetColumn = reverseMapping[tsKey] || tsKey;
      const colIndex = findColumnIndex(headers, sheetColumn);
      if (colIndex !== -1) {
        const colLetter = getColumnLetter(colIndex);
        updateValues.push({
          range: `Orders_Header!${colLetter}${rowIndex + 2}`,
          values: [[value]],
        });
      }
    });

    if (updateValues.length === 0) {
      throw new Error('No valid columns to update');
    }

    // Batch update
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateValues,
      },
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// ORDER_LINES operations
export async function getAllOrderLines(): Promise<OrderLine[]> {
  try {
    const { headers, data } = await getSheetData('Order_Lines');
    if (!headers || headers.length === 0) {
      throw new Error('Order_Lines sheet is empty or has no headers');
    }
    
    console.log(`[getAllOrderLines] Order_Lines sheet: ${data.length} rows`);
    console.log(`[getAllOrderLines] All headers (${headers.length}):`, headers);
    
    // Find which column index has invoice number
    const invoiceNoIndex = headers.findIndex((h: string) => 
      h && (h.toLowerCase().includes('invoice') || h.toLowerCase().includes('inv'))
    );
    console.log(`[getAllOrderLines] Invoice number column: index ${invoiceNoIndex}, header: "${headers[invoiceNoIndex] || 'NOT FOUND'}"`);
    
    const allLines = rowsToObjects<OrderLine>(data, headers, 'Order_Lines');
    
    console.log(`[getAllOrderLines] Parsed ${allLines.length} order lines from sheet`);
    
    // Check if invoice numbers are being read
    if (allLines.length > 0) {
      const sampleWithInvoice = allLines.slice(0, 5).map((l: any, idx: number) => ({
        index: idx,
        orderId: l.orderId || l['Order ID'] || 'N/A',
        invoiceNo: l.invoiceNo || l['Invoice No'] || l.InvoiceNo || l['Invoice Number'] || 'MISSING',
        hasInvoiceNo: !!(l.invoiceNo || l['Invoice No'] || l.InvoiceNo || l['Invoice Number']),
        allKeys: Object.keys(l).filter(k => k.toLowerCase().includes('invoice') || k.toLowerCase().includes('inv')),
      }));
      console.log(`[getAllOrderLines] Sample lines with invoice check:`, sampleWithInvoice);
    }
    
    // Validate and map
    const validLines = allLines
      .filter((line: any, index: number) => {
        // Include lines that have orderId OR invoiceNo (check multiple possible column names)
        const hasOrderId = line.orderId || line['Order ID'] || line.OrderID || line['OrderID'];
        const hasInvoiceNo = line.invoiceNo || line['Invoice No'] || line.InvoiceNo || line['Invoice Number'];
        if (!hasOrderId && !hasInvoiceNo && index < 3) {
          console.log(`Line ${index} missing both orderId and invoiceNo:`, Object.keys(line).slice(0, 5));
        }
        return !!(hasOrderId || hasInvoiceNo); // Include if orderId or invoiceNo exists
      })
      .map((line: any) => {
        // Normalize order ID (remove ALL #, trim) - must match getOrderLines normalization
        const rawOrderId = line.orderId || line['Order ID'] || line.OrderID || line['OrderID'] || ''
        const normalizedOrderId = rawOrderId.toString().replace(/#/g, '').trim()
        
        // Extract numeric values with validation
        const quantity = Number(line.quantity || line.Quantity || line.Qty || 0)
        const unitPrice = Number(line.unitPrice || line['Unit Price'] || line.Price || 0)
        const lineTotal = Number(line.lineTotal || line['Line Total'] || line.Total || 0)
        const cogsPerUnit = Number(line.cogsPerUnit || line['COGS per Unit'] || line['COGS Per Unit'] || line['Cost Per Unit'] || 0)
        const cogsTotal = Number(line.cogsTotal || line['COGS Total'] || line['Total COGS'] || 0)
        
        // Calculate cogsTotal if missing but cogsPerUnit and quantity are available
        const calculatedCogsTotal = cogsTotal || (cogsPerUnit > 0 && quantity > 0 ? cogsPerUnit * quantity : 0)
        
        return {
          ...line,
          orderId: normalizedOrderId,
          invoiceNo: (line.invoiceNo || line['Invoice No'] || line.InvoiceNo || line['Invoice Number'] || '').toString().replace(/#/g, '').trim(),
          brand: (line.brand || line.Brand || '').toString().trim(),
          sku: (line.sku || line.SKU || '').toString().trim(),
          productName: (line.productName || line['Product Name'] || line.Product || '').toString().trim(),
          quantity: isNaN(quantity) ? 0 : quantity,
          unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
          lineTotal: isNaN(lineTotal) ? 0 : lineTotal,
          supplier: (line.supplier || line.Supplier || '').toString().trim(),
          cogsPerUnit: isNaN(cogsPerUnit) ? 0 : cogsPerUnit,
          cogsTotal: isNaN(calculatedCogsTotal) ? 0 : calculatedCogsTotal,
        }
      });
    
    console.log(`Valid order lines after filtering: ${validLines.length}`);
    if (validLines.length > 0) {
      console.log('Sample order IDs:', validLines.slice(0, 3).map((l: any) => l.orderId));
    }
    
    return validLines;
  } catch (error) {
    console.error('Error fetching all order lines:', error);
    throw error;
  }
}

export async function getOrderLines(orderId: string, invoiceNo?: string, brand?: string): Promise<OrderLine[]> {
  try {
    const allLines = await getAllOrderLines();
    
    // Normalize invoice number for matching (remove ALL #, trim whitespace, case-insensitive)
    const normalizeInvoiceNo = (inv: string): string => {
      if (!inv) return '';
      return String(inv).replace(/#/g, '').trim().toLowerCase();
    };
    
    // Normalize orderId for matching - remove ALL # (handles ##1005), trim whitespace, case-insensitive
    const normalizeOrderId = (id: string): string => {
      if (!id) return '';
      return String(id).replace(/#/g, '').trim().toLowerCase();
    };
    
    // Normalize brand for matching (trim whitespace, case-insensitive)
    const normalizeBrand = (b: string): string => {
      if (!b) return '';
      return String(b).trim().toLowerCase();
    };
    
    // If invoiceNo is provided, use it for matching (preferred method)
    const searchInvoiceNo = invoiceNo ? normalizeInvoiceNo(invoiceNo) : '';
    const searchOrderId = normalizeOrderId(orderId);
    const searchBrand = brand ? normalizeBrand(brand) : '';
    
    console.log(`[getOrderLines] Searching for order lines with orderId: "${orderId}", invoiceNo: "${invoiceNo || 'N/A'}", brand: "${brand || 'N/A'}"`);
    console.log(`[getOrderLines] Total lines available: ${allLines.length}`);
    
    // Show sample of first few lines for debugging
    if (allLines.length > 0) {
      console.log(`[getOrderLines] Sample lines (first 3):`, allLines.slice(0, 3).map((l: any) => ({
        orderId: l.orderId || l['Order ID'] || 'N/A',
        invoiceNo: l.invoiceNo || l['Invoice No'] || 'N/A',
        brand: l.brand || l.Brand || 'N/A',
        productName: l.productName || l['Product Name'] || 'N/A',
      })));
    }
    
    // SIMPLIFIED: Match by invoice number if available, otherwise by order ID
    // Don't filter by brand - just get all lines for this order
    const validLines = allLines
      .filter((line: any) => {
        const lineInvoiceNo = normalizeInvoiceNo(line.invoiceNo || line['Invoice No'] || line.InvoiceNo || line['Invoice Number'] || '');
        const lineOrderIdRaw = line.orderId || line['Order ID'] || line.OrderID || line['OrderID'] || '';
        const lineOrderId = normalizeOrderId(lineOrderIdRaw);
        
        // Strategy 1: Match by invoice number (most reliable, unique per order)
        if (searchInvoiceNo && lineInvoiceNo && lineInvoiceNo === searchInvoiceNo) {
          console.log(`[getOrderLines] ✓ Matched by invoiceNo: "${lineInvoiceNo}"`);
          return true;
        }
        
        // Strategy 2: Match by order ID (normalized, numeric part)
        if (lineOrderId && searchOrderId) {
          // Try exact normalized match
          if (lineOrderId === searchOrderId) {
            console.log(`[getOrderLines] ✓ Matched by orderId: "${lineOrderIdRaw}" -> "${lineOrderId}"`);
            return true;
          }
          
          // Try numeric part match
          const lineNum = lineOrderId.replace(/\D/g, '');
          const searchNum = searchOrderId.replace(/\D/g, '');
          if (lineNum && searchNum && lineNum === searchNum) {
            console.log(`[getOrderLines] ✓ Matched by numeric part: "${lineNum}"`);
            return true;
          }
        }
        
        return false;
      })
      .map((line: any) => ({
        ...line,
        orderId: line.orderId || line['Order ID'] || line.OrderID || line['OrderID'] || orderId,
        invoiceNo: line.invoiceNo || line['Invoice No'] || line.InvoiceNo || line['Invoice Number'] || invoiceNo || '',
        sku: line.sku || line.SKU || '',
        productName: line.productName || line['Product Name'] || line.Product || '',
        quantity: line.quantity || line.Quantity || line.Qty || 0,
        unitPrice: line.unitPrice || line['Unit Price'] || line.Price || 0,
        lineTotal: line.lineTotal || line['Line Total'] || line.Total || 0,
        supplier: line.supplier || line.Supplier || '',
        cogsPerUnit: line.cogsPerUnit || line['COGS per Unit'] || line['COGS Per Unit'] || line['Cost Per Unit'] || 0,
        cogsTotal: line.cogsTotal || line['COGS Total'] || line['Total COGS'] || 0,
      }));
    
    console.log(`[getOrderLines] ✓ Found ${validLines.length} order lines for orderId: "${orderId}", invoiceNo: "${invoiceNo || 'N/A'}", brand: "${brand || 'N/A'}"`);
    if (validLines.length === 0 && allLines.length > 0) {
      console.log(`[getOrderLines] ⚠ No matches found! Sample data from first 5 lines:`, allLines.slice(0, 5).map((l: any) => ({
        orderId: l.orderId || l['Order ID'] || 'N/A',
        orderIdNormalized: normalizeOrderId(l.orderId || l['Order ID'] || ''),
        invoiceNo: l.invoiceNo || l['Invoice No'] || 'N/A',
        invoiceNoNormalized: normalizeInvoiceNo(l.invoiceNo || l['Invoice No'] || ''),
        brand: l.brand || l.Brand || 'N/A',
        brandNormalized: normalizeBrand(l.brand || l.Brand || ''),
      })));
      console.log(`[getOrderLines] Search criteria:`, {
        searchOrderId,
        searchInvoiceNo: searchInvoiceNo || 'N/A',
        searchBrand: searchBrand || 'N/A',
      });
    }
    
    return validLines;
  } catch (error) {
    console.error('Error fetching order lines:', error);
    throw error;
  }
}

// SKU_COGS operations
export async function getSKUs(): Promise<SKU[]> {
  try {
    const { headers, data } = await getSheetData('SKU_COGS');
    if (!headers || headers.length === 0) {
      throw new Error('SKU_COGS sheet is empty or has no headers');
    }
    const skus = rowsToObjects<SKU>(data, headers, 'SKU_COGS');
    
    // Validate required fields
    const skusWithDefaults = skus.map((sku: any) => ({
      ...sku,
      sku: sku.sku || '',
      productName: sku.productName || sku.Product || '',
      unitSize: sku.unitSize || sku.Size || '',
      costPerUnit: sku.costPerUnit || sku.Cost || 0,
      supplier: sku.supplier || '',
      sellingPrice: sku.sellingPrice || sku.Price || sku.Selling || 0,
    }));
    
    return skusWithDefaults;
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    throw error;
  }
}

// FRANCHISE_SUMMARY operations
export async function getFranchises(): Promise<Franchise[]> {
  try {
    const { headers, data } = await getSheetData('Franchise_Summary');
    if (!headers || headers.length === 0) {
      throw new Error('Franchise_Summary sheet is empty or has no headers');
    }
    const franchises = rowsToObjects<Franchise>(data, headers, 'Franchise_Summary');
    
    // Validate and map with normalization
    const franchisesWithDefaults = franchises.map((franchise: any) => {
      const code = (franchise.code || franchise['Franchisee Code'] || franchise['Franchise Code'] || '').toString().trim()
      const name = (franchise.name || franchise['Franchisee Name'] || franchise['Franchise Name'] || '').toString().trim()
      
      return {
        ...franchise,
        code: code,
        name: name,
        brand: (franchise.brand || franchise.Brand || '').toString().trim(),
        region: (franchise.region || franchise.Region || '').toString().trim(),
        ordersCount: Number(franchise.ordersCount || franchise['Orders Count'] || franchise['Orders_Count'] || 0),
        totalRevenue: Number(franchise.totalRevenue || franchise['Total Revenue'] || franchise['Total_Revenue'] || 0),
        lastOrderDate: (franchise.lastOrderDate || franchise['Last Order Date'] || franchise['Last_Order_Date'] || '').toString().trim(),
      }
    }).filter((f: any) => f.code || f.name); // Filter out franchises without code or name
    
    return franchisesWithDefaults;
  } catch (error) {
    console.error('Error fetching franchises:', error);
    throw error;
  }
}

// COMPANY_EARNINGS operations
export interface CompanyEarnings {
  metric?: string;
  value?: number | string;
  period?: string;
  revenue?: number;
  cogs?: number;
  grossProfit?: number;
  grossMargin?: number;
  [key: string]: any;
}

export async function getCompanyEarnings(): Promise<CompanyEarnings[]> {
  try {
    const { headers, data } = await getSheetData('Company_Earnings');
    if (!headers || headers.length === 0) {
      throw new Error('Company_Earnings sheet is empty or has no headers');
    }
    
    // Find column indices
    const metricIndex = headers.findIndex((h: string) => 
      h && (h.toLowerCase().includes('metric') || h.toLowerCase().includes('name'))
    )
    const valueIndex = headers.findIndex((h: string) => 
      h && h.toLowerCase().includes('value')
    )
    const revenueIndex = headers.findIndex((h: string) => 
      h && h.toLowerCase().includes('revenue')
    )
    const cogsIndex = headers.findIndex((h: string) => 
      h && h.toLowerCase().includes('cogs') || h.toLowerCase().includes('cost')
    )
    const grossProfitIndex = headers.findIndex((h: string) => 
      h && (h.toLowerCase().includes('gross profit') || h.toLowerCase().includes('profit'))
    )
    const grossMarginIndex = headers.findIndex((h: string) => 
      h && h.toLowerCase().includes('margin')
    )
    const periodIndex = headers.findIndex((h: string) => 
      h && h.toLowerCase().includes('period')
    )
    
    // Process rows - create objects for each metric
    const earnings: CompanyEarnings[] = []
    
    data.forEach((row: any[]) => {
      const metric = metricIndex >= 0 ? (row[metricIndex] || '').trim() : ''
      const value = valueIndex >= 0 ? row[valueIndex] : undefined
      const revenue = revenueIndex >= 0 ? row[revenueIndex] : undefined
      const cogs = cogsIndex >= 0 ? row[cogsIndex] : undefined
      const grossProfit = grossProfitIndex >= 0 ? row[grossProfitIndex] : undefined
      const grossMargin = grossMarginIndex >= 0 ? row[grossMarginIndex] : undefined
      const period = periodIndex >= 0 ? row[periodIndex] : undefined
      
      // Helper to parse number
      const parseNumber = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined
        if (typeof val === 'number') return val
        const cleaned = String(val).replace(/[£$,\s%]/g, '')
        const num = Number(cleaned)
        return isNaN(num) ? undefined : num
      }
      
      // Create earnings object
      const earning: CompanyEarnings = {}
      if (metric) earning.metric = metric
      if (value !== undefined) earning.value = parseNumber(value) ?? value
      if (revenue !== undefined) earning.revenue = parseNumber(revenue)
      if (cogs !== undefined) earning.cogs = parseNumber(cogs)
      if (grossProfit !== undefined) earning.grossProfit = parseNumber(grossProfit)
      if (grossMargin !== undefined) earning.grossMargin = parseNumber(grossMargin)
      if (period) earning.period = String(period)
      
      // Only add if there's meaningful data
      if (metric || earning.revenue !== undefined || earning.value !== undefined) {
        earnings.push(earning)
      }
    })
    
    return earnings;
  } catch (error) {
    console.error('Error fetching company earnings:', error);
    throw error;
  }
}

// BRAND_SUMMARY operations
export async function getBrands(): Promise<Brand[]> {
  try {
    const { headers, data } = await getSheetData('Brand_Summary');
    if (!headers || headers.length === 0) {
      throw new Error('Brand_Summary sheet is empty or has no headers');
    }
    const brands = rowsToObjects<Brand>(data, headers, 'Brand_Summary');
    
    // Validate and ensure required fields
    const brandsWithDefaults = brands.map((brand: any) => {
      const name = (brand.name || brand.Brand || brand['Brand Name'] || '').toString().trim()
      const totalRevenue = Number(brand.totalRevenue || brand['Total Revenue'] || brand['Total_Revenue'] || 0)
      const totalCOGS = Number(brand.totalCOGS || brand['Total COGS'] || brand['Total_COGS'] || 0)
      
      // Calculate GP if not provided
      const grossProfit = brand.grossProfit !== undefined 
        ? Number(brand.grossProfit || brand['Gross Profit'] || brand['Gross_Profit'] || 0)
        : (totalRevenue - totalCOGS)
      
      // Calculate Gross Margin % if not provided
      const grossMargin = brand.grossMargin !== undefined
        ? Number(brand.grossMargin || brand['Gross Margin %'] || brand['Gross_Margin'] || 0)
        : (totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0)
      
      return {
        ...brand,
        name: name,
        ordersCount: Number(brand.ordersCount || brand['Orders Count'] || brand['Orders_Count'] || 0),
        totalRevenue: totalRevenue,
        totalCOGS: totalCOGS,
        grossProfit: grossProfit,
        grossMargin: isNaN(grossMargin) || !isFinite(grossMargin) ? 0 : grossMargin,
        lastOrderDate: (brand.lastOrderDate || brand['Last Order Date'] || brand['Last_Order_Date'] || '').toString().trim(),
      }
    }).filter((b: any) => b.name); // Only include brands with a name
    
    return brandsWithDefaults;
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
}

// BRAND_AUTH operations
export interface BrandAuthData {
  brandName: string;
  slug: string;
  password: string;
}

export async function getBrandAuth(slug: string): Promise<BrandAuthData | null> {
  try {
    const { headers, data } = await getSheetData('Brand_Auth');
    if (!headers || headers.length === 0) {
      throw new Error('Brand_Auth sheet is empty or has no headers');
    }
    
    const authRecords = rowsToObjects<BrandAuthData>(data, headers, 'Brand_Auth');
    
    // Find brand by slug
    const brandAuth = authRecords.find((auth: any) => {
      const authSlug = (auth.slug || auth.Slug || '').toString().trim().toLowerCase();
      return authSlug === slug.toLowerCase();
    });
    
    if (!brandAuth) {
      return null;
    }
    
    return {
      brandName: ((brandAuth as any).brandName || (brandAuth as any)['Brand Name'] || (brandAuth as any).Brand || '').toString().trim(),
      slug: ((brandAuth as any).slug || (brandAuth as any).Slug || '').toString().trim().toLowerCase(),
      password: ((brandAuth as any).password || (brandAuth as any).Password || '').toString().trim(),
    };
  } catch (error) {
    console.error('Error fetching brand auth:', error);
    return null;
  }
}

export async function getAllBrandAuth(): Promise<BrandAuthData[]> {
  try {
    console.log('[getAllBrandAuth] Starting fetch...');
    console.log('[getAllBrandAuth] SPREADSHEET_ID:', SPREADSHEET_ID ? 'Set' : 'Missing');
    console.log('[getAllBrandAuth] Service account email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Missing');
    console.log('[getAllBrandAuth] Private key:', process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Missing');
    
    const { headers, data } = await getSheetData('Brand_Auth');
    console.log('[getAllBrandAuth] Headers found:', headers?.length || 0);
    console.log('[getAllBrandAuth] Data rows:', data?.length || 0);
    
    if (!headers || headers.length === 0) {
      throw new Error('Brand_Auth sheet is empty or has no headers');
    }
    
    const authRecords = rowsToObjects<BrandAuthData>(data, headers, 'Brand_Auth');
    console.log('[getAllBrandAuth] Parsed records:', authRecords.length);
    
    const filtered = authRecords
      .map((auth: any) => ({
        brandName: (auth.brandName || auth['Brand Name'] || auth.Brand || '').toString().trim(),
        slug: (auth.slug || auth.Slug || '').toString().trim().toLowerCase(),
        password: (auth.password || auth.Password || '').toString().trim(),
      }))
      .filter((auth) => auth.brandName && auth.slug); // Only include valid records
    
    console.log('[getAllBrandAuth] Filtered records:', filtered.length);
    return filtered;
  } catch (error: any) {
    console.error('[getAllBrandAuth] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Re-throw the error so the API route can handle it properly
    throw new Error(`Failed to fetch brand auth: ${error.message}`);
  }
}

// SUPPLIER_SUMMARY operations
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const { headers, data } = await getSheetData('Supplier_Summary');
    if (!headers || headers.length === 0) {
      throw new Error('Supplier_Summary sheet is empty or has no headers');
    }
    const suppliers = rowsToObjects<Supplier>(data, headers, 'Supplier_Summary');
    
    // Validate and ensure required fields
    const suppliersWithDefaults = suppliers.map((supplier: any) => ({
      ...supplier,
      name: supplier.name || supplier.Supplier || supplier['Supplier Name'] || '',
      // Use Total Revenue from sheet as totalValueOrdered (will be overridden by order lines calculation if available)
      totalValueOrdered: supplier.totalValueOrdered || supplier['Total Revenue'] || supplier.Total_Revenue || 0,
      // Parse onTimePercentage - handle percentage strings like "85%" or "85"
      onTimePercentage: supplier.onTimePercentage !== undefined 
        ? (typeof supplier.onTimePercentage === 'string' 
          ? parseFloat(supplier.onTimePercentage.replace('%', '')) 
          : Number(supplier.onTimePercentage))
        : undefined,
      // Parse averageShipTime - ensure it's a number
      averageShipTime: supplier.averageShipTime !== undefined
        ? (typeof supplier.averageShipTime === 'string'
          ? parseFloat(supplier.averageShipTime.replace('days', '').replace('day', '').trim())
          : Number(supplier.averageShipTime))
        : undefined,
      // Store additional fields
      ordersCount: supplier.ordersCount || supplier['Orders Count'] || supplier.Orders_Count || 0,
      totalItems: supplier.totalItems || supplier['Total Items'] || supplier.Total_Items || 0,
      lastOrderDate: supplier.lastOrderDate || supplier['Last Order Date'] || supplier.Last_Order_Date || '',
    })).filter((s: any) => s.name); // Only include suppliers with a name
    
    return suppliersWithDefaults;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
}

// CREATE ORDER
export async function createOrder(orderData: {
  orderId: string;
  invoiceNo?: string;
  brand: string;
  franchisee: string;
  franchiseeCode?: string;
  city?: string;
  orderDate: string;
  orderStage: string;
  orderTotal: number;
  orderLines: Omit<OrderLine, 'orderId'>[];
}): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    
    // Get headers for Orders_Header
    const { headers: orderHeaders } = await getSheetData('Orders_Header');
    
    // Build order row using column mapping
    const orderRow = orderHeaders.map((header: string) => {
      const normalized = normalizeColumnName(header);
      const mapping = columnMapping['Orders_Header'] || {};
      const mappedKey = Object.entries(mapping).find(([k]) => normalizeColumnName(k) === normalized)?.[1];
      
      if (mappedKey === 'orderId') return orderData.orderId;
      if (mappedKey === 'invoiceNo') return orderData.invoiceNo || '';
      if (mappedKey === 'brand') return orderData.brand;
      if (mappedKey === 'franchisee') return orderData.franchisee;
      if (mappedKey === 'orderDate') return orderData.orderDate;
      if (mappedKey === 'orderStage') return orderData.orderStage;
      if (mappedKey === 'orderTotal') return orderData.orderTotal;
      if (mappedKey === 'supplierOrdered') return false;
      if (mappedKey === 'supplierShipped') return false;
      if (mappedKey === 'deliveredToPartner') return false;
      if (mappedKey === 'partnerPaid') return false;
      if (mappedKey === 'daysOpen') return 0;
      if (mappedKey === 'nextAction') return 'Review Order';
      return '';
    });

    // Append order to Orders_Header
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Orders_Header!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [orderRow],
      },
    });

    // Get headers for Order_Lines
    const { headers: lineHeaders } = await getSheetData('Order_Lines');
    
    // Fetch SKUs to get COGS data
    const skus = await getSKUs();
    const skuMap = new Map<string, SKU>();
    skus.forEach((sku) => {
      if (sku.sku) {
        skuMap.set(sku.sku.trim().toLowerCase(), sku);
      }
    });
    
    // Get brand store URL
    const orderStoreUrl = getBrandStoreUrl(orderData.brand);
    
    // Extract city from franchisee name if not provided
    const city = orderData.city || (() => {
      const franchisee = orderData.franchisee || '';
      const parts = franchisee.split(/[-–—]/).map(part => part.trim());
      return parts.length > 1 ? parts[parts.length - 1] : franchisee.trim();
    })();
    
    // Build order lines rows using column mapping
    const lineMapping = columnMapping['Order_Lines'] || {};
    const lineRows = orderData.orderLines.map((line) => {
      // Find SKU to get COGS data
      const sku = skuMap.get(line.sku.trim().toLowerCase());
      const cogsPerUnit = sku?.costPerUnit || 0;
      const cogsTotal = cogsPerUnit * (line.quantity || 0);
      const grossProfit = (line.lineTotal || 0) - cogsTotal;
      const grossMargin = (line.lineTotal || 0) > 0 
        ? (grossProfit / (line.lineTotal || 1)) * 100 
        : 0;
      
      return lineHeaders.map((header: string) => {
        const normalized = normalizeColumnName(header);
        const mappedKey = Object.entries(lineMapping).find(([k]) => normalizeColumnName(k) === normalized)?.[1];
        
        if (mappedKey === 'orderId') return orderData.orderId;
        if (mappedKey === 'brand') return orderData.brand;
        if (mappedKey === 'orderStoreUrl') return orderStoreUrl;
        if (mappedKey === 'orderDate') return orderData.orderDate;
        if (mappedKey === 'franchiseeCode') return orderData.franchiseeCode || '';
        if (mappedKey === 'franchiseeName') return orderData.franchisee;
        if (mappedKey === 'city') return city;
        if (mappedKey === 'productName') return line.productName;
        if (mappedKey === 'sku') return line.sku;
        if (mappedKey === 'quantity') return line.quantity;
        if (mappedKey === 'unitPrice') return line.unitPrice;
        if (mappedKey === 'lineTotal') return line.lineTotal;
        if (mappedKey === 'supplier') return line.supplier;
        if (mappedKey === 'invoiceNo') return orderData.invoiceNo || '';
        if (mappedKey === 'cogsPerUnit') return cogsPerUnit;
        if (mappedKey === 'cogsTotal') return cogsTotal;
        if (mappedKey === 'grossProfit') return grossProfit;
        if (mappedKey === 'grossMargin') return grossMargin;
        return '';
      });
    });

    // Append order lines
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Order_Lines!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: lineRows,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

