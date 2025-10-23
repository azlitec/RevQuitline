import '@testing-library/jest-dom';

/**
 * Test environment variables
 */
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DIRECT_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
// Mock Firebase Admin messaging to avoid initialization in tests
// Ensures imports of '@/lib/firebase/admin' do not access global.__firebaseAdmin
jest.mock('@/lib/firebase/admin', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    firebaseAdminApp: { name: 'test' },
    adminMessaging: { send: mockSend },
  };
});