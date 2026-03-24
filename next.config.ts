import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: { ignoreBuildErrors: true },

  async redirects() {
    return [{ source: '/', destination: '/e', permanent: false }]
  },
}

export default nextConfig
