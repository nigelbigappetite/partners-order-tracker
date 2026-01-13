'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import LivePaymentsTracker from '@/components/payments/LivePaymentsTracker'
import PaymentsTable from '@/components/payments/PaymentsTable'
import MarkPartnerPaidModal from '@/components/payments/MarkPartnerPaidModal'
import PaySupplierModal from '@/components/payments/PaySupplierModal'
import CreateSupplierInvoiceModal from '@/components/payments/CreateSupplierInvoiceModal'
import { PaymentTrackerRow } from '@/lib/types'
import toast from 'react-hot-toast'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentTrackerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoiceForPartner, setSelectedInvoiceForPartner] = useState<string | null>(null)
  const [selectedInvoiceForSupplier, setSelectedInvoiceForSupplier] = useState<string | null>(null)
  const [selectedInvoiceForCreation, setSelectedInvoiceForCreation] = useState<string | null>(null)
  
  // Filters
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>('all')
  const [brandFilter, setBrandFilter] = useState<string>('all')
  const [franchiseeFilter, setFranchiseeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    fetchPayments()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPayments(true)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [settlementStatusFilter, brandFilter, franchiseeFilter, startDate, endDate])

  const fetchPayments = async (silent = false) => {
    if (!silent) setLoading(true)
    
    try {
      const params = new URLSearchParams()
      if (settlementStatusFilter !== 'all') {
        params.append('settlementStatus', settlementStatusFilter)
      }
      if (brandFilter !== 'all') {
        params.append('brand', brandFilter)
      }
      if (franchiseeFilter !== 'all') {
        params.append('franchisee', franchiseeFilter)
      }
      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }
      
      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }
      
      const data = await response.json()
      setPayments(data)
    } catch (error: any) {
      console.error('Error fetching payments:', error)
      if (!silent) {
        toast.error(error.message || 'Failed to fetch payments')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleMarkPartnerPaid = (salesInvoiceNo: string) => {
    setSelectedInvoiceForPartner(salesInvoiceNo)
  }

  const handlePaySupplier = (salesInvoiceNo: string) => {
    setSelectedInvoiceForSupplier(salesInvoiceNo)
  }

  const handleCreateSupplierInvoice = (salesInvoiceNo: string) => {
    setSelectedInvoiceForCreation(salesInvoiceNo)
  }

  const handlePaymentSuccess = () => {
    // Re-fetch payments after successful update
    fetchPayments()
  }

  // Get unique brands and franchisees for filters
  const uniqueBrands = Array.from(new Set(payments.map((p) => p.brand).filter(Boolean))).sort()
  const uniqueFranchisees = Array.from(
    new Set(payments.map((p) => p.franchisee_name).filter(Boolean))
  ).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center">Loading payments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">
        <div className="mb-4 xs:mb-6 sm:mb-8">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track and manage partner and supplier payments
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 xs:mb-6 grid grid-cols-1 gap-3 xs:gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="settlement-status" className="block text-sm font-medium text-gray-700 mb-1">
              Settlement Status
            </label>
            <select
              id="settlement-status"
              value={settlementStatusFilter}
              onChange={(e) => setSettlementStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="PAID_NOT_CLEARED">Paid (Not Cleared)</option>
              <option value="WAITING_SUPPLIERS">Waiting Suppliers</option>
              <option value="SETTLED">Settled</option>
            </select>
          </div>

          <div>
            <label htmlFor="brand-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <select
              id="brand-filter"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Brands</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="franchisee-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Franchisee
            </label>
            <select
              id="franchisee-filter"
              value={franchiseeFilter}
              onChange={(e) => setFranchiseeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Franchisees</option>
              {uniqueFranchisees.map((franchisee) => (
                <option key={franchisee} value={franchisee}>
                  {franchisee}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Live Outstanding Payments Tracker */}
        <LivePaymentsTracker />

        {/* All Payments Table */}
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">All Payments</h2>
            <p className="mt-1 text-sm text-gray-600">
              Complete payment history including settled orders
            </p>
          </div>
          <PaymentsTable
            payments={payments}
            onMarkPartnerPaid={handleMarkPartnerPaid}
            onPaySupplier={handlePaySupplier}
          />
        </div>

        {/* Modals */}
        {selectedInvoiceForPartner && (
          <MarkPartnerPaidModal
            isOpen={!!selectedInvoiceForPartner}
            onClose={() => setSelectedInvoiceForPartner(null)}
            salesInvoiceNo={selectedInvoiceForPartner}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {selectedInvoiceForSupplier && (
          <PaySupplierModal
            isOpen={!!selectedInvoiceForSupplier}
            onClose={() => setSelectedInvoiceForSupplier(null)}
            salesInvoiceNo={selectedInvoiceForSupplier}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {selectedInvoiceForCreation && (
          <CreateSupplierInvoiceModal
            isOpen={!!selectedInvoiceForCreation}
            onClose={() => setSelectedInvoiceForCreation(null)}
            salesInvoiceNo={selectedInvoiceForCreation}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  )
}

