import { PrescriptionCreateSchema } from '../prescription';

describe('Prescription Validator', () => {
  it('should accept valid prescription data', () => {
    const valid = {
      patientId: 'cuid123',
      medicationName: 'Varenicline',
      dosage: '1 mg',
      frequency: 'twice daily',
      duration: '12 weeks',
      quantity: 84,
      refills: 2,
      instructions: 'Take with food',
      // Required date fields
      startDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
      prescribedDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
    };

    expect(() => PrescriptionCreateSchema.parse(valid)).not.toThrow();
  });

  it('should reject missing required fields', () => {
    const invalid = {
      patientId: 'cuid123',
      // Missing medicationName
      dosage: '1 mg',
      frequency: 'twice daily',
      duration: '12 weeks',
      quantity: 84,
      instructions: 'Take with food',
      startDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
    };

    expect(() => PrescriptionCreateSchema.parse(invalid)).toThrow();
  });

  it('should reject unsafe dosage for varenicline', () => {
    const invalid = {
      patientId: 'cuid123',
      medicationName: 'Varenicline',
      dosage: '2 mg', // > 1 mg triggers safety heuristic
      frequency: 'twice daily',
      duration: '12 weeks',
      quantity: 84,
      instructions: 'Take with food',
      startDate: new Date('2025-01-01T00:00:00.000Z').toISOString(),
    };

    expect(() => PrescriptionCreateSchema.parse(invalid)).toThrow();
  });
});