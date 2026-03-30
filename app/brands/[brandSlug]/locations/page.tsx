'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function BrandLocationsPage() {
  const params = useParams()
  const router = useRouter()
  const brandSlug = params.brandSlug as string

  useEffect(() => {
    router.replace(`/brands/${brandSlug}/orders`)
  }, [brandSlug, router])

  return null
}
