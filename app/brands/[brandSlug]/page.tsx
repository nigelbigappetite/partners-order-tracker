import { redirect } from 'next/navigation'

export default function BrandPage({
  params,
}: {
  params: { brandSlug: string }
}) {
  const brandSlugLower = params.brandSlug.toLowerCase()
  // SMSH BN should redirect to sales, others to dashboard
  if (brandSlugLower === 'smsh-bn' || brandSlugLower === 'smsh bn') {
    redirect(`/brands/${params.brandSlug}/sales`)
  }
  redirect(`/brands/${params.brandSlug}/dashboard`)
}

