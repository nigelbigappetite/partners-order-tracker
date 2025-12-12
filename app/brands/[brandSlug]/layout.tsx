import { redirect } from 'next/navigation'
import { getBrandSession, getBrandNameFromSlug } from '@/lib/brandAuth'
import BrandAuthModal from '@/components/BrandAuthModal'

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { brandSlug: string }
}) {
  const { brandSlug } = params
  
  const isAuthenticated = await getBrandSession(brandSlug)
  const brandName = await getBrandNameFromSlug(brandSlug)

  if (!brandName) {
    redirect('/brand-select')
  }

  if (!isAuthenticated) {
    return <BrandAuthModal brandSlug={brandSlug} brandName={brandName} />
  }

  return <>{children}</>
}

