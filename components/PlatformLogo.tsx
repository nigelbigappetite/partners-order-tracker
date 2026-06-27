const PLATFORM_LOGOS: Record<string, string> = {
  uber_eats: '/uber eats logo.png',
  deliveroo: '/deliveroo logo.png',
  just_eat: '/just eat logo.png',
}

const PLATFORM_LABELS: Record<string, string> = {
  uber_eats: 'Uber Eats',
  deliveroo: 'Deliveroo',
  just_eat: 'Just Eat',
  other: 'Other',
  unknown: 'Other',
}

export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform.replace(/_/g, ' ')
}

export default function PlatformLogo({
  platform,
  height = 20,
}: {
  platform: string
  height?: number
}) {
  const src = PLATFORM_LOGOS[platform]
  const label = getPlatformLabel(platform)

  if (!src) {
    return <span className="text-sm text-gray-700">{label}</span>
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      style={{ height: `${height}px`, width: 'auto' }}
      className="object-contain"
    />
  )
}
