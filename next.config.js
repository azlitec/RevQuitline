/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration only
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable standalone output for Docker
  output: 'standalone',
}

module.exports = nextConfig
