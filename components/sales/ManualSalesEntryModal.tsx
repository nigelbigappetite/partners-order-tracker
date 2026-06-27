'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { getCanonicalBrands } from '@/lib/brands'
import toast from 'react-hot-toast'

interface ManualSalesEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: () => void
}

const brands = getCanonicalBrands()

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function ManualSalesEntryModal({
  isOpen,
  onClose,
  onImportComplete,
}: ManualSalesEntryModalProps) {
  const [date, setDate] = useState(getYesterday)
  const [brandSlug, setBrandSlug] = useState(brands[0]?.canonicalSlug || '')
  const [location, setLocation] = useState('')
  const [platform, setPlatform] = useState('uber_eats')
  const [revenue, setRevenue] = useState('')
  const [grossSales, setGrossSales] = useState('')
  const [orders, setOrders] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !brandSlug || !location.trim() || !revenue || !orders) {
      toast.error('Please fill in all required fields')
      return
    }

    const revenueNum = parseFloat(revenue)
    const grossSalesNum = grossSales ? parseFloat(grossSales) : revenueNum
    const ordersNum = parseInt(orders, 10)

    if (isNaN(revenueNum) || isNaN(ordersNum) || ordersNum < 0) {
      toast.error('Invalid number values')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/sales/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_slug: brandSlug,
          rows: [
            {
              Date: date,
              Revenue: revenueNum,
              GrossSales: grossSalesNum,
              Count: ordersNum,
              Location: location.trim(),
              Platform: platform || undefined,
            },
          ],
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Import failed')

      if (result.imported > 0) {
        toast.success('Sales entry added')
      } else {
        toast('Entry already exists — skipped', { icon: '⚠️' })
      }

      // Reset form
      setDate(getYesterday())
      setLocation('')
      setPlatform('uber_eats')
      setRevenue('')
      setGrossSales('')
      setOrders('')

      if (onImportComplete) onImportComplete()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Sales Entry">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Brand <span className="text-red-500">*</span>
            </label>
            <select
              value={brandSlug}
              onChange={(e) => setBrandSlug(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {brands.map((brand) => (
                <option key={brand.canonicalSlug} value={brand.canonicalSlug}>
                  {brand.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Wing Shack Co- Chatham"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="uber_eats">Uber Eats</option>
              <option value="deliveroo">Deliveroo</option>
              <option value="just_eat">Just Eat</option>
              <option value="">Other / Unknown</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Revenue £ <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <p className="mt-1 text-xs text-gray-400">Net payout</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Gross Sales £</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={grossSales}
              onChange={(e) => setGrossSales(e.target.value)}
              placeholder="Defaults to revenue"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <p className="mt-1 text-xs text-gray-400">Optional</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Orders <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={orders}
              onChange={(e) => setOrders(e.target.value)}
              placeholder="0"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
          >
            {isSubmitting ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
