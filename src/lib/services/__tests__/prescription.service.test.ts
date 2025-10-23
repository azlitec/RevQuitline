import { PrescriptionService } from '../prescription.service';
import { prismaMock } from '@/lib/mocks/prisma';
import { PrescriptionRepository } from '@/lib/repositories/prescription.repo';

// Mock prisma used inside service helpers (avoid TDZ by requiring inside factory)
jest.mock('@/lib/db', () => {
  const { prismaMock } = require('@/lib/mocks/prisma');
  return { prisma: prismaMock };
});

// Mock notifications to avoid Firebase Admin init during tests
jest.mock('@/lib/notifications/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue(undefined),
  },
}));
// Mock repository calls used by service
jest.mock('@/lib/repositories/prescription.repo', () => ({
  PrescriptionRepository: {
    createPrescription: jest.fn(),
    updatePrescription: jest.fn(),
    cancelPrescription: jest.fn(),
    getPrescriptionsByPatient: jest.fn(),
    getPrescriptionsByProvider: jest.fn(),
    getPrescriptionById: jest.fn(),
    expirePrescriptions: jest.fn(),
  },
}));

describe('PrescriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no active prescriptions to warn about
    prismaMock.prescription.findMany.mockResolvedValue([]);
  });

  describe('createPrescription', () => {
    it('should create prescription successfully', async () => {
      const mockPrescription: any = {
        id: '1',
        patientId: 'patient-1',
        providerId: 'provider-1',
        medicationName: 'Varenicline',
        dosage: '1 mg',
        frequency: 'twice daily',
        duration: '12 weeks',
        quantity: 84,
        refills: 2,
        instructions: 'Take with food',
        status: 'ACTIVE',
        startDate: new Date('2025-01-01T00:00:00.000Z'),
        prescribedDate: new Date('2025-01-01T00:00:00.000Z'),
      };

      (PrescriptionRepository.createPrescription as jest.Mock).mockResolvedValue(mockPrescription);

      const result = await PrescriptionService.createPrescription(
        'provider-1',
        'patient-1',
        {
          patientId: 'patient-1',
          medicationName: 'Varenicline',
          dosage: '1 mg',
          frequency: 'twice daily',
          duration: '12 weeks',
          quantity: 84,
          refills: 2,
          instructions: 'Take with food',
          status: 'ACTIVE',
          startDate: '2025-01-01T00:00:00.000Z',
          prescribedDate: '2025-01-01T00:00:00.000Z',
        }
      );

      expect(result.prescription).toEqual(mockPrescription);
      expect(PrescriptionRepository.createPrescription).toHaveBeenCalledTimes(1);
    });

    it('should validate dosage safety before creating (rejects unsafe varenicline)', async () => {
      await expect(
        PrescriptionService.createPrescription(
          'provider-1',
          'patient-1',
          {
            patientId: 'patient-1',
            providerId: 'provider-1',
            medicationName: 'Varenicline',
            dosage: '999 mg', // Invalid single-dose per schema safety heuristic
            frequency: 'twice daily',
            duration: '12 weeks',
            quantity: 84,
            refills: 2,
            instructions: 'Take with food',
            startDate: '2025-01-01T00:00:00.000Z',
          }
        )
      ).rejects.toThrow();
      expect(PrescriptionRepository.createPrescription).not.toHaveBeenCalled();
    });
  });
});