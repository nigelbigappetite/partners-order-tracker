# Supplier_Summary Sheet Guide

## Overview
The `Supplier_Summary` sheet should contain supplier information that matches what's displayed on the Suppliers page.

## Required Columns

### 1. Supplier Name (Required)
**Column Names That Work:**
- `Supplier`
- `Supplier Name`
- `Name`
- `Company`
- `Company Name`
- `Vendor`
- `Vendor Name`

**What it's used for:**
- Displayed as the supplier name on cards and in the table
- Used to match suppliers with order lines to calculate total value ordered

### 2. On-Time Percentage (Optional)
**Column Names That Work:**
- `On-Time %`
- `On Time Percentage`
- `On-Time Percentage`
- `On Time %`
- `On-Time Delivery %`
- `Delivery Performance`
- `On-Time Delivery`

**Format:**
- Can be a number: `85` (will be displayed as 85%)
- Can be a percentage string: `85%` (will be parsed correctly)
- If missing, will show as "N/A" on the page

**What it's used for:**
- Displayed on supplier cards and in the table
- Shows supplier's on-time delivery performance

### 3. Average Ship Time (Optional)
**Column Names That Work:**
- `Avg Ship Time`
- `Average Ship Time`
- `Avg Shipping Time`
- `Average Shipping Time`
- `Ship Time`
- `Shipping Time`
- `Lead Time`
- `Average Lead Time`
- `Days to Ship`
- `Days to Deliver`

**Format:**
- Should be a number representing days: `5` (will be displayed as "5 days")
- Can include "days" in the value: `5 days` (will be parsed correctly)
- If missing, will show as "N/A" on the page

**What it's used for:**
- Displayed on supplier cards and in the table
- Shows average time it takes for supplier to ship orders

## Example Supplier_Summary Sheet Structure

| Supplier | On-Time % | Avg Ship Time |
|----------|-----------|---------------|
| ABC Foods | 92 | 3 |
| XYZ Supplies | 85% | 5 days |
| Best Products | 88 | 4 |

## What Gets Calculated Automatically

### Total Value Ordered
- **NOT** stored in Supplier_Summary sheet
- Calculated automatically from `Order_Lines` sheet
- Matches supplier name from Supplier_Summary with supplier name in Order_Lines
- Sums up all `lineTotal` values for matching orders
- Displayed on both supplier cards and the table

## How to Verify Your Mapping

1. **Check your column names:**
   - Visit `http://localhost:3000/debug`
   - Select "Supplier_Summary" from the dropdown
   - See your actual column headers

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for any "Unmapped columns" warnings
   - If you see warnings, add those column names to the mapping in `lib/sheets.ts`

3. **Test the data:**
   - Navigate to `/suppliers` page
   - Verify supplier names appear correctly
   - Check that percentages and ship times display properly

## Troubleshooting

**Problem: Supplier names not showing**
- Verify the Supplier Name column exists in your sheet
- Check that the column name matches one of the supported names above
- Ensure the sheet is named exactly `Supplier_Summary` (case-sensitive)

**Problem: Percentages showing incorrectly**
- Make sure the value is a number (85) or percentage string (85%)
- Check that the column name matches one of the supported names
- Verify the column mapping in `lib/sheets.ts`

**Problem: Ship time not displaying**
- Ensure the value is a number (5) or includes "days" (5 days)
- Check that the column name matches one of the supported names
- Verify the column mapping in `lib/sheets.ts`

**Problem: Total Value showing £0**
- This is calculated from Order_Lines, not Supplier_Summary
- Verify supplier names in Supplier_Summary match supplier names in Order_Lines
- Matching is case-insensitive but must match exactly after trimming whitespace

