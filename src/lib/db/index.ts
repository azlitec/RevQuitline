import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances during hot reload in development
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Validate DATABASE_URL configuration for Vercel serverless compatibility
 * 
 * Requirements for Vercel:
 * - Must use port 6543 (not 5432) for pgbouncer connection pooling
 * - Must include pgbouncer=true parameter
 * - Should include connection_limit=1 to prevent connection exhaustion
 */
function validateDatabaseUrl(): void {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('[Prisma] DATABASE_URL is not configured');
    return;
  }

  const hasCorrectPort = dbUrl.includes(':6543');
  const hasPgBouncer = dbUrl.includes('pgbouncer=true');
  const hasConnectionLimit = dbUrl.includes('connection_limit=');

  if (!hasCorrectPort) {
    console.warn('[Prisma] DATABASE_URL should use port 6543 for Vercel serverless compatibility');
  }

  if (!hasPgBouncer) {
    console.warn('[Prisma] DATABASE_URL should include pgbouncer=true for connection pooling');
  }

  if (!hasConnectionLimit) {
    console.warn('[Prisma] DATABASE_URL should include connection_limit parameter');
  }

  if (hasCorrectPort && hasPgBouncer) {
    console.log('[Prisma] Database configuration validated for Vercel serverless');
  }
}

// Validate configuration on initialization
validateDatabaseUrl();

// Enhanced Prisma configuration for Vercel serverless
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Connection lifecycle management
export async function disconnectDB() {
  await prisma.$disconnect();
}

// Graceful shutdown (only in production to avoid memory leak warnings in dev)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    console.log('[Prisma] Disconnecting from database...');
    await disconnectDB();
  });
}