import { redirect } from 'next/navigation'

export default function BrandPage({
  params,
}: {
  params: { brandSlug: string }
}) {
  redirect(`/brands/${params.brandSlug}/dashboard`)
}

