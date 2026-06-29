'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import BrandCard from '@/components/BrandCard'

interface BrandEntry {
  slug: string
  brandName: string
}

interface KitchenEntry {
  slug: string
  kitchenName: string
}

export default function BrandSelectPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<BrandEntry[]>([])
  const [kitchens, setKitchens] = useState<KitchenEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/brands/auth').then((r) => r.json()),
      fetch('/api/kitchens/list').then((r) => r.json()),
    ])
      .then(([brandsData, kitchensData]) => {
        setBrands(Array.isArray(brandsData) ? brandsData : [])
        setKitchens(Array.isArray(kitchensData) ? kitchensData : [])
      })
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
          <p className="mt-1.5 xs:mt-2 text-xs xs:text-sm sm:text-base text-gray-600">Select a brand or kitchen to continue</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading…</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Brands */}
            {brands.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">Brands</h2>
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
              </section>
            )}

            {/* Kitchens */}
            {kitchens.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">Kitchens</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {kitchens.map((kitchen) => (
                    <BrandCard
                      key={kitchen.slug}
                      brandSlug={kitchen.slug}
                      brandName={kitchen.kitchenName}
                      onClick={() => router.push(`/kitchens/${kitchen.slug}/sales`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
