# Supplier reconciliation – new flow and what you should see

## Intended flow (end to end)

1. **Order exists** → You have a **sales invoice** (what the partner/franchisee owes you). It appears as a row on the **Payments** table.

2. **Create supplier invoices** (when the order is in “Waiting suppliers”):
   - Click **Create Invoice** for that row.
   - Modal opens: order lines grouped by supplier, with amounts. You enter **Supplier invoice no** and optional file per supplier.
   - Submit → Rows are added to **Supplier_Invoices** and **Order_Supplier_Allocations** (linking that sales invoice to those supplier invoices).

3. **On the Payments table you should now see** (for that order):
   - **Supplier invoices**: e.g. `2 linked, 0 paid, 2 unpaid`
   - **Outstanding**: e.g. `£150.00` (total of unpaid supplier invoice amounts)

4. **Pay suppliers** (record that you’ve paid):
   - Click **Mark as Paid** for that row.
   - Modal opens: list of **supplier invoices** for that order, with **Outstanding** at the top. You can view each invoice (PDF/link), attach/replace file, tick which ones you’ve paid, add paid date and reference.
   - Submit → Those supplier invoices are marked paid in **Supplier_Invoices** (Paid?, Paid Date, Payment Reference).

5. **After all linked supplier invoices are paid**:
   - **Supplier invoices** shows e.g. `2 linked, 2 paid, 0 unpaid`
   - **Outstanding** shows `-` (nothing left to pay).
   - Settlement status can move to **SETTLED**.

So: **one place (Payments table)** shows “what’s linked, what’s paid, what’s outstanding per order”, and **one modal (Pay supplier)** is where you confirm and record payments.

---

## What the Payments table is meant to look like (new)

The table should have **nine columns** in this order:

| Column            | What it shows |
|-------------------|----------------|
| Sales Invoice     | Invoice number (click to open supplier invoice files) |
| Brand             | Brand name |
| Franchisee        | Franchisee name |
| Order Date        | Order date |
| Order Value       | Order total |
| **Supplier invoices** | **New:** `X linked, Y paid, Z unpaid` (e.g. `2 linked, 1 paid, 1 unpaid`). If no supplier invoices are linked, it shows `-`. |
| **Outstanding**   | **New:** Total £ of **unpaid** supplier invoices for that order. Red. If none, shows `-`. |
| Settlement Status | OPEN / PAID_NOT_CLEARED / WAITING_SUPPLIERS / SETTLED |
| Actions           | Mark Franchise Paid, Create Invoice, Mark as Paid |

So the table is **meant to look different**: the old “Supplier Invoice” (list of numbers) and “Unpaid Suppliers” (count only) are replaced by **Supplier invoices** (X linked, Y paid, Z unpaid) and **Outstanding** (£ amount).

---

## If the table “still looks the same” in production

If you still see the **old** columns (e.g. “Supplier Invoice” with comma‑separated numbers and “Unpaid Suppliers” with “X unpaid” only, and **no** “Outstanding” column), then production is not running the new front-end yet. Try the following.

### 1. Hard refresh and URL

- Do a **hard refresh**: e.g. `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows), or open the app in an **incognito/private** window.
- Make sure you’re on the **production** URL (the one Vercel shows as Production after the latest deploy), not an old preview or bookmark.

### 2. Confirm the right deployment is live

- In **Vercel** → your project → **Deployments**: check that the **latest** deployment (with the commit that added the revamp) is the one set as **Production**.
- If an older deployment is Production, either **Promote** the latest one to Production or trigger a new production deploy from the latest commit.

### 3. Check the API response

- Open **Developer tools** (F12) → **Network**.
- Reload the Admin Payments page and find the request to `/api/payments` (or similar).
- Open the **Response** and check one payment object. You should see fields like:
  - `supplier_invoices_linked_count`
  - `supplier_invoices_paid_count`
  - `supplier_invoices_unpaid_count`
  - `supplier_outstanding_amount`
- If these fields are **missing**, the **backend** isn’t from the new deploy (or the enrichment is failing and the API is returning unenriched data). If they **are** present but the table still shows the old columns, the **front-end** bundle is old (cache or wrong deployment).

### 4. Redeploy if needed

- Push again or click **Redeploy** in Vercel for the latest commit, wait for the build to finish, then set that deployment as Production and hard refresh again.

---

## Quick checklist

- [ ] I’m on the correct **production** URL.
- [ ] I did a **hard refresh** (or incognito).
- [ ] The table has a column called **“Supplier invoices”** with text like “X linked, Y paid, Z unpaid”.
- [ ] The table has a column called **“Outstanding”** with £ or “-”.
- [ ] In Network tab, the `/api/payments` response includes `supplier_outstanding_amount` (and the other recon fields).

If all of that is true, the new supplier recon flow is live. If not, the fix is to get the latest build deployed and served as production and avoid cached JS.

---

## Why every row might show "-" for Supplier invoices and Outstanding

The table **columns** are correct; "-" means **no supplier invoices are linked** for that order. The app links in two ways (in order):

1. **Order_Supplier_Allocations** – Rows with **Sales Invoice No** and **Supplier Invoice No**. Each payment’s sales invoice is matched (after normalising, e.g. `#1017WS` → `1017ws`) to this sheet. If there are no rows here for your invoice numbers, nothing is linked from this sheet.
2. **Fallback: Supplier_Invoices** – Rows that have **Sales Invoice No** (or “Sales Invoice No”) set to the same value as the order (again with normalisation). If you don’t use Order_Supplier_Allocations but do put the sales invoice on each supplier invoice row, the app uses this to show linked count and outstanding.

**What to check in Google Sheets:**

- **Order_Supplier_Allocations**  
  - Has a header row and columns that the app can map to **Sales Invoice No** and **Supplier Invoice No** (and optionally **Allocated Amount**).  
  - Contains at least one row per order you want to see, with:
    - **Sales Invoice No** = the same value as in the payments table (e.g. `#1017WS` or `1017WS`; case and `#` are ignored).
    - **Supplier Invoice No** = the supplier’s invoice number.

- **Supplier_Invoices**  
  - Has rows with **Sales Invoice No** (or equivalent) set to the order’s sales invoice (e.g. `#1017WS` or `1017WS`).  
  - Has **Invoice No** (or **Supplier Invoice No**), **Amount**, and **Paid?** so the app can compute counts and outstanding.

If **both** sheets are empty for a given sales invoice (or the sales invoice text doesn’t match after normalisation), that row will correctly show "-" for Supplier invoices and Outstanding. Add or fix data in one or both sheets and refresh the payments page.
