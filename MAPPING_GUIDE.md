# Google Sheets Data Mapping Guide

## How Data Mapping Works

The application uses a **column mapping system** to connect your Google Sheets column headers to the application's data structure. This allows flexibility - your column names don't have to match exactly.

## Current Sheet Names Expected

The application expects these sheet names in your Google Spreadsheet:
- `Orders_Header` - Main order information
- `Order_Lines` - Individual line items for each order
- `SKU_COGS` - Product/SKU database
- `Supplier_Summary` - Supplier information
- `Franchise_Locations` - Franchise location data

## How to Check Your Actual Column Names

1. **Using the Debug API** (Recommended):
   - Open your browser and go to: `http://localhost:3000/api/debug/columns?sheet=Orders_Header`
   - Replace `Orders_Header` with any sheet name to see its columns
   - This will show you the exact column headers in your Google Sheet

2. **Check Browser Console**:
   - When the app runs, it logs unmapped columns in development mode
   - Open browser DevTools (F12) and check the console for warnings

## How to Update Column Mapping

If your column names don't match, edit `lib/sheets.ts` and update the `columnMapping` object:

```typescript
const columnMapping: Record<string, Record<string, string>> = {
  'Orders_Header': {
    // Format: 'Your Column Name': 'applicationPropertyName'
    'Order ID': 'orderId',           // Maps "Order ID" column to orderId property
    'Your Brand Column': 'brand',     // Maps your column to brand property
    'Franchisee': 'franchisee',       // etc...
  },
  // ... other sheets
}
```

## Required Mappings by Sheet

### Orders_Header Sheet
Required properties:
- `orderId` - Order identifier
- `brand` - Brand name
- `franchisee` - Franchisee name
- `orderDate` - Order date
- `orderStage` - Current stage (New, Ordered with Supplier, etc.)
- `orderTotal` - Total order value
- `supplierOrdered` - Boolean (YES/NO or TRUE/FALSE)
- `supplierShipped` - Boolean
- `deliveredToPartner` - Boolean
- `partnerPaid` - Boolean

### Order_Lines Sheet
Required properties:
- `orderId` - Links to Orders_Header
- `sku` - Product SKU
- `productName` - Product name
- `quantity` - Quantity ordered
- `unitPrice` - Price per unit
- `lineTotal` - Total for this line
- `supplier` - Supplier name

### SKU_COGS Sheet
Required properties:
- `sku` - Product SKU
- `productName` - Product name
- `unitSize` - Unit size/description
- `costPerUnit` - Cost per unit
- `supplier` - Supplier name
- `sellingPrice` - Selling price

### Supplier_Summary Sheet
Required properties:
- `name` - Supplier name
- `onTimePercentage` - Optional: On-time delivery percentage
- `averageShipTime` - Optional: Average shipping time in days

## Example: Adding a New Column Mapping

If your Google Sheet has a column called "Order Number" but the app expects "Order ID":

1. Open `lib/sheets.ts`
2. Find the `columnMapping` object
3. Add to `Orders_Header` section:
   ```typescript
   'Orders_Header': {
     'Order ID': 'orderId',      // Existing
     'Order Number': 'orderId',  // Add this - both map to orderId
     // ... rest of mappings
   }
   ```

## Testing Your Mapping

1. Start your dev server: `npm run dev`
2. Navigate to a page (e.g., Dashboard)
3. Check browser console for any unmapped column warnings
4. Verify data appears correctly on the page
5. Use the debug API to verify column names match

## Troubleshooting

**Problem**: Data not showing up
- Check that sheet names match exactly (case-sensitive)
- Verify column mappings in `lib/sheets.ts`
- Check browser console for errors
- Use debug API to verify column names

**Problem**: Wrong data in fields
- Column name might be mapped incorrectly
- Check the mapping in `columnMapping` object
- Verify the property name matches the TypeScript interface

**Problem**: Numbers showing as strings
- The mapping system auto-converts numbers
- If it's not working, check that the column doesn't contain text mixed with numbers

