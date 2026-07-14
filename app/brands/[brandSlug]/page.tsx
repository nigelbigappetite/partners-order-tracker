import { redirect } from 'next/navigation'

export default function BrandRootPage({ params }: { params: { brandSlug: string } }) {
  redirect(`/brands/${params.brandSlug}/dashboard`)
}
