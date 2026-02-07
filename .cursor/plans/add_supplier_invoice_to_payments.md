# Add Supplier Invoice Number Column to Payments Section

## Current State
- Payments are fetched from `Payments_Tracker_View` sheet
- `Order_Supplier_Allocations` has `supplier_invoice_no` linked to `sales_invoice_no`
- `Supplier_Invoices` sheet has `supplier_invoice_no` and `sales_invoice_no` columns
- Payments tables don't display supplier invoice numbers directly
- Users need to see supplier invoice numbers to know which invoices to chase per sales invoice

## Solution: Fetch and Display Supplier Invoice Numbers

We'll fetch supplier invoice numbers from both sources:
1. Primary: `Order_Supplier_Allocations` (already has the link)
2. Fallback: `Supplier_Invoices` (by matching `sales_invoice_no`)

### Implementation Steps

#### 1. Enhance Payments API (`app/api/payments/route.ts`)
- After fetching payments from `getPaymentsTracker()`, enrich each payment with supplier invoice numbers
- For each payment, fetch supplier invoices from:
  - `getOrderSupplierAllocations(sales_invoice_no)` - get `supplier_invoice_no` from allocations
  - `getSupplierInvoices(sales_invoice_no)` - fallback if allocations don't have it
- Combine and deduplicate supplier invoice numbers
- Add `supplier_invoice_numbers` array to each payment object

#### 2. Update PaymentTrackerRow Type (`lib/types.ts`)
- Add `supplier_invoice_numbers?: string[]` to the interface for type safety

#### 3. Update PaymentsTable Component (`components/payments/PaymentsTable.tsx`)
- Add "Supplier Invoice" column to headers array (after "Order Value")
- Display supplier invoice numbers in table cell
- Format: Comma-separated if multiple, single if one, "-" if none

#### 4. Update LivePaymentsTracker Component (`components/payments/LivePaymentsTracker.tsx`)
- Add "Supplier Invoice" column to headers array (same position)
- Display supplier invoice numbers with same formatting

### Files to Modify

1. `app/api/payments/route.ts` - Fetch and enrich with supplier invoice numbers
2. `lib/types.ts` - Add supplier_invoice_numbers field to PaymentTrackerRow
3. `components/payments/PaymentsTable.tsx` - Add column and display
4. `components/payments/LivePaymentsTracker.tsx` - Add column and display

### Display Format
- Single: "65053"
- Multiple: "65053, 65051, 89523"  
- None: "-"
