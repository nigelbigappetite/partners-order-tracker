/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/brands/wing-shack-chatham/:path*',
        destination: '/kitchens/wing-shack-chatham/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
