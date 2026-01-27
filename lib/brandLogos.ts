/**
 * Brand logo mapping utility
 * Maps brand slugs/names to their logo file paths
 */

export function getBrandLogo(brandSlug: string, brandName?: string): string {
  const slug = brandSlug.toLowerCase().trim()
  const name = (brandName || '').toLowerCase().trim()

  // Map by slug first (most reliable)
  const logoMap: Record<string, string> = {
    'smsh-bn': '/smsh bn logo rnd.png',
    'smsh bn': '/smsh bn logo rnd.png',
    'wing-shack': '/transparent Wing Shack logo 1080x1080.png',
    'wing-shack-co': '/transparent Wing Shack logo 1080x1080.png',
    'wing shack': '/transparent Wing Shack logo 1080x1080.png',
    'wing shack co': '/transparent Wing Shack logo 1080x1080.png',
    'wingshack': '/transparent Wing Shack logo 1080x1080.png',
    'wingshackco': '/transparent Wing Shack logo 1080x1080.png',
    'eggs-n-stuff': '/Eggs n Stuff logo.png',
    'eggs n stuff': '/Eggs n Stuff logo.png',
    'eggsnstuff': '/Eggs n Stuff logo.png',
    'eggs-nstuff': '/Eggs n Stuff logo.png',
    'admin': '/Hungry Tum Logo.jpeg',
  }

  // Check by slug
  if (logoMap[slug]) {
    return logoMap[slug]
  }

  // Check by name if provided
  if (name && logoMap[name]) {
    return logoMap[name]
  }

  // Default to Hungry Tum logo
  return '/Hungry Tum Logo.jpeg'
}

export function getBrandLogoAlt(brandSlug: string, brandName?: string): string {
  const slug = brandSlug.toLowerCase().trim()
  
  if (slug === 'admin') {
    return 'Hungry Tum'
  }
  
  return brandName || brandSlug
}

