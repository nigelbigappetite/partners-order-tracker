'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getBrandLogo, getBrandLogoAlt } from '@/lib/brandLogos'
import { createBrandSlug } from '@/lib/brandUtils'

interface BrandLogoCellProps {
  brandName: string
}

export default function BrandLogoCell({ brandName }: BrandLogoCellProps) {
  const [logoError, setLogoError] = useState(false)
  const brandSlug = createBrandSlug(brandName)
  const logoPath = getBrandLogo(brandSlug, brandName)
  const logoAlt = getBrandLogoAlt(brandSlug, brandName)

  return (
    <div className="flex items-center space-x-3">
      {!logoError ? (
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg">
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white font-bold text-xs flex-shrink-0 shadow-md">
          {brandName.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-medium text-gray-900">{brandName}</span>
    </div>
  )
}

