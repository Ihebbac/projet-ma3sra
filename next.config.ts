import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }]
  },
}

export default nextConfig
