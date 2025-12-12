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
  const isAdmin = brandSlug.toLowerCase() === 'admin'
  
  // Admin bypasses authentication and brand name check
  if (isAdmin) {
    return <>{children}</>
  }
  
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

