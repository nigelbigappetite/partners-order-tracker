import { getBrandDefinition } from '@/lib/brands'
import KitchenSiteOrders from '@/components/orders/KitchenSiteOrders'
import { redirect } from 'next/navigation'

export default async function KitchenOrdersPage({
  params,
}: {
  params: { kitchenSlug: string }
}) {
  const { kitchenSlug } = params
  const brandDef = getBrandDefinition(kitchenSlug)

  if (!brandDef?.orderingSiteId) {
    redirect(`/kitchens/${kitchenSlug}/sales`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8">
        <div className="mb-6 xs:mb-8">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900">Stock Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Your Hungry Tum supply orders and spend.</p>
        </div>
        <KitchenSiteOrders brandSlug={kitchenSlug} siteId={brandDef.orderingSiteId} />
      </div>
    </div>
  )
}
