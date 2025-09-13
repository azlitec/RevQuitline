/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
  },
  env: {
    // Payment callback URL can be added here when billing system is implemented
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', '@prisma/client']
  }
}

module.exports = nextConfig