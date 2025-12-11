'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getBrandLogo, getBrandLogoAlt } from '@/lib/brandLogos'

interface BrandCardProps {
  brandSlug: string
  brandName: string
  onClick: () => void
}

export default function BrandCard({ brandSlug, brandName, onClick }: BrandCardProps) {
  const [logoError, setLogoError] = useState(false)
  const logoPath = getBrandLogo(brandSlug, brandName)
  const logoAlt = getBrandLogoAlt(brandSlug, brandName)

  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-lg hover:border-brand-primary w-full"
    >
      <div className="flex items-center space-x-4">
        {!logoError ? (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-2 ring-brand-primary/20">
            <Image
              src={logoPath}
              alt={logoAlt}
              fill
              className="object-contain"
              unoptimized
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-primary text-white font-bold text-xl flex-shrink-0 shadow-md">
            {brandName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{brandName}</h3>
          <p className="mt-1 text-sm text-gray-500">Click to access dashboard</p>
        </div>
      </div>
    </button>
  )
}

