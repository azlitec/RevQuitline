import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export type Context = {
  prisma: PrismaClient;
};

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  };
};

/**
 * Deep Prisma mock usable in tests via:
 *   import { prismaMock, resetPrismaMock } from '@/lib/mocks/prisma';
 *   beforeEach(() => resetPrismaMock());
 */
export const prismaMock = mockDeep<PrismaClient>();

export function resetPrismaMock() {
  mockReset(prismaMock);
}