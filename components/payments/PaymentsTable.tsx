'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PaymentTrackerRow, SupplierInvoice } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Info, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

type SortField = 'sales_invoice_no' | 'brand' | 'franchisee_name' | 'order_date' | 'total_order_value' | 'settlement_status'
type SortDirection = 'asc' | 'desc'

interface PaymentsTableProps {
  payments: PaymentTrackerRow[]
  onMarkPartnerPaid: (salesInvoiceNo: string) => void
  onPaySupplier: (salesInvoiceNo: string) => void
  onCreateSupplierInvoice?: (salesInvoiceNo: string) => void
}

const getSettlementStatusColor = (status: string): string => {
  switch (status) {
    case 'SETTLED':
      return 'bg-green-50 border-green-200'
    case 'PAID_NOT_CLEARED':
      return 'bg-yellow-50 border-yellow-200'
    case 'WAITING_SUPPLIERS':
      return 'bg-orange-50 border-orange-200'
    case 'OPEN':
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

const getSettlementStatusBadge = (status: string): string => {
  switch (status) {
    case 'SETTLED':
      return 'bg-green-100 text-green-800'
    case 'PAID_NOT_CLEARED':
      return 'bg-yellow-100 text-yellow-800'
    case 'WAITING_SUPPLIERS':
      return 'bg-orange-100 text-orange-800'
    case 'OPEN':
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function PaymentsTable({
  payments,
  onMarkPartnerPaid,
  onPaySupplier,
  onCreateSupplierInvoice,
}: PaymentsTableProps) {
  // Default sort: order date, most recent first
  const [sortField, setSortField] = useState<SortField>('order_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [loadingInvoices, setLoadingInvoices] = useState<string | null>(null)

  const handleViewInvoices = async (salesInvoiceNo: string) => {
    setLoadingInvoices(salesInvoiceNo)
    try {
      const response = await fetch(`/api/payments/supplier-invoices?salesInvoiceNo=${encodeURIComponent(salesInvoiceNo)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch supplier invoices')
      }
      const invoices: SupplierInvoice[] = await response.json()
      
      console.log(`[PaymentsTable] Found ${invoices.length} supplier invoice(s) for ${salesInvoiceNo}:`, invoices)
      
      // Filter to only invoices with file links
      const invoicesWithFiles = invoices.filter(
        (inv) => inv.invoice_file_link && inv.invoice_file_link.trim()
      )
      
      if (invoices.length === 0) {
        toast(
          `No supplier invoice files linked. Click the sales invoice number (${salesInvoiceNo}) to open order details.`,
          { duration: 5000, icon: 'ℹ️' }
        )
        return
      }
      
      if (invoicesWithFiles.length === 0) {
        // Show helpful message about missing file links
        const invoicesWithoutFiles = invoices.filter(
          (inv) => !inv.invoice_file_link || !inv.invoice_file_link.trim()
        )
        toast.error(
          `Found ${invoices.length} supplier invoice(s) but none have file links. Please add invoice_file_link in Supplier_Invoices sheet for: ${invoicesWithoutFiles.map(inv => inv.invoice_no || 'unknown').join(', ')}`,
          { duration: 8000 }
        )
        console.log('Invoices without file links:', invoicesWithoutFiles)
        return
      }
      
      // If only one invoice, open it directly
      if (invoicesWithFiles.length === 1) {
        window.open(invoicesWithFiles[0].invoice_file_link, '_blank', 'noopener,noreferrer')
        toast.success('Opening invoice file...')
      } else {
        // If multiple invoices, open all of them
        invoicesWithFiles.forEach((inv) => {
          if (inv.invoice_file_link) {
            window.open(inv.invoice_file_link, '_blank', 'noopener,noreferrer')
          }
        })
        toast.success(`Opening ${invoicesWithFiles.length} invoice file(s)...`)
      }
    } catch (error: any) {
      console.error('Error fetching supplier invoices:', error)
      toast.error(error.message || 'Failed to fetch invoice files')
    } finally {
      setLoadingInvoices(null)
    }
  }

  const headers = [
    { label: 'Sales Invoice', field: 'sales_invoice_no' as SortField },
    { label: 'Brand', field: 'brand' as SortField },
    { label: 'Franchisee', field: 'franchisee_name' as SortField },
    { label: 'Order Date', field: 'order_date' as SortField },
    { label: 'Order Value', field: 'total_order_value' as SortField },
    { label: 'Supplier invoices' },
    { label: 'Outstanding' },
    { label: 'Settlement Status', showInfo: true, field: 'settlement_status' as SortField },
    { label: 'Actions' },
  ]

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="ml-1 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4 text-gray-600" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4 text-gray-600" />
    )
  }

  const sortedPayments = useMemo(() => {
    const sorted = [...payments]

    sorted.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date sorting
      if (sortField === 'order_date') {
        try {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } catch {
          aValue = 0
          bValue = 0
        }
      }

      // Handle number sorting
      if (sortField === 'total_order_value') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [payments, sortField, sortDirection])

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="overflow-y-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {headers.map((header, index) => {
                  const headerLabel = header.label
                  const showInfo = header.showInfo
                  const field = header.field
                  const isSortable = !!field
                  
                  return (
                    <th
                      key={index}
                      onClick={() => field && handleSort(field)}
                      className={`px-2 xs:px-3 sm:px-6 py-2 xs:py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap ${
                        isSortable ? 'cursor-pointer hover:bg-gray-100 group' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {headerLabel}
                        {showInfo && (
                          <div className="relative group/info">
                            <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/info:block z-20 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl">
                              <div className="space-y-2.5 leading-relaxed">
                                <div>Partner has not paid for this invoice yet. Payment is still pending.</div>
                                <div>Partner has paid but funds haven't cleared yet. Waiting for bank clearance.</div>
                                <div>Partner payment is complete, but supplier invoices are still unpaid. Waiting for supplier payments to be marked as paid.</div>
                                <div>Invoice paid in full. All partner and supplier payments are complete and cleared.</div>
                              </div>
                              <div className="absolute bottom-0 left-4 transform translate-y-full">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        {field && <SortIcon field={field} />}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                sortedPayments.map((payment) => {
                  const isSettled = payment.settlement_status === 'SETTLED'
                  const rowColor = getSettlementStatusColor(payment.settlement_status)
                  
                  return (
                    <tr
                      key={payment.sales_invoice_no}
                      className={`${rowColor} hover:bg-opacity-80 transition-colors`}
                    >
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link
                          href={`/order/${encodeURIComponent(payment.sales_invoice_no)}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          title="View order details"
                        >
                          {payment.sales_invoice_no}
                        </Link>
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {payment.brand}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {payment.franchisee_name}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {payment.order_date ? new Date(payment.order_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.total_order_value)}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {(() => {
                          const linked = payment.supplier_invoices_linked_count ?? 0
                          const paid = payment.supplier_invoices_paid_count ?? 0
                          const unpaid = payment.supplier_invoices_unpaid_count ?? payment.supplier_unpaid_count ?? 0
                          if (linked === 0) {
                            return (
                              <span
                                className="text-gray-400"
                                title="Link via Order_Supplier_Allocations or Create Invoice for this order."
                              >
                                No invoices linked
                              </span>
                            )
                          }
                          const invoiceNos = (payment.supplier_invoice_numbers || []).join(', ') || '—'
                          return (
                            <span className="flex items-center gap-2 flex-wrap">
                              <span title={`Linked: ${linked}, Paid: ${paid}, Unpaid: ${unpaid}. Invoice nos: ${invoiceNos}`}>
                                {linked} linked, {paid} paid, {unpaid} unpaid
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleViewInvoices(payment.sales_invoice_no)
                                }}
                                disabled={loadingInvoices === payment.sales_invoice_no}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-xs disabled:opacity-50 disabled:cursor-wait"
                                title="Open supplier invoice files"
                              >
                                {loadingInvoices === payment.sales_invoice_no ? 'Loading...' : 'View files'}
                              </button>
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium">
                        {((payment.supplier_outstanding_amount ?? 0) > 0) ? (
                          <span className="text-red-700" title="Unpaid supplier invoice total for this order">
                            {formatCurrency(payment.supplier_outstanding_amount ?? 0)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap">
                        <div className="relative inline-flex group/status">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getSettlementStatusBadge(
                              payment.settlement_status
                            )} cursor-help`}
                          >
                            {payment.settlement_status.replace(/_/g, ' ')}
                          </span>
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/status:block z-20 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl">
                            <div className="leading-relaxed">
                              {payment.settlement_status === 'OPEN' && (
                                <div>Partner has not paid for this invoice yet. Payment is still pending.</div>
                              )}
                              {payment.settlement_status === 'PAID_NOT_CLEARED' && (
                                <div>Partner has paid but funds haven't cleared yet. Waiting for bank clearance.</div>
                              )}
                              {payment.settlement_status === 'WAITING_SUPPLIERS' && (
                                <div>Partner payment is complete, but supplier invoices are still unpaid. Waiting for supplier payments to be marked as paid.</div>
                              )}
                              {payment.settlement_status === 'SETTLED' && (
                                <div>Invoice paid in full. All partner and supplier payments are complete and cleared.</div>
                              )}
                            </div>
                            <div className="absolute bottom-0 left-4 transform translate-y-full">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                        {!payment.funds_cleared && (
                          <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                            Funds Not Cleared
                          </span>
                        )}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm">
                        {!isSettled && (
                          <div className="flex flex-col xs:flex-row gap-2">
                            {!payment.partner_paid && (
                              <button
                                onClick={() => onMarkPartnerPaid(payment.sales_invoice_no)}
                                className="px-2 xs:px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
                              >
                                Mark Franchise Paid
                              </button>
                            )}
                            {payment.settlement_status === 'WAITING_SUPPLIERS' && onCreateSupplierInvoice && (
                              <button
                                onClick={() => onCreateSupplierInvoice(payment.sales_invoice_no)}
                                className="px-2 xs:px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600"
                                title="Create supplier invoices for this order"
                              >
                                Create Invoice
                              </button>
                            )}
                            {(payment.supplier_payment_ready || payment.settlement_status === 'WAITING_SUPPLIERS') && (
                              <button
                                onClick={() => onPaySupplier(payment.sales_invoice_no)}
                                className="px-2 xs:px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                title="Record payment details after manual payment"
                              >
                                Mark as Paid
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

