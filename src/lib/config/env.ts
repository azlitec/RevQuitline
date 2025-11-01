/**
 * Basic environment configuration - Simple and minimal
 */

// Basic environment variables
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Simple validation
if (!env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

if (!env.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET is required');
  process.exit(1);
}

// Helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';