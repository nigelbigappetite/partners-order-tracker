import { redirect } from 'next/navigation'
import { getKitchenSession } from '@/lib/kitchenAuth'
import { getBrandDefinition } from '@/lib/brands'
import KitchenNavigation from '@/components/KitchenNavigation'

export default async function KitchenLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { kitchenSlug: string }
}) {
  const { kitchenSlug } = params

  const isAuthenticated = await getKitchenSession(kitchenSlug)

  if (!isAuthenticated) {
    redirect(`/kitchens/login?kitchen=${kitchenSlug}`)
  }

  const brandDef = getBrandDefinition(kitchenSlug)
  const kitchenName = brandDef?.displayName ?? kitchenSlug

  return (
    <>
      <KitchenNavigation kitchenSlug={kitchenSlug} kitchenName={kitchenName} />
      {children}
    </>
  )
}
