import { google } from 'googleapis';
import { Order, OrderLine, SKU, Franchise, Supplier, Brand, PaymentTrackerRow, SupplierInvoice, OrderSupplierAllocation } from './types';

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
    'Active Brands': 'brand',
    'ActiveBrands': 'brand',
    'activeBrands': 'brand',
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
  'Payments_Tracker_View': {
    'Sales Invoice No': 'sales_invoice_no',
    'sales_invoice_no': 'sales_invoice_no',
    'Sales Invoice Number': 'sales_invoice_no',
    'Invoice No': 'sales_invoice_no',
    'Brand': 'brand',
    'brand': 'brand',
    'Franchisee Name': 'franchisee_name',
    'franchisee_name': 'franchisee_name',
    'Franchisee': 'franchisee_name',
    'Order Date': 'order_date',
    'order_date': 'order_date',
    'Total Order Value': 'total_order_value',
    'total_order_value': 'total_order_value',
    'Order Total': 'total_order_value',
    'Partner Paid?': 'partner_paid',
    'partner_paid': 'partner_paid',
    'Partner Paid': 'partner_paid',
    'Partner Paid Date': 'partner_paid_date',
    'partner_paid_date': 'partner_paid_date',
    'Partner Payment Method': 'partner_payment_method',
    'partner_payment_method': 'partner_payment_method',
    'Partner Payment Ref': 'partner_payment_ref',
    'partner_payment_ref': 'partner_payment_ref',
    'Funds Cleared?': 'funds_cleared',
    'funds_cleared': 'funds_cleared',
    'Funds Cleared': 'funds_cleared',
    'Cleared Date': 'cleared_date',
    'cleared_date': 'cleared_date',
    'Supplier Invoices Count': 'supplier_invoices_count',
    'supplier_invoices_count': 'supplier_invoices_count',
    'Supplier Unpaid Count': 'supplier_unpaid_count',
    'supplier_unpaid_count': 'supplier_unpaid_count',
    'Supplier Allocated Total': 'supplier_allocated_total',
    'supplier_allocated_total': 'supplier_allocated_total',
    'Supplier Side Paid?': 'supplier_side_paid',
    'supplier_side_paid': 'supplier_side_paid',
    'Supplier Payment Ready?': 'supplier_payment_ready',
    'supplier_payment_ready': 'supplier_payment_ready',
    'Settlement Status': 'settlement_status',
    'settlement_status': 'settlement_status',
  },
  'Supplier_Invoices': {
    'Invoice No': 'invoice_no',
    'invoice_no': 'invoice_no',
    'Invoice Number': 'invoice_no',
    'Sales Invoice No': 'sales_invoice_no',
    'sales_invoice_no': 'sales_invoice_no',
    'Supplier': 'supplier',
    'supplier': 'supplier',
    'Amount': 'amount',
    'amount': 'amount',
    'Paid?': 'paid',
    'paid': 'paid',
    'Paid': 'paid',
    'Paid Date': 'paid_date',
    'paid_date': 'paid_date',
    'Payment Reference': 'payment_reference',
    'payment_reference': 'payment_reference',
    'Payment Ref': 'payment_reference',
    'Invoice File Link': 'invoice_file_link',
    'invoice_file_link': 'invoice_file_link',
    'File Link': 'invoice_file_link',
    'Drive Link': 'invoice_file_link',
  },
  'Order_Supplier_Allocations': {
    'Sales Invoice No': 'sales_invoice_no',
    'sales_invoice_no': 'sales_invoice_no',
    'Supplier Invoice No': 'supplier_invoice_no',
    'supplier_invoice_no': 'supplier_invoice_no',
    'Allocated Amount': 'allocated_amount',
    'allocated_amount': 'allocated_amount',
    'Amount': 'allocated_amount',
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
  
  // Clean sheet name - remove any existing range notation
  const cleanSheetName = sheetName.split('!')[0];
  
  // Try multiple approaches in order of preference
  const attempts = [
    { range: `${cleanSheetName}!A:ZZ`, description: 'A:ZZ range' },
    { range: cleanSheetName, description: 'sheet name only' },
    { range: `'${cleanSheetName}'`, description: 'quoted sheet name' },
  ];
  
  let lastError: any = null;
  
  for (const attempt of attempts) {
    try {
      console.log(`[getSheetData] Attempting to read ${cleanSheetName} using ${attempt.description}: ${attempt.range}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: attempt.range,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log(`[getSheetData] Sheet ${cleanSheetName} is empty`);
        return { headers: [], data: [] };
      }

      const headers = rows[0];
      const data = rows.slice(1);
      console.log(`[getSheetData] Successfully read ${cleanSheetName}: ${data.length} rows using ${attempt.description}`);
      return { headers, data };
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || String(error);
      console.warn(`[getSheetData] Failed to read ${cleanSheetName} using ${attempt.description} (${attempt.range}):`, errorMsg);
      
      // If it's not a range parsing error, don't try other methods
      if (!errorMsg.includes('parse range') && 
          !errorMsg.includes('Unable to parse') &&
          !errorMsg.includes('Invalid value') &&
          !errorMsg.includes('INVALID_ARGUMENT')) {
        console.error(`[getSheetData] Non-range error for ${cleanSheetName}, stopping attempts:`, errorMsg);
        throw error;
      }
      // Continue to next attempt
    }
  }
  
  // All attempts failed - return empty data instead of throwing
  // This prevents the entire payments table from crashing
  console.error(`[getSheetData] All attempts failed for ${cleanSheetName}. Last error:`, lastError?.message || 'Unknown error');
  console.warn(`[getSheetData] Returning empty data for ${cleanSheetName} to prevent crash`);
  return { headers: [], data: [] };
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

// Get order by invoice number (primary identifier - unique across brands)
export async function getOrderByInvoiceNo(invoiceNo: string): Promise<Order | null> {
  try {
    const orders = await getOrders();
    
    // Normalize invoice number for matching - remove all #, trim whitespace, case-insensitive
    const normalizeInvoiceNo = (inv: string): string => {
      if (!inv) return '';
      return String(inv).replace(/#/g, '').trim().toLowerCase();
    };
    
    const searchInvoiceNo = normalizeInvoiceNo(invoiceNo);
    
    // Try exact match first
    let order = orders.find((o) => {
      const orderInvoiceNo = o.invoiceNo || '';
      return normalizeInvoiceNo(String(orderInvoiceNo)) === searchInvoiceNo;
    });
    
    // If not found, try normalized match
    if (!order) {
      order = orders.find((o) => {
        const orderInvoiceNo = o.invoiceNo || '';
        const normalized = normalizeInvoiceNo(String(orderInvoiceNo));
        return normalized === searchInvoiceNo;
      });
    }
    
    return order || null;
  } catch (error) {
    console.error('Error fetching order by invoice number:', error);
    throw error;
  }
}

// Get order by order ID (for backward compatibility - may return multiple if duplicates exist)
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
    console.log('[updateOrderStatus] Starting status update:', {
      orderId,
      updates,
    });

    const sheets = await getSheetsClient();
    const { headers, data } = await getSheetData('Orders_Header');
    
    // Normalize orderId for matching - remove all #, trim whitespace, case-insensitive
    // This matches the normalization used in getOrderById
    const normalizeOrderId = (id: string): string => {
      return String(id).replace(/#/g, '').trim().toLowerCase();
    };
    
    const searchOrderId = normalizeOrderId(orderId);
    console.log('[updateOrderStatus] Normalized search orderId:', searchOrderId);
    
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
    
    console.log('[updateOrderStatus] Searching for order in', data.length, 'rows');
    const rowIndex = data.findIndex((row: any) => {
      const rowOrderId = row[orderIdIndex];
      const normalizedRowOrderId = normalizeOrderId(String(rowOrderId || ''));
      const matches = normalizedRowOrderId === searchOrderId;
      if (matches) {
        console.log('[updateOrderStatus] Found matching order:', {
          rowIndex: data.indexOf(row),
          rawOrderId: rowOrderId,
          normalizedRowOrderId,
          searchOrderId,
        });
      }
      return matches;
    });
    
    if (rowIndex === -1) {
      console.error('[updateOrderStatus] Order not found. Searched orderIds:', 
        data.slice(0, 5).map((row: any) => ({
          raw: row[orderIdIndex],
          normalized: normalizeOrderId(String(row[orderIdIndex] || '')),
        }))
      );
      throw new Error(`Order ${orderId} not found`);
    }
    
    console.log('[updateOrderStatus] Order found at row index:', rowIndex, '(sheet row:', rowIndex + 2, ')');

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
        console.log('[updateOrderStatus] Adding update:', {
          property: tsKey,
          sheetColumn,
          columnIndex: colIndex,
          columnLetter: colLetter,
          sheetRow: rowIndex + 2,
          range: `Orders_Header!${colLetter}${rowIndex + 2}`,
          value,
        });
      } else {
        console.warn('[updateOrderStatus] Column not found for property:', tsKey, 'sheetColumn:', sheetColumn);
      }
    });

    if (updateValues.length === 0) {
      throw new Error('No valid columns to update');
    }

    console.log('[updateOrderStatus] Executing batch update with', updateValues.length, 'updates');

    // Batch update
    const updateResult = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateValues,
      },
    });
    
    console.log('[updateOrderStatus] Batch update successful:', {
      orderId,
      updatedRanges: updateResult.data.responses?.map((r: any) => r.updatedRange),
      totalUpdatedCells: updateResult.data.totalUpdatedCells,
    });
  } catch (error: any) {
    console.error('[updateOrderStatus] Error updating order status:', {
      orderId,
      updates,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    throw error;
  }
}

// DELETE ORDER
export async function deleteOrder(orderId: string): Promise<void> {
  try {
    console.log('[deleteOrder] Starting order deletion:', { orderId });

    const sheets = await getSheetsClient();
    
    // Normalize orderId for matching - same as updateOrderStatus
    const normalizeOrderId = (id: string): string => {
      return String(id).replace(/#/g, '').trim().toLowerCase();
    };
    
    const searchOrderId = normalizeOrderId(orderId);
    console.log('[deleteOrder] Normalized search orderId:', searchOrderId);

    // Delete from Orders_Header
    const { headers: orderHeaders, data: orderData } = await getSheetData('Orders_Header');
    const orderIdIndex = findColumnIndex(orderHeaders, 'Order ID');
    if (orderIdIndex === -1) {
      throw new Error('Order ID column not found in Orders_Header sheet');
    }

    const orderRowIndex = orderData.findIndex((row: any) => {
      const rowOrderId = row[orderIdIndex];
      const normalizedRowOrderId = normalizeOrderId(String(rowOrderId || ''));
      return normalizedRowOrderId === searchOrderId;
    });

    if (orderRowIndex !== -1) {
      const sheetRowNumber = orderRowIndex + 2; // +1 for header, +1 for 1-based indexing
      console.log('[deleteOrder] Deleting from Orders_Header at row:', sheetRowNumber);
      
      const ordersHeaderSheetId = await getSheetId('Orders_Header');
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: ordersHeaderSheetId,
                dimension: 'ROWS',
                startIndex: orderRowIndex + 1, // +1 because data array is 0-indexed but excludes header
                endIndex: orderRowIndex + 2,
              },
            },
          }],
        },
      });
      console.log('[deleteOrder] Successfully deleted from Orders_Header');
    } else {
      console.warn('[deleteOrder] Order not found in Orders_Header, continuing with Order_Lines deletion');
    }

    // Delete from Order_Lines
    const { headers: lineHeaders, data: lineData } = await getSheetData('Order_Lines');
    const lineOrderIdIndex = findColumnIndex(lineHeaders, 'Order ID');
    if (lineOrderIdIndex === -1) {
      throw new Error('Order ID column not found in Order_Lines sheet');
    }

    // Find all rows with this order ID (there can be multiple line items)
    const lineRowIndices: number[] = [];
    lineData.forEach((row: any, index: number) => {
      const rowOrderId = row[lineOrderIdIndex];
      const normalizedRowOrderId = normalizeOrderId(String(rowOrderId || ''));
      if (normalizedRowOrderId === searchOrderId) {
        lineRowIndices.push(index);
      }
    });

    if (lineRowIndices.length > 0) {
      console.log('[deleteOrder] Found', lineRowIndices.length, 'line items to delete');
      
      // Delete rows in reverse order to maintain correct indices
      const orderLinesSheetId = await getSheetId('Order_Lines');
      const deleteRequests = lineRowIndices.reverse().map((dataIndex) => ({
        deleteDimension: {
          range: {
            sheetId: orderLinesSheetId,
            dimension: 'ROWS',
            startIndex: dataIndex + 1, // +1 because data array is 0-indexed but excludes header
            endIndex: dataIndex + 2,
          },
        },
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: deleteRequests,
        },
      });
      console.log('[deleteOrder] Successfully deleted', lineRowIndices.length, 'rows from Order_Lines');
    } else {
      console.warn('[deleteOrder] No line items found for this order');
    }

    console.log('[deleteOrder] Order deletion completed successfully:', { orderId });
  } catch (error: any) {
    console.error('[deleteOrder] Error deleting order:', {
      orderId,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    throw error;
  }
}

// Helper to get sheet ID by name
async function getSheetId(sheetName: string): Promise<number> {
  const sheets = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  
  const sheet = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet.properties.sheetId;
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
    // Read from the new Franchisee_Master sheet, but reuse the existing
    // Franchise_Summary column mapping for compatibility.
    const { headers, data } = await getSheetData('Franchisee_Master');
    if (!headers || headers.length === 0) {
      throw new Error('Franchisee_Master sheet is empty or has no headers');
    }
    
    console.log('[getFranchises] Fetched from Franchisee_Master:', {
      headersCount: headers.length,
      dataRows: data.length,
      headers: headers.slice(0, 15) // Log first 15 headers
    });
    
    // Log raw data for first few rows to see structure
    if (data.length > 0) {
      console.log('[getFranchises] First 3 raw rows:', data.slice(0, 3));
    }
    
    const franchises = rowsToObjects<Franchise>(data, headers, 'Franchise_Summary');
    
    console.log('[getFranchises] Parsed franchises:', franchises.length);
    
    // Check for Wanstead in raw data
    const wansteadInRaw = data.find((row: any[]) => 
      row.some((cell: any) => 
        cell && cell.toString().toLowerCase().includes('wanstead')
      )
    );
    console.log('[getFranchises] Wanstead found in raw data:', !!wansteadInRaw);
    if (wansteadInRaw) {
      console.log('[getFranchises] Wanstead raw row:', wansteadInRaw);
    }
    
    // Validate and map with normalization
    const franchisesWithDefaults = franchises.map((franchise: any) => {
      const code = (franchise.code || franchise['Franchisee Code'] || franchise['Franchise Code'] || '').toString().trim()
      const name = (franchise.name || franchise['Franchisee Name'] || franchise['Franchise Name'] || '').toString().trim()
      
      // Check if this is Wanstead
      const isWanstead = name.toLowerCase().includes('wanstead') || code.toLowerCase().includes('wanstead');
      if (isWanstead) {
        console.log('[getFranchises] Found Wanstead in parsed data:', { code, name, franchise });
      }
      
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
    });
    
    // Log franchises before filtering
    console.log('[getFranchises] Before filtering:', franchisesWithDefaults.length, 'franchises');
    if (franchisesWithDefaults.length > 0) {
      console.log('[getFranchises] Sample franchises:', franchisesWithDefaults.slice(0, 5).map(f => ({
        code: f.code,
        name: f.name,
        brand: f.brand
      })));
    }
    
    // Check for Wanstead before filtering
    const wansteadBeforeFilter = franchisesWithDefaults.find((f: any) => 
      f.name?.toLowerCase().includes('wanstead') || f.code?.toLowerCase().includes('wanstead')
    );
    console.log('[getFranchises] Wanstead before filtering:', wansteadBeforeFilter);
    
    // Filter out franchises without code or name
    const filtered = franchisesWithDefaults.filter((f: any) => {
      const hasCodeOrName = !!(f.code || f.name);
      if (!hasCodeOrName) {
        console.log('[getFranchises] Filtered out franchise (no code or name):', f);
      }
      return hasCodeOrName;
    });
    
    // Check for Wanstead after filtering
    const wansteadAfterFilter = filtered.find((f: any) => 
      f.name?.toLowerCase().includes('wanstead') || f.code?.toLowerCase().includes('wanstead')
    );
    console.log('[getFranchises] Wanstead after filtering:', wansteadAfterFilter);
    
    console.log('[getFranchises] After filtering:', filtered.length, 'franchises');
    
    return filtered;
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
    
    // IMPORTANT: Orders_Header is completely self-populating via formulas
    // We do NOT write to Orders_Header - it automatically populates from Order_Lines
    // Only write to Order_Lines, and Orders_Header will update automatically
    
    // OPTIMIZATION: Removed header fetch - we write to fixed column positions, headers not needed

    // Get brand store URL for required Order Store URL column
    const orderStoreUrl = getBrandStoreUrl(orderData.brand);

    // CRITICAL FIX: Only write to columns that don't have formulas to avoid overwriting them
    // Columns with formulas (B, F, G, H, K, L, M) will be left untouched so formulas can populate them
    // We'll insert rows first, then write only to specific columns: A, C, D, E, I, J, N
    
    // First, get the sheet ID for Order_Lines
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const orderLinesSheet = spreadsheet.data.sheets?.find(
      (sheet: any) => sheet.properties?.title === 'Order_Lines'
    );
    if (!orderLinesSheet?.properties?.sheetId) {
      throw new Error('Order_Lines sheet not found');
    }
    const sheetId = orderLinesSheet.properties.sheetId;
    
    // Get the current last row to know where to insert
    // values.length includes the header row, so if length=101, we have header (row 1) + 100 data rows
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Order_Lines!A:A', // Just get column A to find the last row
    });
    
    const numExistingRows = currentData.data.values ? currentData.data.values.length : 1;
    // numExistingRows includes header, so last data row is at index (numExistingRows - 1) in 0-indexed
    // We want to insert after the last data row, so startIndex = numExistingRows (0-indexed)
    const numRowsToInsert = orderData.orderLines.length;
    const insertStartRow1Indexed = numExistingRows + 1; // 1-indexed for range notation (A2, A3, etc.)
    
    // Step 1: Insert the required number of rows
    // insertDimension uses 0-indexed: 0 = header row, 1 = first data row, etc.
    // We want to insert after the last existing row, so startIndex = numExistingRows
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: numExistingRows, // 0-indexed: insert after last existing row
                endIndex: numExistingRows + numRowsToInsert,
              },
            },
          },
        ],
      },
    });
    
    // Step 2: Write data only to columns without formulas (A, C, D, E, I, J, N)
    // Columns B, F, G, H, K, L, M will have their formulas preserved from the row above
    const dataUpdates: any[] = [];
    
    // Prepare data arrays for each column
    const orderIds: string[] = [];
    const storeUrls: string[] = [];
    const orderDates: string[] = [];
    const franchiseeCodes: string[] = [];
    const skus: string[] = [];
    const quantities: number[] = [];
    const invoiceNos: string[] = [];
    
    orderData.orderLines.forEach((line) => {
      orderIds.push(orderData.orderId);
      storeUrls.push(orderStoreUrl);
      orderDates.push(orderData.orderDate);
      franchiseeCodes.push(orderData.franchiseeCode || '');
      skus.push(line.sku);
      quantities.push(line.quantity);
      invoiceNos.push(orderData.invoiceNo || '');
    });
    
    // Add updates for each column (only columns without formulas)
    if (orderIds.length > 0) {
      dataUpdates.push({
        range: `Order_Lines!A${insertStartRow1Indexed}:A${insertStartRow1Indexed + orderIds.length - 1}`,
        values: orderIds.map(id => [id]),
      });
      dataUpdates.push({
        range: `Order_Lines!C${insertStartRow1Indexed}:C${insertStartRow1Indexed + storeUrls.length - 1}`,
        values: storeUrls.map(url => [url]),
      });
      dataUpdates.push({
        range: `Order_Lines!D${insertStartRow1Indexed}:D${insertStartRow1Indexed + orderDates.length - 1}`,
        values: orderDates.map(date => [date]),
      });
      dataUpdates.push({
        range: `Order_Lines!E${insertStartRow1Indexed}:E${insertStartRow1Indexed + franchiseeCodes.length - 1}`,
        values: franchiseeCodes.map(code => [code]),
      });
      dataUpdates.push({
        range: `Order_Lines!I${insertStartRow1Indexed}:I${insertStartRow1Indexed + skus.length - 1}`,
        values: skus.map(sku => [sku]),
      });
      dataUpdates.push({
        range: `Order_Lines!J${insertStartRow1Indexed}:J${insertStartRow1Indexed + quantities.length - 1}`,
        values: quantities.map(qty => [qty]),
      });
      dataUpdates.push({
        range: `Order_Lines!N${insertStartRow1Indexed}:N${insertStartRow1Indexed + invoiceNos.length - 1}`,
        values: invoiceNos.map(inv => [inv]),
      });
    }
    
    // Execute batch update - this will only write to the specified columns
    // Columns B, F, G, H, K, L, M (formula columns) will have their formulas preserved
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: dataUpdates,
      },
    });
  } catch (error: any) {
    console.error('[createOrder] Error creating order:', {
      orderId: orderData.orderId,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    throw error;
  }
}

// PAYMENTS_TRACKER_VIEW operations (read-only)
export async function getPaymentsTracker(): Promise<PaymentTrackerRow[]> {
  try {
    const { headers, data } = await getSheetData('Payments_Tracker_View');
    if (!headers || headers.length === 0) {
      throw new Error('Payments_Tracker_View sheet is empty or has no headers');
    }
    
    // Debug: Log headers to help identify column name mismatches
    if (process.env.NODE_ENV === 'development') {
      console.log('[getPaymentsTracker] Sheet headers:', headers);
      console.log('[getPaymentsTracker] Sample row (first 3 columns):', data[0]?.slice(0, 3));
    }
    
    const rows = rowsToObjects<PaymentTrackerRow>(data, headers, 'Payments_Tracker_View');
    
    // Debug: Log a sample row to see what we're getting
    if (process.env.NODE_ENV === 'development' && rows.length > 0) {
      console.log('[getPaymentsTracker] Sample parsed row keys:', Object.keys(rows[0]));
      console.log('[getPaymentsTracker] Sample row partner_paid value:', rows[0].partner_paid, typeof rows[0].partner_paid);
    }
    
    // Helper to convert value to boolean (handles YES/NO, true/false, etc.)
    const toBoolean = (value: any): boolean => {
      if (value === true || value === 'TRUE' || value === 'true' || value === 'YES' || value === 'Yes' || value === 'yes' || value === 'Y' || value === 'y') {
        return true;
      }
      if (value === false || value === 'FALSE' || value === 'false' || value === 'NO' || value === 'No' || value === 'no' || value === 'N' || value === 'n' || value === '' || value === null || value === undefined) {
        return false;
      }
      // If it's already a boolean, return it
      if (typeof value === 'boolean') {
        return value;
      }
      // Default to false for unknown values
      return false;
    };
    
    // Normalize and validate payment tracker rows
    const normalizedRows = rows.map((row: any) => {
      // Try to get partner_paid from multiple possible column names
      const partnerPaidValue = row.partner_paid !== undefined ? row.partner_paid :
                               row['Partner Paid?'] !== undefined ? row['Partner Paid?'] :
                               row['Partner Paid'] !== undefined ? row['Partner Paid'] :
                               row.partnerPaid !== undefined ? row.partnerPaid :
                               false;
      
      // Try to get funds_cleared from multiple possible column names
      const fundsClearedValue = row.funds_cleared !== undefined ? row.funds_cleared :
                                row['Funds Cleared?'] !== undefined ? row['Funds Cleared?'] :
                                row['Funds Cleared'] !== undefined ? row['Funds Cleared'] :
                                row.fundsCleared !== undefined ? row.fundsCleared :
                                false;
      
      // Try to get supplier_side_paid from multiple possible column names
      const supplierSidePaidValue = row.supplier_side_paid !== undefined ? row.supplier_side_paid :
                                    row['Supplier Side Paid?'] !== undefined ? row['Supplier Side Paid?'] :
                                    row['Supplier Side Paid'] !== undefined ? row['Supplier Side Paid'] :
                                    row.supplierSidePaid !== undefined ? row.supplierSidePaid :
                                    false;
      
      // Try to get supplier_payment_ready from multiple possible column names
      const supplierPaymentReadyValue = row.supplier_payment_ready !== undefined ? row.supplier_payment_ready :
                                       row['Supplier Payment Ready?'] !== undefined ? row['Supplier Payment Ready?'] :
                                       row['Supplier Payment Ready'] !== undefined ? row['Supplier Payment Ready'] :
                                       row.supplierPaymentReady !== undefined ? row.supplierPaymentReady :
                                       false;
      
      return {
        ...row,
        sales_invoice_no: (row.sales_invoice_no || row['Sales Invoice No'] || '').toString().trim(),
        brand: (row.brand || row.Brand || '').toString().trim(),
        franchisee_name: (row.franchisee_name || row['Franchisee Name'] || row.Franchisee || '').toString().trim(),
        order_date: (row.order_date || row['Order Date'] || '').toString().trim(),
        total_order_value: Number(row.total_order_value || row['Total Order Value'] || row['Order Total'] || 0),
        partner_paid: toBoolean(partnerPaidValue),
        partner_paid_date: (row.partner_paid_date || row['Partner Paid Date'] || '').toString().trim() || undefined,
        partner_payment_method: (row.partner_payment_method || row['Partner Payment Method'] || '').toString().trim() || undefined,
        partner_payment_ref: (row.partner_payment_ref || row['Partner Payment Ref'] || '').toString().trim() || undefined,
        funds_cleared: toBoolean(fundsClearedValue),
        cleared_date: (row.cleared_date || row['Cleared Date'] || '').toString().trim() || undefined,
        supplier_invoices_count: Number(row.supplier_invoices_count || row['Supplier Invoices Count'] || 0),
        supplier_unpaid_count: Number(row.supplier_unpaid_count || row['Supplier Unpaid Count'] || 0),
        supplier_allocated_total: Number(row.supplier_allocated_total || row['Supplier Allocated Total'] || 0),
        supplier_side_paid: toBoolean(supplierSidePaidValue),
        supplier_payment_ready: toBoolean(supplierPaymentReadyValue),
        settlement_status: (row.settlement_status || row['Settlement Status'] || 'OPEN').toString().trim() as PaymentTrackerRow['settlement_status'],
      };
    });
    
    return normalizedRows;
  } catch (error) {
    console.error('Error fetching payments tracker:', error);
    throw error;
  }
}

// Update partner payment in Orders_Header
export async function updatePartnerPayment(
  salesInvoiceNo: string,
  updates: {
    partnerPaid: boolean;
    partnerPaidDate?: string;
    partnerPaymentMethod?: string;
    partnerPaymentRef?: string;
  }
): Promise<void> {
  try {
    console.log('[updatePartnerPayment] Starting partner payment update:', {
      salesInvoiceNo,
      updates,
    });

    const sheets = await getSheetsClient();
    const { headers, data } = await getSheetData('Orders_Header');
    
    // Find row by invoice number
    const invoiceNoIndex = findColumnIndex(headers, 'Invoice No');
    if (invoiceNoIndex === -1) {
      throw new Error('Invoice No column not found in Orders_Header sheet');
    }
    
    const normalizeInvoiceNo = (inv: string): string => {
      return String(inv).replace(/#/g, '').trim().toLowerCase();
    };
    
    const searchInvoiceNo = normalizeInvoiceNo(salesInvoiceNo);
    const rowIndex = data.findIndex((row: any) => {
      const rowInvoiceNo = row[invoiceNoIndex];
      return normalizeInvoiceNo(String(rowInvoiceNo || '')) === searchInvoiceNo;
    });
    
    if (rowIndex === -1) {
      throw new Error(`Sales invoice ${salesInvoiceNo} not found in Orders_Header`);
    }
    
    console.log('[updatePartnerPayment] Order found at row index:', rowIndex, '(sheet row:', rowIndex + 2, ')');

    // Reverse mapping from TypeScript property to sheet column
    const reverseMapping: Record<string, string> = {};
    Object.entries(columnMapping['Orders_Header'] || {}).forEach(([sheetCol, tsProp]) => {
      reverseMapping[tsProp] = sheetCol;
    });
    
    // Allowed fields for write-back
    const allowedFields: Record<string, string> = {
      partnerPaid: 'Partner Paid?',
      partnerPaidDate: 'Partner Paid Date',
      partnerPaymentMethod: 'Partner Payment Method',
      partnerPaymentRef: 'Partner Payment Ref',
    };
    
    // Helper to convert column index to A1 notation
    const getColumnLetter = (colIndex: number): string => {
      let result = '';
      while (colIndex >= 0) {
        result = String.fromCharCode(65 + (colIndex % 26)) + result;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return result;
    };

    // Build update values - only allow specific fields
    const updateValues: any[] = [];
    Object.entries(updates).forEach(([tsKey, value]) => {
      if (!allowedFields[tsKey]) {
        console.warn('[updatePartnerPayment] Attempted to write to protected field:', tsKey);
        return;
      }
      
      const sheetColumn = allowedFields[tsKey];
      const colIndex = findColumnIndex(headers, sheetColumn);
      if (colIndex !== -1) {
        const colLetter = getColumnLetter(colIndex);
        updateValues.push({
          range: `Orders_Header!${colLetter}${rowIndex + 2}`,
          values: [[value]],
        });
        console.log('[updatePartnerPayment] Adding update:', {
          property: tsKey,
          sheetColumn,
          columnIndex: colIndex,
          columnLetter: colLetter,
          sheetRow: rowIndex + 2,
          range: `Orders_Header!${colLetter}${rowIndex + 2}`,
          value,
        });
      } else {
        console.warn('[updatePartnerPayment] Column not found for property:', tsKey, 'sheetColumn:', sheetColumn);
      }
    });

    if (updateValues.length === 0) {
      throw new Error('No valid columns to update');
    }

    console.log('[updatePartnerPayment] Executing batch update with', updateValues.length, 'updates');

    // Batch update
    const updateResult = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateValues,
      },
    });
    
    console.log('[updatePartnerPayment] Batch update successful:', {
      salesInvoiceNo,
      updatedRanges: updateResult.data.responses?.map((r: any) => r.updatedRange),
      totalUpdatedCells: updateResult.data.totalUpdatedCells,
    });
  } catch (error: any) {
    console.error('[updatePartnerPayment] Error updating partner payment:', {
      salesInvoiceNo,
      updates,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    throw error;
  }
}

// Get supplier invoices with hyperlink extraction
export async function getSupplierInvoices(salesInvoiceNo?: string): Promise<SupplierInvoice[]> {
  try {
    const { headers, data } = await getSheetData('Supplier_Invoices');
    if (!headers || headers.length === 0) {
      console.warn('[getSupplierInvoices] Supplier_Invoices sheet is empty or has no headers, returning empty array');
      return [];
    }
    
    // Get hyperlinks for the invoice_file_link column
    const invoiceFileLinkColumnIndex = headers.findIndex((h: string) => 
      h && (h.toLowerCase().includes('invoice_file_link') || 
           h.toLowerCase().includes('invoice file link') ||
           h.toLowerCase().includes('file link') ||
           h.toLowerCase().includes('drive link'))
    );
    
    // Fetch hyperlinks if the column exists
    let hyperlinks: Map<number, string> = new Map();
    if (invoiceFileLinkColumnIndex >= 0) {
      try {
        const sheets = await getSheetsClient();
        const spreadsheet = await sheets.spreadsheets.get({
          spreadsheetId: SPREADSHEET_ID,
          ranges: [`Supplier_Invoices!${String.fromCharCode(65 + invoiceFileLinkColumnIndex)}:${String.fromCharCode(65 + invoiceFileLinkColumnIndex)}`],
          includeGridData: true,
        });
        
        const sheet = spreadsheet.data.sheets?.[0];
        if (sheet?.data?.[0]?.rowData) {
          sheet.data[0].rowData.forEach((row: any, rowIndex: number) => {
            if (rowIndex === 0) return; // Skip header row
            const cell = row.values?.[0];
            if (cell?.userEnteredFormat?.link?.uri) {
              hyperlinks.set(rowIndex, cell.userEnteredFormat.link.uri);
            } else if (cell?.effectiveFormat?.link?.uri) {
              hyperlinks.set(rowIndex, cell.effectiveFormat.link.uri);
            }
          });
        }
        console.log(`[getSupplierInvoices] Extracted ${hyperlinks.size} hyperlinks from Supplier_Invoices`);
      } catch (error: any) {
        console.warn('[getSupplierInvoices] Error extracting hyperlinks, will use display text:', error.message);
      }
    }
    
    const invoices = rowsToObjects<SupplierInvoice>(data, headers, 'Supplier_Invoices');
    
    // Normalize supplier invoices - preserve actual row number for updates
    let normalizedInvoices = invoices.map((inv: any, index: number) => {
      // Get hyperlink URL if available, otherwise use display text
      const rowIndex = index + 1; // +1 because data array excludes header
      const hyperlinkUrl = hyperlinks.get(rowIndex);
      const displayText = (inv.invoice_file_link || inv['Invoice File Link'] || inv['File Link'] || inv['Drive Link'] || '').toString().trim();
      
      return {
        ...inv,
        id: String(index + 2), // Row number in sheet (1-based header + 1-based index)
        invoice_no: (inv.invoice_no || inv['Invoice No'] || inv['Invoice Number'] || '').toString().trim(),
        sales_invoice_no: (inv.sales_invoice_no || inv['Sales Invoice No'] || '').toString().trim(),
        supplier: (inv.supplier || inv.Supplier || '').toString().trim(),
        amount: Number(inv.amount || inv.Amount || 0),
        paid: inv.paid ?? inv['Paid?'] ?? inv.Paid ?? false,
        paid_date: (inv.paid_date || inv['Paid Date'] || '').toString().trim() || undefined,
        payment_reference: (inv.payment_reference || inv['Payment Reference'] || inv['Payment Ref'] || '').toString().trim() || undefined,
        invoice_file_link: hyperlinkUrl || displayText || undefined,
      };
    });
    
    // Filter by sales invoice if provided (but keep original row numbers)
    if (salesInvoiceNo) {
      const normalizeInvoiceNo = (inv: string): string => {
        return String(inv).replace(/#/g, '').trim().toLowerCase();
      };
      const searchInvoiceNo = normalizeInvoiceNo(salesInvoiceNo);
      normalizedInvoices = normalizedInvoices.filter((inv) => {
        const invNo = normalizeInvoiceNo(inv.sales_invoice_no || '');
        return invNo === searchInvoiceNo;
      });
    }
    
    return normalizedInvoices;
  } catch (error: any) {
    console.error('[getSupplierInvoices] Error fetching supplier invoices:', error.message);
    // Return empty array instead of throwing to prevent breaking the payments table
    console.warn('[getSupplierInvoices] Returning empty array due to error');
    return [];
  }
}

// Update supplier invoice
export async function updateSupplierInvoice(
  invoiceId: string,
  updates: {
    paid: boolean;
    paid_date?: string;
    payment_reference?: string;
  }
): Promise<void> {
  try {
    console.log('[updateSupplierInvoice] Starting supplier invoice update:', {
      invoiceId,
      updates,
    });

    const sheets = await getSheetsClient();
    const { headers, data } = await getSheetData('Supplier_Invoices');
    
    // invoiceId is the row number (1-based, including header)
    const rowIndex = parseInt(invoiceId) - 2; // Convert to 0-based data index (subtract 1 for header, 1 for 0-based)
    
    if (rowIndex < 0 || rowIndex >= data.length) {
      throw new Error(`Supplier invoice row ${invoiceId} not found`);
    }
    
    console.log('[updateSupplierInvoice] Invoice found at row index:', rowIndex, '(sheet row:', rowIndex + 2, ')');
    
    // Allowed fields for write-back
    const allowedFields: Record<string, string> = {
      paid: 'Paid?',
      paid_date: 'Paid Date',
      payment_reference: 'Payment Reference',
    };
    
    // Helper to convert column index to A1 notation
    const getColumnLetter = (colIndex: number): string => {
      let result = '';
      while (colIndex >= 0) {
        result = String.fromCharCode(65 + (colIndex % 26)) + result;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return result;
    };

    // Build update values - only allow specific fields
    const updateValues: any[] = [];
    Object.entries(updates).forEach(([tsKey, value]) => {
      if (!allowedFields[tsKey]) {
        console.warn('[updateSupplierInvoice] Attempted to write to protected field:', tsKey);
        return;
      }
      
      const sheetColumn = allowedFields[tsKey];
      const colIndex = findColumnIndex(headers, sheetColumn);
      if (colIndex !== -1) {
        const colLetter = getColumnLetter(colIndex);
        updateValues.push({
          range: `Supplier_Invoices!${colLetter}${rowIndex + 2}`,
          values: [[value]],
        });
        console.log('[updateSupplierInvoice] Adding update:', {
          property: tsKey,
          sheetColumn,
          columnIndex: colIndex,
          columnLetter: colLetter,
          sheetRow: rowIndex + 2,
          range: `Supplier_Invoices!${colLetter}${rowIndex + 2}`,
          value,
        });
      } else {
        console.warn('[updateSupplierInvoice] Column not found for property:', tsKey, 'sheetColumn:', sheetColumn);
      }
    });

    if (updateValues.length === 0) {
      throw new Error('No valid columns to update');
    }

    console.log('[updateSupplierInvoice] Executing batch update with', updateValues.length, 'updates');

    // Batch update
    const updateResult = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateValues,
      },
    });
    
    console.log('[updateSupplierInvoice] Batch update successful:', {
      invoiceId,
      updatedRanges: updateResult.data.responses?.map((r: any) => r.updatedRange),
      totalUpdatedCells: updateResult.data.totalUpdatedCells,
    });
  } catch (error: any) {
    console.error('[updateSupplierInvoice] Error updating supplier invoice:', {
      invoiceId,
      updates,
      error: error.message,
      stack: error.stack,
      errorName: error.name,
    });
    throw error;
  }
}

// Create supplier invoice
export async function createSupplierInvoice(invoiceData: {
  invoice_no: string;
  sales_invoice_no?: string;
  supplier: string;
  amount: number;
  paid?: boolean;
  paid_date?: string;
  payment_reference?: string;
}): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    
    // Get sheet ID for Supplier_Invoices
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const supplierInvoicesSheet = spreadsheet.data.sheets?.find(
      (sheet: any) => sheet.properties?.title === 'Supplier_Invoices'
    );
    if (!supplierInvoicesSheet?.properties?.sheetId) {
      throw new Error('Supplier_Invoices sheet not found');
    }
    const sheetId = supplierInvoicesSheet.properties.sheetId;
    
    // Get current last row
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Supplier_Invoices!A:A',
    });
    
    const numExistingRows = currentData.data.values ? currentData.data.values.length : 1;
    const insertStartRow1Indexed = numExistingRows + 1;
    
    // Step 1: Insert row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: numExistingRows,
                endIndex: numExistingRows + 1,
              },
            },
          },
        ],
      },
    });
    
    // Step 2: Write data to specific columns
    // Column A: Invoice No
    // Column B: Sales Invoice No
    // Column C: Supplier
    // Column D: Amount
    // Column G: Paid? (if provided)
    // Column H: Paid Date (if provided)
    // Column I: Payment Reference (if provided)
    const dataUpdates: any[] = [];
    
    dataUpdates.push({
      range: `Supplier_Invoices!A${insertStartRow1Indexed}:A${insertStartRow1Indexed}`,
      values: [[invoiceData.invoice_no]],
    });
    dataUpdates.push({
      range: `Supplier_Invoices!B${insertStartRow1Indexed}:B${insertStartRow1Indexed}`,
      values: [[invoiceData.sales_invoice_no || '']],
    });
    dataUpdates.push({
      range: `Supplier_Invoices!C${insertStartRow1Indexed}:C${insertStartRow1Indexed}`,
      values: [[invoiceData.supplier]],
    });
    dataUpdates.push({
      range: `Supplier_Invoices!D${insertStartRow1Indexed}:D${insertStartRow1Indexed}`,
      values: [[invoiceData.amount]],
    });
    
    if (invoiceData.paid !== undefined) {
      dataUpdates.push({
        range: `Supplier_Invoices!G${insertStartRow1Indexed}:G${insertStartRow1Indexed}`,
        values: [[invoiceData.paid ? 'YES' : 'NO']],
      });
    }
    
    if (invoiceData.paid_date) {
      dataUpdates.push({
        range: `Supplier_Invoices!H${insertStartRow1Indexed}:H${insertStartRow1Indexed}`,
        values: [[invoiceData.paid_date]],
      });
    }
    
    if (invoiceData.payment_reference) {
      dataUpdates.push({
        range: `Supplier_Invoices!I${insertStartRow1Indexed}:I${insertStartRow1Indexed}`,
        values: [[invoiceData.payment_reference]],
      });
    }
    
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: dataUpdates,
      },
    });
    
    console.log('[createSupplierInvoice] Supplier invoice created successfully:', invoiceData.invoice_no);
  } catch (error: any) {
    console.error('[createSupplierInvoice] Error creating supplier invoice:', error);
    throw error;
  }
}

// Create supplier invoice allocation
export async function createSupplierInvoiceAllocation(allocationData: {
  sales_invoice_no: string;
  supplier_invoice_no: string;
  allocated_amount: number;
}): Promise<void> {
  try {
    const sheets = await getSheetsClient();
    
    // Get sheet ID for Order_Supplier_Allocations
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const allocationsSheet = spreadsheet.data.sheets?.find(
      (sheet: any) => sheet.properties?.title === 'Order_Supplier_Allocations'
    );
    if (!allocationsSheet?.properties?.sheetId) {
      throw new Error('Order_Supplier_Allocations sheet not found');
    }
    const sheetId = allocationsSheet.properties.sheetId;
    
    // Get current last row
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Order_Supplier_Allocations!A:A',
    });
    
    const numExistingRows = currentData.data.values ? currentData.data.values.length : 1;
    const insertStartRow1Indexed = numExistingRows + 1;
    
    // Step 1: Insert row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: numExistingRows,
                endIndex: numExistingRows + 1,
              },
            },
          },
        ],
      },
    });
    
    // Step 2: Write data
    // Column A: Sales Invoice No
    // Column B: Supplier Invoice No
    // Column C: Allocated Amount
    const dataUpdates: any[] = [];
    
    dataUpdates.push({
      range: `Order_Supplier_Allocations!A${insertStartRow1Indexed}:A${insertStartRow1Indexed}`,
      values: [[allocationData.sales_invoice_no]],
    });
    dataUpdates.push({
      range: `Order_Supplier_Allocations!B${insertStartRow1Indexed}:B${insertStartRow1Indexed}`,
      values: [[allocationData.supplier_invoice_no]],
    });
    dataUpdates.push({
      range: `Order_Supplier_Allocations!C${insertStartRow1Indexed}:C${insertStartRow1Indexed}`,
      values: [[allocationData.allocated_amount]],
    });
    
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: dataUpdates,
      },
    });
    
    console.log('[createSupplierInvoiceAllocation] Allocation created successfully:', {
      sales_invoice_no: allocationData.sales_invoice_no,
      supplier_invoice_no: allocationData.supplier_invoice_no,
    });
  } catch (error: any) {
    console.error('[createSupplierInvoiceAllocation] Error creating allocation:', error);
    throw error;
  }
}

// Create multiple supplier invoices with allocations (batch)
export async function createSupplierInvoices(invoicesData: {
  sales_invoice_no?: string;
  invoices: Array<{
    supplier_invoice_no: string;
    supplier: string;
    amount: number;
    allocated_amount?: number;
    paid?: boolean;
    paid_date?: string;
    payment_reference?: string;
  }>;
}): Promise<void> {
  try {
    // Create all invoices and allocations
    const promises: Promise<void>[] = [];
    
    for (const invoice of invoicesData.invoices) {
      // Create supplier invoice
      promises.push(
        createSupplierInvoice({
          invoice_no: invoice.supplier_invoice_no,
          sales_invoice_no: invoicesData.sales_invoice_no || '',
          supplier: invoice.supplier,
          amount: invoice.amount,
          paid: invoice.paid,
          paid_date: invoice.paid_date,
          payment_reference: invoice.payment_reference,
        })
      );
      
      // Create allocation only if sales_invoice_no is provided
      if (invoicesData.sales_invoice_no && invoice.allocated_amount) {
        promises.push(
          createSupplierInvoiceAllocation({
            sales_invoice_no: invoicesData.sales_invoice_no,
            supplier_invoice_no: invoice.supplier_invoice_no,
            allocated_amount: invoice.allocated_amount,
          })
        );
      }
    }
    
    await Promise.all(promises);
    
    const allocationCount = invoicesData.sales_invoice_no ? invoicesData.invoices.length : 0;
    console.log(`[createSupplierInvoices] Successfully created ${invoicesData.invoices.length} supplier invoice(s)${allocationCount > 0 ? ` with ${allocationCount} allocation(s)` : ''}`);
  } catch (error: any) {
    console.error('[createSupplierInvoices] Error creating supplier invoices:', error);
    throw error;
  }
}

// Get order supplier allocations
export async function getOrderSupplierAllocations(salesInvoiceNo: string): Promise<OrderSupplierAllocation[]> {
  try {
    const { headers, data } = await getSheetData('Order_Supplier_Allocations');
    if (!headers || headers.length === 0) {
      console.warn('[getOrderSupplierAllocations] Order_Supplier_Allocations sheet is empty or has no headers, returning empty array');
      return [];
    }
    const allocations = rowsToObjects<OrderSupplierAllocation>(data, headers, 'Order_Supplier_Allocations');
    
    // Normalize allocations
    const normalizedAllocations = allocations.map((alloc: any) => ({
      ...alloc,
      sales_invoice_no: (alloc.sales_invoice_no || alloc['Sales Invoice No'] || '').toString().trim(),
      supplier_invoice_no: (alloc.supplier_invoice_no || alloc['Supplier Invoice No'] || '').toString().trim(),
      allocated_amount: Number(alloc.allocated_amount || alloc['Allocated Amount'] || alloc.Amount || 0),
    }));
    
    // Filter by sales invoice
    const normalizeInvoiceNo = (inv: string): string => {
      return String(inv).replace(/#/g, '').trim().toLowerCase();
    };
    const searchInvoiceNo = normalizeInvoiceNo(salesInvoiceNo);
    
    return normalizedAllocations.filter((alloc) => {
      const allocNo = normalizeInvoiceNo(alloc.sales_invoice_no || '');
      return allocNo === searchInvoiceNo;
    });
  } catch (error: any) {
    console.error('[getOrderSupplierAllocations] Error fetching order supplier allocations:', error.message);
    // Return empty array instead of throwing to prevent breaking the payments table
    console.warn('[getOrderSupplierAllocations] Returning empty array due to error');
    return [];
  }
}

// Calculate settlement status from Supplier_Invoices data
export async function calculateSettlementStatus(
  salesInvoiceNo: string,
  partnerPaid: boolean,
  fundsCleared: boolean
): Promise<'OPEN' | 'PAID_NOT_CLEARED' | 'WAITING_SUPPLIERS' | 'SETTLED'> {
  try {
    // If partner hasn't paid, status is OPEN
    if (!partnerPaid) {
      return 'OPEN';
    }
    
    // If partner paid but funds not cleared, status is PAID_NOT_CLEARED
    if (!fundsCleared) {
      return 'PAID_NOT_CLEARED';
    }
    
    // Get supplier invoices for this sales invoice
    // getOrderSupplierAllocations now returns empty array on error instead of throwing
    const allocations = await getOrderSupplierAllocations(salesInvoiceNo);
    if (allocations.length === 0) {
      // No supplier invoices linked - if partner paid and cleared, it's SETTLED
      return 'SETTLED';
    }
    
    // Get all supplier invoices linked to this sales invoice
    const supplierInvoiceNos = allocations.map((a) => a.supplier_invoice_no);
    
    // Try to get supplier invoices, but don't fail if it errors
    let allInvoices: any[] = [];
    try {
      allInvoices = await getSupplierInvoices();
    } catch (error: any) {
      console.warn(`[calculateSettlementStatus] Error fetching supplier invoices for ${salesInvoiceNo}:`, error.message);
      // If we can't get invoices, assume they're all paid (SETTLED) to avoid blocking
      return 'SETTLED';
    }
    
    // Debug logging
    console.log(`[calculateSettlementStatus] ${salesInvoiceNo}: Found ${allocations.length} allocations, ${allInvoices.length} total supplier invoices`);
    
    // Match supplier invoices by invoice number from allocations
    const normalizeInvoiceNo = (inv: string): string => {
      return String(inv).replace(/#/g, '').trim().toLowerCase();
    };
    
    const linkedInvoices = allInvoices.filter((inv) => {
      const invNo = normalizeInvoiceNo(inv.invoice_no || '');
      return supplierInvoiceNos.some((allocNo) => 
        normalizeInvoiceNo(allocNo) === invNo
      );
    });
    
    // If allocations exist but no matching invoices found, log warning but treat as SETTLED
    // This handles cases where supplier invoices haven't been created yet or invoice numbers don't match
    if (linkedInvoices.length === 0 && allocations.length > 0) {
      console.warn(`[calculateSettlementStatus] Allocations found for ${salesInvoiceNo} but no matching supplier invoices found. Allocations:`, supplierInvoiceNos);
      // If partner paid and cleared, and no invoices exist to pay, consider it SETTLED
      // (supplier invoices may not have been created yet, or they're handled separately)
      return 'SETTLED';
    }
    
    // Check if all supplier invoices are paid
    const allPaid = linkedInvoices.length > 0 && linkedInvoices.every((inv) => inv.paid);
    
    // If any supplier invoice is unpaid, status is WAITING_SUPPLIERS
    if (!allPaid) {
      return 'WAITING_SUPPLIERS';
    }
    
    // All conditions met - SETTLED
    return 'SETTLED';
  } catch (error: any) {
    console.error(`[calculateSettlementStatus] Error calculating settlement status for ${salesInvoiceNo}:`, error.message);
    // Default to OPEN on error
    return 'OPEN';
  }
}

