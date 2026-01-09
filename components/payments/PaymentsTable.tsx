'use client'

import { PaymentTrackerRow } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import ActionButton from '@/components/ActionButton'

interface PaymentsTableProps {
  payments: PaymentTrackerRow[]
  onMarkPartnerPaid: (salesInvoiceNo: string) => void
  onPaySupplier: (salesInvoiceNo: string) => void
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
}: PaymentsTableProps) {
  const headers = [
    'Sales Invoice',
    'Brand',
    'Franchisee',
    'Order Date',
    'Order Value',
    'Settlement Status',
    'Unpaid Suppliers',
    'Actions',
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto scrollbar-thin">
        <div className="overflow-y-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-2 xs:px-3 sm:px-6 py-2 xs:py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const isSettled = payment.settlement_status === 'SETTLED'
                  const rowColor = getSettlementStatusColor(payment.settlement_status)
                  
                  return (
                    <tr
                      key={payment.sales_invoice_no}
                      className={`${rowColor} hover:bg-opacity-80 transition-colors`}
                    >
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.sales_invoice_no}
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
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getSettlementStatusBadge(
                            payment.settlement_status
                          )}`}
                        >
                          {payment.settlement_status.replace(/_/g, ' ')}
                        </span>
                        {!payment.funds_cleared && (
                          <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                            Funds Not Cleared
                          </span>
                        )}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {payment.supplier_unpaid_count > 0 ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800">
                            {payment.supplier_unpaid_count} unpaid
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 xs:px-3 sm:px-6 py-3 whitespace-nowrap text-sm">
                        {isSettled ? (
                          <span className="text-gray-400 text-xs">Read-only</span>
                        ) : (
                          <div className="flex flex-col xs:flex-row gap-2">
                            {!payment.partner_paid && (
                              <button
                                onClick={() => onMarkPartnerPaid(payment.sales_invoice_no)}
                                className="px-2 xs:px-3 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
                              >
                                Mark Franchise Paid
                              </button>
                            )}
                            {payment.supplier_payment_ready && (
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

