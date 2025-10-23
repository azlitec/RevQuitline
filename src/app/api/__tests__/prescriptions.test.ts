/**
 * @jest-environment node
 */
import { POST } from '../provider/prescriptions/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
/** prismaMock will be required within jest.mock factory to avoid TDZ */

// Mock auth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma used by guard.ensureProviderPatientLink and any repository usage
jest.mock('@/lib/db', () => {
  const { prismaMock } = require('@/lib/mocks/prisma');
  return { prisma: prismaMock };
});

// Mock controller to avoid hitting database layers
jest.mock('@/lib/controllers/prescription.controller', () => ({
  PrescriptionController: {
    handleCreatePrescription: jest.fn(async () => ({
      prescription: { id: 'rx-1', patientId: 'patient-1' },
    })),
  },
}));

// Silence notifications
jest.mock('@/lib/notifications/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('POST /api/provider/prescriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default approved provider↔patient link
    const { prismaMock } = require('@/lib/mocks/prisma');
    prismaMock.doctorPatientConnection.findFirst.mockResolvedValue({ patientId: 'patient-1' } as any);
  });

  it('should create prescription when authenticated as provider', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'provider-1', role: 'PROVIDER', isProvider: true },
    });

    const req = new NextRequest('http://localhost:3000/api/provider/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        medicationName: 'Varenicline',
        dosage: '1 mg',
        frequency: 'twice daily',
        duration: '12 weeks',
        quantity: 84,
        refills: 2,
        instructions: 'Take with food',
        startDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        prescribedDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.prescription?.id || data.data?.id).toBeDefined();
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/provider/prescriptions', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);

    expect(response.status).toBe(401);
  });

  it('should return 403 when authenticated as patient (USER)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    });

    const req = new NextRequest('http://localhost:3000/api/provider/prescriptions', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);

    expect(response.status).toBe(403);
  });
});