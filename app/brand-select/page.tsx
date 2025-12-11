'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import BrandCard from '@/components/BrandCard'
import { BrandAuthData } from '@/lib/sheets'

export default function BrandSelectPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<BrandAuthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands/auth')
      const data = await response.json()
      
      if (response.ok) {
        console.log('[BrandSelect] Fetched brands:', data)
        setBrands(Array.isArray(data) ? data : [])
      } else {
        console.error('[BrandSelect] API error:', data)
        // Show error message to user
        if (data.error) {
          alert(`Error loading brands: ${data.error}`)
        }
      }
    } catch (error: any) {
      console.error('[BrandSelect] Error fetching brands:', error)
      alert(`Failed to load brands: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBrandSelect = (slug: string) => {
    router.push(`/brands/${slug}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header with just logo */}
      <nav className="border-b border-brand-light bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg ring-2 ring-brand-primary/20">
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
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Partners Order Tracker</h1>
          <p className="mt-2 text-gray-600">Choose a brand to view your dashboard</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading brands...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No brands available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <BrandCard
                key={brand.slug}
                brandSlug={brand.slug}
                brandName={brand.brandName}
                onClick={() => handleBrandSelect(brand.slug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

