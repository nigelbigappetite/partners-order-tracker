'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import Modal from '@/components/Modal'
import { Supplier, SupplierInvoice } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Upload, FileText, CheckCircle, Link2, Paperclip } from 'lucide-react'

type StatusFilter = 'all' | 'to_pay' | 'paid'

export default function SupplierInvoicesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [salesInvoiceNos, setSalesInvoiceNos] = useState<string[]>([])
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [file, setFile] = useState<File | null>(null)
  const [supplier, setSupplier] = useState('')
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('')
  const [amount, setAmount] = useState('')
  const [salesInvoiceNo, setSalesInvoiceNo] = useState('')
  const [markAsPaid, setMarkAsPaid] = useState(false)
  const [paidDate, setPaidDate] = useState('')
  const [paymentReference, setPaymentReference] = useState('')

  const [markPaidInvoice, setMarkPaidInvoice] = useState<SupplierInvoice | null>(null)
  const [markPaidDate, setMarkPaidDate] = useState('')
  const [markPaidRef, setMarkPaidRef] = useState('')
  const [markPaidSubmitting, setMarkPaidSubmitting] = useState(false)

  const [linkOrderInvoice, setLinkOrderInvoice] = useState<SupplierInvoice | null>(null)
  const [linkOrderSalesNo, setLinkOrderSalesNo] = useState('')
  const [linkOrderAmount, setLinkOrderAmount] = useState('')
  const [linkOrderSubmitting, setLinkOrderSubmitting] = useState(false)

  const [attachInvoiceId, setAttachInvoiceId] = useState<string | null>(null)
  const [attachSubmitting, setAttachSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSuppliers()
    fetchSalesInvoiceNos()
    fetchInvoices()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data)
      }
    } catch {
      // ignore
    }
  }

  const fetchSalesInvoiceNos = async () => {
    try {
      const res = await fetch('/api/payments')
      if (res.ok) {
        const data = await res.json()
        const nos = Array.from(new Set((data || []).map((p: any) => p.sales_invoice_no).filter(Boolean))) as string[]
        nos.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
        setSalesInvoiceNos(nos)
      }
    } catch {
      // ignore
    }
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supplier-invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(Array.isArray(data) ? data : [])
      } else {
        setInvoices([])
      }
    } catch {
      setInvoices([])
      toast.error('Failed to load supplier invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file')
      return
    }
    if (!supplier.trim()) {
      toast.error('Supplier is required')
      return
    }
    if (!supplierInvoiceNo.trim()) {
      toast.error('Supplier invoice number is required')
      return
    }
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    if (!salesInvoiceNo.trim()) {
      toast.error('Link to order is required')
      return
    }
    if (markAsPaid && paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
      toast.error('Paid date must be YYYY-MM-DD')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/supplier-invoices/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      const { url } = await uploadRes.json()

      const createRes = await fetch('/api/supplier-invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_invoice_no: salesInvoiceNo.trim(),
          invoices: [{
            supplier_invoice_no: supplierInvoiceNo.trim(),
            supplier: supplier.trim(),
            amount: amountNum,
            allocated_amount: amountNum,
            invoice_file_link: url,
            paid: markAsPaid,
            paid_date: markAsPaid && paidDate ? paidDate : undefined,
            payment_reference: markAsPaid && paymentReference.trim() ? paymentReference.trim() : undefined,
          }],
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create supplier invoice')
      }

      toast.success('Supplier invoice uploaded and linked')
      setFile(null)
      setSupplier('')
      setSupplierInvoiceNo('')
      setAmount('')
      setSalesInvoiceNo('')
      setMarkAsPaid(false)
      setPaidDate('')
      setPaymentReference('')
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!markPaidInvoice?.invoice_no) return
    if (!markPaidDate || !/^\d{4}-\d{2}-\d{2}$/.test(markPaidDate)) {
      toast.error('Paid date is required (YYYY-MM-DD)')
      return
    }
    setMarkPaidSubmitting(true)
    try {
      const res = await fetch('/api/admin/supplier-invoices/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_invoice_no: markPaidInvoice.invoice_no,
          paid_date: markPaidDate,
          payment_reference: markPaidRef.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to mark as paid')
      }
      toast.success('Marked as paid')
      setMarkPaidInvoice(null)
      setMarkPaidDate('')
      setMarkPaidRef('')
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setMarkPaidSubmitting(false)
    }
  }

  const handleLinkOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkOrderInvoice?.id) return
    if (!linkOrderSalesNo.trim()) {
      toast.error('Select an order to link')
      return
    }
    const amountNum = linkOrderAmount.trim() ? parseFloat(linkOrderAmount) : undefined
    if (linkOrderAmount.trim() && (isNaN(amountNum!) || amountNum! < 0)) {
      toast.error('Amount must be a number ≥ 0')
      return
    }
    setLinkOrderSubmitting(true)
    try {
      const body: { sales_invoice_no: string; amount?: number } = { sales_invoice_no: linkOrderSalesNo.trim() }
      if (amountNum !== undefined) body.amount = amountNum
      const res = await fetch(`/api/payments/supplier-invoices/${linkOrderInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to link')
      }
      toast.success('Linked to order')
      setLinkOrderInvoice(null)
      setLinkOrderSalesNo('')
      setLinkOrderAmount('')
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setLinkOrderSubmitting(false)
    }
  }

  const handleAttachFile = (invoiceId: string) => {
    setAttachInvoiceId(invoiceId)
    fileInputRef.current?.click()
  }

  const handleAttachFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    if (!chosen || !attachInvoiceId) return
    setAttachSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', chosen)
      formData.append('supplier_invoice_id', attachInvoiceId)
      const res = await fetch('/api/supplier-invoices/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      toast.success('File attached')
      fetchInvoices()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setAttachSubmitting(false)
      setAttachInvoiceId(null)
      e.target.value = ''
    }
  }

  const filteredInvoices =
    statusFilter === 'all'
      ? invoices
      : statusFilter === 'paid'
        ? invoices.filter((inv) => inv.paid)
        : invoices.filter((inv) => !inv.paid)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleAttachFileChange}
      />
      <Navigation />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900">Supplier invoices</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload, link to an order, and mark as paid. No manual sheet updates.
        </p>

        {/* Upload & link form */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload & link supplier invoice</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF or image) *</label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier invoice number *</label>
                <input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-123"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to order (sales invoice) *</label>
              <select
                value={salesInvoiceNo}
                onChange={(e) => setSalesInvoiceNo(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select order</option>
                {salesInvoiceNos.map((no) => (
                  <option key={no} value={no}>{no}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="markAsPaid"
                checked={markAsPaid}
                onChange={(e) => setMarkAsPaid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="markAsPaid" className="text-sm font-medium text-gray-700">Mark as paid now</label>
            </div>
            {markAsPaid && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment reference</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {submitting ? 'Uploading...' : 'Upload & link'}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">All supplier invoices</h2>
            <div className="flex gap-2">
              {(['all', 'to_pay', 'paid'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    statusFilter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'to_pay' ? 'To pay' : 'Paid'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">Loading...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No supplier invoices {statusFilter !== 'all' ? `(${statusFilter === 'paid' ? 'paid' : 'to pay'})` : ''}.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Linked order</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Supplier</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Invoice no</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">File</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id ?? inv.invoice_no} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {inv.sales_invoice_no ? (
                          inv.sales_invoice_no
                        ) : inv.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setLinkOrderInvoice(inv)
                              setLinkOrderSalesNo('')
                              setLinkOrderAmount(inv.amount != null ? String(inv.amount) : '')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                          >
                            <Link2 className="h-3.5 w-3.5" /> Link to order
                          </button>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{inv.supplier || '–'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{inv.invoice_no || '–'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {inv.amount != null ? formatCurrency(inv.amount) : '–'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {inv.paid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            <CheckCircle className="h-3.5 w-3.5" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            To pay
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {inv.invoice_file_link ? (
                          <span className="inline-flex items-center gap-2">
                            <a
                              href={inv.invoice_file_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <FileText className="h-4 w-4" /> Open
                            </a>
                            {inv.id && (
                              <button
                                type="button"
                                onClick={() => handleAttachFile(inv.id!)}
                                disabled={attachSubmitting}
                                className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                              >
                                {attachSubmitting && attachInvoiceId === inv.id ? 'Uploading...' : 'Replace'}
                              </button>
                            )}
                          </span>
                        ) : inv.id ? (
                          <button
                            type="button"
                            onClick={() => handleAttachFile(inv.id!)}
                            disabled={attachSubmitting}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            <Paperclip className="h-3.5 w-3.5" /> {attachSubmitting && attachInvoiceId === inv.id ? 'Uploading...' : 'Attach file'}
                          </button>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {!inv.paid && (
                          <button
                            type="button"
                            onClick={() => {
                              setMarkPaidInvoice(inv)
                              setMarkPaidDate(today)
                              setMarkPaidRef('')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            Mark as paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Link to order modal */}
      <Modal
        isOpen={!!linkOrderInvoice}
        onClose={() => { setLinkOrderInvoice(null); setLinkOrderSalesNo(''); setLinkOrderAmount('') }}
        title="Link to order"
      >
        {linkOrderInvoice && (
          <form onSubmit={handleLinkOrderSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              {linkOrderInvoice.supplier} – {linkOrderInvoice.invoice_no}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales invoice (order) *</label>
              <select
                value={linkOrderSalesNo}
                onChange={(e) => setLinkOrderSalesNo(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select order</option>
                {salesInvoiceNos.map((no) => (
                  <option key={no} value={no}>{no}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (optional – updates invoice amount)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={linkOrderAmount}
                onChange={(e) => setLinkOrderAmount(e.target.value)}
                placeholder="e.g. 150.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setLinkOrderInvoice(null); setLinkOrderSalesNo(''); setLinkOrderAmount('') }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={linkOrderSubmitting}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {linkOrderSubmitting ? 'Linking...' : 'Link'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Mark as paid modal */}
      <Modal
        isOpen={!!markPaidInvoice}
        onClose={() => { setMarkPaidInvoice(null); setMarkPaidDate(''); setMarkPaidRef('') }}
        title="Mark as paid"
      >
        {markPaidInvoice && (
          <form onSubmit={handleMarkPaidSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              {markPaidInvoice.supplier} – {markPaidInvoice.invoice_no} ({formatCurrency(markPaidInvoice.amount ?? 0)})
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paid date (YYYY-MM-DD) *</label>
              <input
                type="date"
                value={markPaidDate}
                onChange={(e) => setMarkPaidDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment reference</label>
              <input
                type="text"
                value={markPaidRef}
                onChange={(e) => setMarkPaidRef(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setMarkPaidInvoice(null); setMarkPaidDate(''); setMarkPaidRef('') }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={markPaidSubmitting}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {markPaidSubmitting ? 'Saving...' : 'Mark as paid'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
