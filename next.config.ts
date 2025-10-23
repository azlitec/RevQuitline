/** Security: Validate required environment variables at build/start (no secret values logged) */
const { validateEnv } = require('./scripts/validate-env');
validateEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    // Optional: web push VAPID key (configure in Firebase Console > Cloud Messaging)
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.FIREBASE_VAPID_KEY,
    // Fast-delivery flag to disable client push features
    NEXT_PUBLIC_DISABLE_PUSH_NOTIFICATIONS: process.env.DISABLE_PUSH_NOTIFICATIONS,
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', '@prisma/client']
  },
  /**
   * Security Headers: Harden application against common web vulns.
   * - X-Frame-Options: DENY (prevent clickjacking)
   * - X-Content-Type-Options: nosniff (prevent MIME type sniffing)
   * - X-XSS-Protection: 1; mode=block (legacy XSS filter header; harmless, some browsers honor)
   * - Referrer-Policy: strict-origin-when-cross-origin
   * - Permissions-Policy: disable camera/microphone/geolocation
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig