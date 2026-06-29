import { redirect } from 'next/navigation'

export default function KitchenRootPage({ params }: { params: { kitchenSlug: string } }) {
  redirect(`/kitchens/${params.kitchenSlug}/dashboard`)
}
