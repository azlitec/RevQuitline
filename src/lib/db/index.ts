import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances during hot reload in development
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Enhanced Prisma configuration for Vercel serverless
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}