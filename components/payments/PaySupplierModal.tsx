'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/Modal'
import ActionButton from '@/components/ActionButton'
import { SupplierInvoice } from '@/lib/types'
import toast from 'react-hot-toast'

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

  const fetchSupplierInvoices = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments/supplier-invoices?salesInvoiceNo=${encodeURIComponent(salesInvoiceNo)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch supplier invoices')
      }
      const data = await response.json()
      
      // Filter to only unpaid invoices
      const unpaidInvoices = data.filter((inv: SupplierInvoice) => !inv.paid)
      setInvoices(unpaidInvoices)
      
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
    } catch (error: any) {
      console.error('Error fetching supplier invoices:', error)
      toast.error(error.message || 'Failed to fetch supplier invoices')
    } finally {
      setLoading(false)
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedInvoices.size === 0) {
      toast.error('Please select at least one invoice to mark as paid')
      return
    }
    
    // Validate all selected invoices have dates
    const selectedArray = Array.from(selectedInvoices)
    for (const invoiceId of selectedArray) {
      if (!paymentDates[invoiceId]) {
        toast.error('Please provide a paid date for all selected invoices')
        return
      }
    }
    
    setSubmitting(true)
    
    try {
      // Update all selected invoices
      const updatePromises = selectedArray.map(async (invoiceId) => {
        const response = await fetch(`/api/payments/supplier-invoices/${invoiceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paid: true,
            paid_date: paymentDates[invoiceId],
            payment_reference: paymentRefs[invoiceId] || undefined,
          }),
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update invoice')
        }
      })
      
      await Promise.all(updatePromises)
      
      toast.success(`Marked ${selectedArray.length} invoice(s) as paid`)
      onSuccess()
      onClose()
      
      // Reset state
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
      <Modal isOpen={isOpen} onClose={onClose} title="Pay Supplier Invoices">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading supplier invoices...</div>
        </div>
      </Modal>
    )
  }

  if (invoices.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Pay Supplier Invoices">
        <div className="text-center py-8">
          <div className="text-gray-500">No unpaid supplier invoices found for this sales invoice.</div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay Supplier Invoices">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          Select supplier invoices to mark as paid for sales invoice: <strong>{salesInvoiceNo}</strong>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className={`border rounded-lg p-4 ${
                selectedInvoices.has(invoice.id || '') ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={`invoice-${invoice.id}`}
                  checked={selectedInvoices.has(invoice.id || '')}
                  onChange={() => handleToggleInvoice(invoice.id || '')}
                  className="mt-1 h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`invoice-${invoice.id}`}
                    className="block text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    {invoice.supplier} - Invoice #{invoice.invoice_no}
                    {invoice.amount && (
                      <span className="ml-2 text-gray-600">£{invoice.amount.toFixed(2)}</span>
                    )}
                  </label>
                  
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
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          >
            Cancel
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

