'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import ActionButton from '@/components/ActionButton'
import toast from 'react-hot-toast'

interface MarkPartnerPaidModalProps {
  isOpen: boolean
  onClose: () => void
  salesInvoiceNo: string
  onSuccess: () => void
}

export default function MarkPartnerPaidModal({
  isOpen,
  onClose,
  salesInvoiceNo,
  onSuccess,
}: MarkPartnerPaidModalProps) {
  const [paidDate, setPaidDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!paidDate) {
      toast.error('Paid date is required')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_invoice_no: salesInvoiceNo,
          action: 'mark_partner_paid',
          payload: {
            paid_date: paidDate,
            payment_method: paymentMethod || undefined,
            payment_ref: paymentRef || undefined,
          },
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment')
      }
      
      toast.success('Partner payment marked as paid')
      onSuccess()
      onClose()
      
      // Reset form
      const today = new Date()
      setPaidDate(today.toISOString().split('T')[0])
      setPaymentMethod('')
      setPaymentRef('')
    } catch (error: any) {
      console.error('Error marking partner as paid:', error)
      toast.error(error.message || 'Failed to update payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Franchise Paid">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="paidDate" className="block text-sm font-medium text-gray-700 mb-1">
            Paid Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="paidDate"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Select payment method</option>
            <option value="SHOPIFY">SHOPIFY</option>
            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            <option value="CASH">CASH</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="paymentRef" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Reference
          </label>
          <input
            type="text"
            id="paymentRef"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="e.g., Transaction ID, Check #"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <ActionButton
            type="submit"
            loading={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            Mark as Paid
          </ActionButton>
        </div>
      </form>
    </Modal>
  )
}

