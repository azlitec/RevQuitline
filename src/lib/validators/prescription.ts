import { z } from 'zod';

export const dosageRegex = /^(\d+(\.\d+)?)\s?(mg|mcg)$/i;

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

const StatusEnum = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']);

export const PrescriptionCreateSchema = z
  .object({
    patientId: z.string().min(1, 'patientId is required'),
    providerId: z.string().min(1).optional(),
    appointmentId: z.string().min(1).optional(),
    medicationName: z.string().min(1, 'Medication name is required'),
    dosage: z.string().regex(dosageRegex, 'Invalid dosage'),
    frequency: z.string().min(1, 'Frequency is required'),
    duration: z.string().min(1, 'Duration is required'),
    quantity: z.number().int().positive().max(10000).optional(),
    refills: z.number().int().min(0).max(12).optional(),
    instructions: z.string().min(1, 'Instructions are required'),
    status: StatusEnum.default('DRAFT'),
    prescribedDate: z.string().refine(isIsoDateString, 'prescribedDate must be an ISO date string'),
    startDate: z.string().refine(isIsoDateString, 'startDate must be an ISO date string'),
    endDate: z.string().refine(isIsoDateString, 'endDate must be an ISO date string').optional(),
    pharmacy: z.string().optional(),
    pharmacyPhone: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      const name = String(data.medicationName || '').toLowerCase();
      if (!name.includes('varenicl')) return true; // only enforce for varenicline
      const m = String(data.dosage || '').toLowerCase().match(/^(\d+(\.\d+)?)\s?mg$/i);
      if (!m) return true;
      const mg = parseFloat(m[1]);
      // Safety heuristic: single dose of varenicline should not exceed 1 mg
      return mg <= 1;
    },
    {
      path: ['dosage'],
      message: 'Unsafe dosage for Varenicline: max 1 mg per dose',
    }
  );

export type CreatePrescriptionInput = z.infer<typeof PrescriptionCreateSchema>;

const PrescriptionUpdateSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    status: StatusEnum.optional(),
    dosage: z.string().regex(dosageRegex).optional(),
    frequency: z.string().min(1).optional(),
    duration: z.string().min(1).optional(),
    quantity: z.number().int().positive().max(10000).optional(),
    refills: z.number().int().min(0).max(12).optional(),
    instructions: z.string().optional(),
    startDate: z.string().refine(isIsoDateString, 'startDate must be an ISO date string').optional(),
    endDate: z.string().refine(isIsoDateString, 'endDate must be an ISO date string').optional(),
    pharmacy: z.string().optional(),
    pharmacyPhone: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

export function validateCreate(input: unknown) {
  return PrescriptionCreateSchema.parse(input);
}

export function validateUpdate(input: unknown) {
  return PrescriptionUpdateSchema.parse(input);
}