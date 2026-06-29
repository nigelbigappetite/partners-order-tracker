'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import BrandCard from '@/components/BrandCard'

interface BrandEntry {
  slug: string
  brandName: string
}

export default function BrandSelectPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<BrandEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brands/auth')
      .then((r) => r.json())
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[BrandSelect] Error fetching:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-brand-light bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6">
          <div className="flex h-16 items-center">
            <div className="relative h-9 w-9 xs:h-10 xs:w-10 flex-shrink-0 overflow-hidden rounded-lg ring-2 ring-brand-primary/20">
              <Image
                src="/Hungry Tum Logo.jpeg"
                alt="Hungry Tum"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-4 xs:py-6 sm:py-12">
        <div className="mb-6 xs:mb-8 sm:mb-10">
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">Partner OS</h1>
          <p className="mt-1.5 xs:mt-2 text-xs xs:text-sm sm:text-base text-gray-600">Select a brand to continue</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <BrandCard
                key={brand.slug}
                brandSlug={brand.slug}
                brandName={brand.brandName}
                onClick={() => router.push(`/brands/${brand.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
