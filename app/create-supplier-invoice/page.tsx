'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { Supplier } from '@/lib/types'
import toast from 'react-hot-toast'

export default function CreateSupplierInvoicePage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form fields
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('')
  const [salesInvoiceNo, setSalesInvoiceNo] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [amount, setAmount] = useState('')
  const [allocatedAmount, setAllocatedAmount] = useState('')
  const [paid, setPaid] = useState(false)
  const [paidDate, setPaidDate] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [createAllocation, setCreateAllocation] = useState(false)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers')
      }
      const data = await response.json()
      setSuppliers(data)
    } catch (error) {
      toast.error('Failed to load suppliers')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!supplierInvoiceNo.trim()) {
      toast.error('Supplier Invoice No is required')
      return
    }
    
    if (!selectedSupplier) {
      toast.error('Please select a supplier')
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    
    if (createAllocation && !salesInvoiceNo.trim()) {
      toast.error('Sales Invoice No is required when creating allocation')
      return
    }
    
    if (createAllocation && (!allocatedAmount || parseFloat(allocatedAmount) <= 0)) {
      toast.error('Allocated Amount must be greater than 0')
      return
    }
    
    if (paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
      toast.error('Paid Date must be in YYYY-MM-DD format')
      return
    }
    
    setSubmitting(true)
    
    try {
      const invoiceData = {
        sales_invoice_no: salesInvoiceNo.trim() || undefined,
        invoices: [{
          supplier_invoice_no: supplierInvoiceNo.trim(),
          supplier: selectedSupplier,
          amount: parseFloat(amount),
          allocated_amount: createAllocation ? parseFloat(allocatedAmount) : parseFloat(amount),
          paid: paid,
          paid_date: paidDate || undefined,
          payment_reference: paymentReference.trim() || undefined,
        }],
      }
      
      // If creating allocation, include sales invoice no
      if (!createAllocation) {
        delete invoiceData.sales_invoice_no
      }
      
      const response = await fetch('/api/supplier-invoices/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create supplier invoice')
      }
      
      toast.success('Supplier invoice created successfully')
      router.push('/admin/payments')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create supplier invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Supplier Invoice</h1>
          <p className="mt-2 text-gray-600">Create a new supplier invoice</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Invoice Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="supplierInvoiceNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Invoice No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="supplierInvoiceNo"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Enter supplier invoice number"
                  required
                />
              </div>

              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  id="supplier"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.name} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="createAllocation"
                  checked={createAllocation}
                  onChange={(e) => setCreateAllocation(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="createAllocation" className="ml-2 text-sm font-medium text-gray-700">
                  Link to Sales Invoice (Create Allocation)
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Check this to link this supplier invoice to a sales invoice and create an allocation
              </p>
            </div>

            {createAllocation && (
              <div className="space-y-4 mt-4">
                <div>
                  <label htmlFor="salesInvoiceNo" className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Invoice No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="salesInvoiceNo"
                    value={salesInvoiceNo}
                    onChange={(e) => setSalesInvoiceNo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g., #1014WS"
                    required={createAllocation}
                  />
                </div>

                <div>
                  <label htmlFor="allocatedAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Allocated Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="allocatedAmount"
                    step="0.01"
                    min="0"
                    value={allocatedAmount}
                    onChange={(e) => setAllocatedAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="0.00"
                    required={createAllocation}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Amount allocated to this sales invoice (can be different from invoice amount)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Details (Optional)</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="paid"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="paid" className="ml-2 text-sm font-medium text-gray-700">
                  Mark as Paid
                </label>
              </div>

              {paid && (
                <>
                  <div>
                    <label htmlFor="paidDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      id="paidDate"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="paymentReference" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      id="paymentReference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="e.g., Bank transfer reference"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Supplier Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

