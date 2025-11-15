import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances during hot reload in development
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma configuration for Vercel serverless
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