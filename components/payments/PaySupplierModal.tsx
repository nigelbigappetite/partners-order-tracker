'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/Modal'
import ActionButton from '@/components/ActionButton'
import { SupplierInvoice } from '@/lib/types'
import toast from 'react-hot-toast'
import { ExternalLink, FileText, Upload } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaySupplierModalProps {
  isOpen: boolean
  onClose: () => void
  salesInvoiceNo: string
  onSuccess: () => void
}

export default function PaySupplierModal({
  isOpen,
  onClose,
  salesInvoiceNo,
  onSuccess,
}: PaySupplierModalProps) {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({})
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen && salesInvoiceNo) {
      fetchSupplierInvoices()
    }
  }, [isOpen, salesInvoiceNo])

  const [allInvoices, setAllInvoices] = useState<SupplierInvoice[]>([])
  const [allPaid, setAllPaid] = useState(false)
  const [allocatedTotal, setAllocatedTotal] = useState<number | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const fetchSupplierInvoices = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments/supplier-invoices?salesInvoiceNo=${encodeURIComponent(salesInvoiceNo)}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch supplier invoices (${response.status})`)
      }
      const data = await response.json()
      
      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', data)
        throw new Error('Invalid response format from server')
      }
      
      setAllInvoices(data)
      
      // Filter to only unpaid invoices
      const unpaidInvoices = data.filter((inv: SupplierInvoice) => !inv.paid)
      setInvoices(unpaidInvoices)
      
    // Check if all invoices are paid
    const allInvoicesPaid = data.length > 0 && unpaidInvoices.length === 0
    setAllPaid(allInvoicesPaid)
      
      // Initialize payment dates and refs
      const today = new Date().toISOString().split('T')[0]
      const dates: Record<string, string> = {}
      const refs: Record<string, string> = {}
      unpaidInvoices.forEach((inv: SupplierInvoice) => {
        if (inv.id) {
          dates[inv.id] = today
          refs[inv.id] = ''
        }
      })
      setPaymentDates(dates)
      setPaymentRefs(refs)
      
      // Log for debugging
      if (unpaidInvoices.length === 0 && data.length > 0) {
        console.log(`All ${data.length} supplier invoice(s) for ${salesInvoiceNo} are already marked as paid`)
      } else if (data.length === 0) {
        console.log(`No supplier invoices found linked to ${salesInvoiceNo}`)
      }
      
      // Also fetch the allocated total to verify it's correct
      try {
        const allocatedResponse = await fetch(`/api/payments/verify-allocated-total?salesInvoiceNo=${encodeURIComponent(salesInvoiceNo)}`)
        if (allocatedResponse.ok) {
          const allocatedData = await allocatedResponse.json()
          setAllocatedTotal(allocatedData.calculated_total || 0)
        }
      } catch (error) {
        console.error('Error fetching allocated total:', error)
      }
    } catch (error: any) {
      console.error('Error fetching supplier invoices:', error)
      toast.error(error.message || 'Failed to fetch supplier invoices')
      setInvoices([]) // Set empty array on error so UI shows appropriate message
      setAllInvoices([])
      setAllPaid(false)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRefreshStatus = () => {
    // Refresh the payments data to update settlement status
    onSuccess()
    onClose()
    toast.success('Refreshing payment status...')
  }

  const handleToggleInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices)
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId)
    } else {
      newSelected.add(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleAttachFile = async (invoiceId: string, file: File) => {
    setUploadingId(invoiceId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('supplier_invoice_id', invoiceId)
      formData.append('sales_invoice_no', salesInvoiceNo)
      const res = await fetch('/api/supplier-invoices/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      toast.success('Invoice file attached')
      await fetchSupplierInvoices()
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach file')
    } finally {
      setUploadingId(null)
    }
  }

  const handleMarkAllPaid = () => {
    const today = new Date().toISOString().split('T')[0]
    const allIds = new Set(invoices.map((inv) => inv.id).filter(Boolean) as string[])
    const dates: Record<string, string> = {}
    const refs: Record<string, string> = {}
    allIds.forEach((id) => {
      dates[id] = today
      refs[id] = ''
    })
    setSelectedInvoices(allIds)
    setPaymentDates((prev) => ({ ...prev, ...dates }))
    setPaymentRefs((prev) => ({ ...prev, ...refs }))
  }

  const runMarkPaid = async (selectedArray: string[], dates: Record<string, string>, refs: Record<string, string>) => {
    const updatePromises = selectedArray.map(async (invoiceId) => {
      const invoice = invoices.find((inv) => inv.id === invoiceId)
      if (!invoice || !invoice.invoice_no) {
        throw new Error(`Invoice ${invoiceId} not found or missing invoice number`)
      }
      const response = await fetch('/api/admin/supplier-invoices/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_invoice_no: invoice.invoice_no,
          paid_date: dates[invoiceId],
          payment_reference: refs[invoiceId] || undefined,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update invoice')
      }
    })
    await Promise.all(updatePromises)
  }

  const handleMarkAllAndSubmit = async () => {
    if (invoices.length === 0) return
    const today = new Date().toISOString().split('T')[0]
    const allIds = invoices.map((inv) => inv.id).filter(Boolean) as string[]
    const dates: Record<string, string> = {}
    const refs: Record<string, string> = {}
    allIds.forEach((id) => {
      dates[id] = today
      refs[id] = ''
    })
    setSubmitting(true)
    try {
      await runMarkPaid(allIds, dates, refs)
      toast.success(`Marked ${allIds.length} invoice(s) as paid`)
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invoices')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (selectedInvoices.size === 0) {
      toast.error('Please select at least one invoice to mark as paid')
      return
    }
    
    const selectedArray = Array.from(selectedInvoices)
    for (const invoiceId of selectedArray) {
      if (!paymentDates[invoiceId]) {
        toast.error('Please provide a paid date for all selected invoices')
        return
      }
    }
    
    setSubmitting(true)
    try {
      await runMarkPaid(selectedArray, paymentDates, paymentRefs)
      toast.success(`Marked ${selectedArray.length} invoice(s) as paid`)
      onSuccess()
      onClose()
      setSelectedInvoices(new Set())
      const today = new Date().toISOString().split('T')[0]
      const dates: Record<string, string> = {}
      const refs: Record<string, string> = {}
      invoices.forEach((inv: SupplierInvoice) => {
        if (inv.id) {
          dates[inv.id] = today
          refs[inv.id] = ''
        }
      })
      setPaymentDates(dates)
      setPaymentRefs(refs)
    } catch (error: any) {
      console.error('Error updating supplier invoices:', error)
      toast.error(error.message || 'Failed to update invoices')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Mark Supplier Invoices as Paid">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading supplier invoices...</div>
        </div>
      </Modal>
    )
  }

  if (invoices.length === 0) {
    // If all invoices are paid, show a success message with refresh button
    if (allPaid && allInvoices.length > 0) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="All Supplier Invoices Paid">
          <div className="text-center py-8 space-y-4">
            <div className="text-green-600 font-semibold">
              ✓ All supplier invoices are already marked as paid
            </div>
            <div className="text-sm text-gray-600">
              Found <strong>{allInvoices.length}</strong> supplier invoice(s) for sales invoice: <strong>{salesInvoiceNo}</strong>
            </div>
            <div className="text-sm text-gray-500 mt-4">
              The settlement status should update automatically. If it still shows "WAITING_SUPPLIERS", 
              click the button below to refresh the payment status.
            </div>
            {allInvoices.some((inv) => inv.invoice_file_link && inv.invoice_file_link.trim()) && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">Invoice Files:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allInvoices.map((invoice) => (
                    invoice.invoice_file_link && invoice.invoice_file_link.trim() ? (
                      <a
                        key={invoice.id}
                        href={invoice.invoice_file_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors mx-auto max-w-md"
                      >
                        <FileText className="h-4 w-4" />
                        <span>{invoice.supplier} - Invoice #{invoice.invoice_no}</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6">
            <div className="text-sm text-gray-500 mb-3 space-y-2">
              <div>The settlement status should automatically update to "SETTLED" when the Google Sheets formula recalculates.</div>
              {allocatedTotal !== null && allocatedTotal === 0 && (
                <div className="text-amber-600 font-semibold mt-2">
                  ⚠️ Issue Found: Supplier Allocated Total is 0 in Google Sheets
                </div>
              )}
              {allocatedTotal !== null && allocatedTotal > 0 && (
                <div className="text-gray-600 mt-2">
                  Supplier Allocated Total should be: <strong>£{allocatedTotal.toFixed(2)}</strong>
                </div>
              )}
            </div>
            <button
              onClick={handleRefreshStatus}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              Refresh Dashboard
            </button>
            <div className="text-xs text-gray-400 text-center mt-2">
              {allocatedTotal === 0 ? (
                <div>
                  Check the "Supplier Allocated Total" formula in Payments_Tracker_View column X. 
                  It should sum amounts from Order_Supplier_Allocations for this invoice.
                </div>
              ) : (
                'This will refresh the payments list to show the updated status'
              )}
            </div>
            </div>
          </div>
        </Modal>
      )
    }
    
    // Otherwise show the standard "no invoices" message
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Mark Supplier Invoices as Paid">
        <div className="text-center py-8 space-y-4">
          <div className="text-gray-500">
            No unpaid supplier invoices found for sales invoice: <strong>{salesInvoiceNo}</strong>
          </div>
          <div className="text-sm text-gray-400">
            This could mean:
            <ul className="list-disc list-inside mt-2 space-y-1 text-left max-w-md mx-auto">
              <li>All supplier invoices are already marked as paid</li>
              <li>No supplier invoices are linked to this order in Order_Supplier_Allocations</li>
              <li>The supplier invoices exist but aren't in the Supplier_Invoices table</li>
            </ul>
          </div>
          <div className="text-xs text-gray-400 mt-4">
            If the order still shows "WAITING_SUPPLIERS", check the Order_Supplier_Allocations and Supplier_Invoices sheets in Google Sheets.
          </div>
        </div>
      </Modal>
    )
  }

  const outstandingAmount = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supplier payments – this order">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Sales invoice: <strong>{salesInvoiceNo}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Record which supplier invoices you’ve paid. View each invoice below, then tick and add paid date/reference.
          </p>
          {outstandingAmount > 0 && (
            <p className="text-sm font-semibold text-red-700 mt-2">
              Outstanding (unpaid supplier invoices for this order): <strong>{formatCurrency(outstandingAmount)}</strong>
            </p>
          )}
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`border rounded-lg p-4 ${
                selectedInvoices.has(invoice.id || '') ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
              }`}
            >
              {/* View invoice first so user can confirm before marking paid */}
              {invoice.invoice_file_link && invoice.invoice_file_link.trim() && (
                <div className="mb-3">
                  <a
                    href={invoice.invoice_file_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg border border-blue-700 transition-colors"
                    title="View invoice file"
                  >
                    <FileText className="h-4 w-4" />
                    View invoice (PDF/image)
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={`invoice-${invoice.id}`}
                  checked={selectedInvoices.has(invoice.id || '')}
                  onChange={() => handleToggleInvoice(invoice.id || '')}
                  className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`invoice-${invoice.id}`}
                      className="block text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      {invoice.supplier} – Supplier invoice #{invoice.invoice_no}
                      {invoice.amount != null && (
                        <span className="ml-2 text-gray-600">
                          £{Number(invoice.amount).toFixed(2)}
                          {!invoice.paid && <span className="text-red-600 ml-1">(unpaid)</span>}
                        </span>
                      )}
                    </label>
                    {!invoice.invoice_file_link?.trim() ? (
                      <label className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer border border-gray-300 rounded hover:bg-gray-50">
                        <Upload className="h-3 w-3" />
                        {uploadingId === invoice.id ? 'Uploading...' : 'Attach invoice'}
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={!!uploadingId}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f && invoice.id) handleAttachFile(invoice.id, f)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    ) : (
                      <label className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 cursor-pointer">
                        <Upload className="h-3 w-3" />
                        {uploadingId === invoice.id ? 'Uploading...' : 'Replace file'}
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={!!uploadingId}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f && invoice.id) handleAttachFile(invoice.id, f)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                  
                  {selectedInvoices.has(invoice.id || '') && (
                    <div className="mt-3 space-y-2 pl-7">
                      <div>
                        <label
                          htmlFor={`date-${invoice.id}`}
                          className="block text-xs font-medium text-gray-700 mb-1"
                        >
                          Paid Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id={`date-${invoice.id}`}
                          value={paymentDates[invoice.id || ''] || ''}
                          onChange={(e) =>
                            setPaymentDates({
                              ...paymentDates,
                              [invoice.id || '']: e.target.value,
                            })
                          }
                          required
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`ref-${invoice.id}`}
                          className="block text-xs font-medium text-gray-700 mb-1"
                        >
                          Payment Reference
                        </label>
                        <input
                          type="text"
                          id={`ref-${invoice.id}`}
                          value={paymentRefs[invoice.id || ''] || ''}
                          onChange={(e) =>
                            setPaymentRefs({
                              ...paymentRefs,
                              [invoice.id || '']: e.target.value,
                            })
                          }
                          placeholder="e.g., Transaction ID"
                          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMarkAllAndSubmit}
            disabled={submitting || invoices.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '...' : `Mark all ${invoices.length} as paid (today)`}
          </button>
          <ActionButton
            type="submit"
            loading={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            Mark Selected as Paid
          </ActionButton>
        </div>
      </form>
    </Modal>
  )
}

