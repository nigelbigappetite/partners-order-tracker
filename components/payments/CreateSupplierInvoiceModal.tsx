'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/Modal'
import { OrderLine } from '@/lib/types'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { Upload, FileText, X } from 'lucide-react'

interface CreateSupplierInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  salesInvoiceNo: string
  onSuccess: () => void
}

interface SupplierGroup {
  supplier: string
  totalAmount: number
  lineCount: number
  included: boolean
  supplierInvoiceNo: string
  file?: File
}

export default function CreateSupplierInvoiceModal({
  isOpen,
  onClose,
  salesInvoiceNo,
  onSuccess,
}: CreateSupplierInvoiceModalProps) {
  const [orderLines, setOrderLines] = useState<OrderLine[]>([])
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paidStatus, setPaidStatus] = useState(false)
  const [paidDate, setPaidDate] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  useEffect(() => {
    if (isOpen && salesInvoiceNo) {
      fetchOrderLines()
    }
  }, [isOpen, salesInvoiceNo])

  const fetchOrderLines = async () => {
    setLoading(true)
    try {
      // Try to get order by invoice number first
      let order = null
      try {
        const orderResponse = await fetch(`/api/orders/${encodeURIComponent(salesInvoiceNo)}`)
        if (orderResponse.ok) {
          order = await orderResponse.json()
        }
      } catch (error) {
        console.log('Order not found by invoice number, will try with salesInvoiceNo directly')
      }
      
      // Get order lines - use orderId if available, otherwise use salesInvoiceNo
      const identifier = order?.orderId || salesInvoiceNo
      const linesResponse = await fetch(`/api/orders/${encodeURIComponent(identifier)}/lines`)
      if (!linesResponse.ok) {
        throw new Error('Failed to fetch order lines')
      }
      const lines = await linesResponse.json()
      
      setOrderLines(lines)
      
      // Group by supplier and calculate totals
      const grouped = new Map<string, { supplier: string; totalAmount: number; lineCount: number }>()
      
      lines.forEach((line: OrderLine) => {
        if (!line.supplier) return
        
        const supplier = line.supplier.trim()
        const cogsTotal = line.cogsTotal || 0
        
        if (grouped.has(supplier)) {
          const existing = grouped.get(supplier)!
          existing.totalAmount += cogsTotal
          existing.lineCount += 1
        } else {
          grouped.set(supplier, {
            supplier,
            totalAmount: cogsTotal,
            lineCount: 1,
          })
        }
      })
      
      // Convert to array and initialize form state
      const groups: SupplierGroup[] = Array.from(grouped.values()).map((group) => ({
        ...group,
        included: true,
        supplierInvoiceNo: '',
      }))
      
      setSupplierGroups(groups)
    } catch (error: any) {
      console.error('Error fetching order lines:', error)
      toast.error(error.message || 'Failed to fetch order lines')
      setOrderLines([])
      setSupplierGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleSupplierToggle = (index: number) => {
    const updated = [...supplierGroups]
    updated[index].included = !updated[index].included
    setSupplierGroups(updated)
  }

  const handleSupplierInvoiceNoChange = (index: number, value: string) => {
    const updated = [...supplierGroups]
    updated[index].supplierInvoiceNo = value
    setSupplierGroups(updated)
  }

  const handleAmountChange = (index: number, value: string) => {
    const updated = [...supplierGroups]
    const numValue = parseFloat(value) || 0
    updated[index].totalAmount = numValue
    setSupplierGroups(updated)
  }

  const handleFileChange = (index: number, file: File | null) => {
    const updated = [...supplierGroups]
    if (file) {
      updated[index].file = file
    } else {
      delete updated[index].file
    }
    setSupplierGroups(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    const includedGroups = supplierGroups.filter(g => g.included)
    
    if (includedGroups.length === 0) {
      toast.error('Please select at least one supplier to create an invoice for')
      return
    }
    
    for (const group of includedGroups) {
      if (!group.supplierInvoiceNo.trim()) {
        toast.error(`Supplier Invoice No is required for ${group.supplier}`)
        return
      }
      if (group.totalAmount <= 0) {
        toast.error(`Amount must be greater than 0 for ${group.supplier}`)
        return
      }
    }
    
    // Validate date format if provided
    if (paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
      toast.error('Paid Date must be in YYYY-MM-DD format')
      return
    }
    
    setSubmitting(true)
    
    try {
      // 1. Upload files for included groups that have a file (same order as includedGroups)
      const uploadUrls: (string | undefined)[] = []
      for (const group of includedGroups) {
        if (group.file) {
          const formData = new FormData()
          formData.append('file', group.file)
          const uploadRes = await fetch('/api/supplier-invoices/upload', {
            method: 'POST',
            body: formData,
          })
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}))
            throw new Error(errData.error || `Failed to upload file for ${group.supplier}`)
          }
          const { url } = await uploadRes.json()
          uploadUrls.push(url)
        } else {
          uploadUrls.push(undefined)
        }
      }

      // 2. Build invoices with invoice_file_link from upload URLs
      const invoices = includedGroups.map((group, i) => ({
        supplier_invoice_no: group.supplierInvoiceNo.trim(),
        supplier: group.supplier,
        amount: group.totalAmount,
        allocated_amount: group.totalAmount,
        paid: paidStatus,
        paid_date: paidDate || undefined,
        payment_reference: paymentReference.trim() || undefined,
        invoice_file_link: uploadUrls[i],
      }))
      
      const response = await fetch('/api/supplier-invoices/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_invoice_no: salesInvoiceNo,
          invoices,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create supplier invoices')
      }
      
      toast.success(`Successfully created ${invoices.length} supplier invoice(s)`)
      onSuccess()
      onClose()
      
      // Reset form
      setSupplierGroups(supplierGroups.map(g => ({ ...g, supplierInvoiceNo: '', file: undefined })))
      setPaidStatus(false)
      setPaidDate('')
      setPaymentReference('')
    } catch (error: any) {
      console.error('Error creating supplier invoices:', error)
      toast.error(error.message || 'Failed to create supplier invoices')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Create Supplier Invoices">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading order lines...</div>
        </div>
      </Modal>
    )
  }

  if (orderLines.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Create Supplier Invoices">
        <div className="text-center py-8">
          <div className="text-gray-500">No order lines found for this invoice.</div>
        </div>
      </Modal>
    )
  }

  if (supplierGroups.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Create Supplier Invoices">
        <div className="text-center py-8">
          <div className="text-gray-500">No suppliers found in order lines.</div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Supplier Invoices">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          <p className="mb-2">
            Create supplier invoices for sales invoice: <strong>{salesInvoiceNo}</strong>
          </p>
          <p className="text-xs text-gray-500">
            Amounts are pre-filled from COGS totals. You can adjust them if needed.
          </p>
        </div>

        {/* Global payment options */}
        <div className="border-b border-gray-200 pb-4 space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="paidStatus"
              checked={paidStatus}
              onChange={(e) => setPaidStatus(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="paidStatus" className="ml-2 text-sm text-gray-700">
              Mark all invoices as paid
            </label>
          </div>
          
          {paidStatus && (
            <>
              <div>
                <label htmlFor="paidDate" className="block text-xs font-medium text-gray-700 mb-1">
                  Paid Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  id="paidDate"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="paymentReference" className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., Bank transfer reference"
                />
              </div>
            </>
          )}
        </div>

        {/* Supplier groups */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {supplierGroups.map((group, index) => (
            <div
              key={group.supplier}
              className={`border rounded-lg p-4 ${group.included ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={group.included}
                    onChange={() => handleSupplierToggle(index)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 font-medium text-gray-900">
                    {group.supplier}
                  </label>
                </div>
                <div className="text-xs text-gray-500">
                  {group.lineCount} line{group.lineCount !== 1 ? 's' : ''}
                </div>
              </div>

              {group.included && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Supplier Invoice No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={group.supplierInvoiceNo}
                      onChange={(e) => handleSupplierInvoiceNoChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Enter supplier invoice number"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={group.totalAmount}
                      onChange={(e) => handleAmountChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Calculated from {group.lineCount} line{group.lineCount !== 1 ? 's' : ''} (COGS Total)
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Attach invoice (optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">
                          {group.file ? group.file.name : 'PDF or image'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileChange(index, e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {group.file && (
                        <button
                          type="button"
                          onClick={() => handleFileChange(index, null)}
                          className="p-2 text-gray-500 hover:text-red-600"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {group.file && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <FileText className="h-3 w-3" />
                        {group.file.name} ({(group.file.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
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
            {submitting ? 'Creating...' : `Create ${supplierGroups.filter(g => g.included).length} Invoice(s)`}
          </button>
        </div>
      </form>
    </Modal>
  )
}

