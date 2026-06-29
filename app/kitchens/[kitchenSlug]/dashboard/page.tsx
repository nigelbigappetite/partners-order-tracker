'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { KitchenSales } from '@/lib/types'
import WSCChathamPartnerAccount from '@/components/partners/WSCChathamPartnerAccount'
import toast from 'react-hot-toast'

export default function KitchenDashboardPage() {
  const params = useParams()
  const kitchenSlug = params.kitchenSlug as string

  const [sales, setSales] = useState<KitchenSales[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sales?brand=${encodeURIComponent(kitchenSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        // Exclude deliveroo rows — WSCChathamPartnerAccount fetches Deliveroo data itself
        setSales((data.sales || []).filter((s: KitchenSales) => s.platform !== 'deliveroo'))
      })
      .catch(() => toast.error('Failed to load sales data'))
      .finally(() => setLoading(false))
  }, [kitchenSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500">
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <WSCChathamPartnerAccount brandSlug={kitchenSlug} sales={sales} />
      </div>
    </div>
  )
}
