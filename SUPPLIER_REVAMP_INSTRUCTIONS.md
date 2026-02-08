# Supplier Invoice Revamp – What You Need to Do

This document explains what (if anything) you need to change in **Google Sheets** or elsewhere after the supplier invoice revamp. The revamp adds clearer “linked / paid / unpaid” and “Outstanding” per order in the app.

---

## 1. Google Sheets – No New Columns Required

**You do not need to add any new columns** to your existing sheets for the revamp to work.

The app now computes the following **from existing data**:

- **Supplier invoices (X linked, Y paid, Z unpaid)** – from:
  - **Order_Supplier_Allocations** (links Sales Invoice No ↔ Supplier Invoice No)
  - **Supplier_Invoices** (Invoice No, Amount, Paid?)
- **Outstanding** – sum of supplier invoice **Amount** where **Paid?** is not YES for that order.

So as long as:

- **Order_Supplier_Allocations** has: **Sales Invoice No**, **Supplier Invoice No** (and optionally **Allocated Amount**),
- **Supplier_Invoices** has: **Invoice No** (or **Supplier Invoice No**), **Sales Invoice No**, **Supplier**, **Amount**, **Paid?** (and optionally **Paid Date**, **Payment Reference**, **Invoice File Link**),

the new columns in the app will work. No new sheet columns are required.

---

## 2. Optional: Align Column Names

The app matches columns using flexible names (e.g. “Invoice No”, “Supplier Invoice No”, “Paid?”, “Sales Invoice No”). If your sheets use different headers, the app may still find them via partial matching. For the clearest behaviour, use these where possible:

**Supplier_Invoices**

- Invoice number: **Invoice No** or **Supplier Invoice No**
- Link to order: **Sales Invoice No**
- **Supplier**, **Amount**, **Paid?** (YES/NO), **Paid Date**, **Payment Reference**
- **Invoice File Link** (or **File Link** / **Drive Link**) for uploaded invoice files

**Order_Supplier_Allocations**

- **Sales Invoice No**, **Supplier Invoice No**, **Allocated Amount**

---

## 3. Payments_Tracker_View (Read-Only in App)

The app reads **Payments_Tracker_View** for the main payments list (sales invoice, brand, partner paid, funds cleared, settlement status, etc.). The new “Supplier invoices” and “Outstanding” values are **calculated in the app** from Order_Supplier_Allocations + Supplier_Invoices; they are **not** read from Payments_Tracker_View. So you do **not** need to add formulas for “Outstanding” or “X paid / Y unpaid” to that view unless you want them in the sheet for your own use.

---

## 4. Terminology in the App

The revamp uses consistent wording:

- **Sales invoice** – The invoice for the order (what the partner/franchisee owes you). One per order.
- **Supplier invoice** – An invoice from a supplier for that order (what you owe the supplier). There can be several per order.
- **Outstanding** – The total **amount** of supplier invoices for that order that are not yet marked as paid.

---

## 5. Summary

| Item | Action required? |
|------|-------------------|
| New columns in Google Sheets | **No** |
| New sheets | **No** |
| Change column names | **Optional** (see section 2) |
| Payments_Tracker_View | **No** change needed for the new app behaviour |
| BLOB_READ_WRITE_TOKEN (invoice uploads) | Only if you use invoice file upload (see ENV_FORMAT.txt) |

If something doesn’t look right (e.g. “0 linked” when you expect supplier invoices), check:

1. **Order_Supplier_Allocations** – there is a row with that **Sales Invoice No** and the correct **Supplier Invoice No**.
2. **Supplier_Invoices** – there is a row whose **Invoice No** (or **Supplier Invoice No**) matches the allocation’s **Supplier Invoice No** (matching is case-insensitive and ignores `#`).
3. **Supplier_Invoices** – **Paid?** is YES or NO so the app can count paid vs unpaid correctly.
