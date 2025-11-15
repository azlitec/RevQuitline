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
  // Ensure CSS is properly optimized
  experimental: {
    optimizeCss: true,
  },
  // Ensure static files are properly served
  compress: true,
}

module.exports = nextConfig
