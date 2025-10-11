import { z } from 'zod';
import { AttachmentMetaSchema, ProgressNoteDraftCreateSchema, ProgressNoteUpdateSchema, ProgressNoteFinalizeSchema } from '@/lib/api/guard';

// Common pagination
export const PaginationSchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// CSV include for EMR summary expansions
export const EmrIncludeCsvSchema = z.string().optional();

// EMR summary query: allow minimal expansions and filters
export const EmrSummaryQuerySchema = z.object({
  include: EmrIncludeCsvSchema, // e.g. "consultations,notes,prescriptions"
});

// Consultations (Encounters) queries and DTOs
export const EncounterModeEnum = z.enum(['in_person','telemedicine','phone','messaging']);
export const EncounterStatusEnum = z.enum(['scheduled','in_progress','completed','cancelled']);

export const EmrConsultationListQuerySchema = z.object({
  status: EncounterStatusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).merge(PaginationSchema);

export const EmrConsultationCreateSchema = z.object({
  patientId: z.string().min(1),
  type: z.string().min(1),
  mode: EncounterModeEnum.default('in_person'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  renderingProviderId: z.string().optional(),
  status: EncounterStatusEnum.default('scheduled'),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export const EmrConsultationUpdateSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().optional(),
  type: z.string().optional(),
  mode: EncounterModeEnum.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().optional(),
  renderingProviderId: z.string().optional(),
  status: EncounterStatusEnum.optional(),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

// Prescriptions DTOs
export const PrescriptionStatusEnum = z.enum(['active','discontinued']);

export const EmrPrescriptionListQuerySchema = z.object({
  status: PrescriptionStatusEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  keywords: z.string().optional(),
}).merge(PaginationSchema);

export const EmrPrescriptionCreateSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  medicationId: z.string().optional(),
  medicationName: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  duration: z.string().optional(),
  notes: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  status: PrescriptionStatusEnum.default('active'),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

export const EmrPrescriptionUpdateSchema = z.object({
  id: z.string().min(1),
  medicationId: z.string().optional(),
  medicationName: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  duration: z.string().optional(),
  notes: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  status: PrescriptionStatusEnum.optional(),
  attachments: z.array(AttachmentMetaSchema).optional(),
});

// Notes (Progress Notes) queries and DTO aliases
export const ProgressNoteStatusEnum = z.enum(['draft','finalized','amended']);

export const EmrNotesListQuerySchema = z.object({
  encounterId: z.string().optional(),
  status: ProgressNoteStatusEnum.optional(),
  keywords: z.string().optional(),
}).merge(PaginationSchema);

export const EmrNoteDraftCreateSchema = ProgressNoteDraftCreateSchema;
export const EmrNoteDraftUpdateSchema = ProgressNoteUpdateSchema;
export const EmrNoteFinalizeSchema = ProgressNoteFinalizeSchema;

// Utility: derive normalized includes array from CSV
export function parseEmrIncludes(include?: string): Array<'consultations'|'notes'|'prescriptions'> {
  if (!include) return [];
  return include
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .filter(s => ['consultations','notes','prescriptions'].includes(s)) as Array<'consultations'|'notes'|'prescriptions'>;
}

// Types
export type Pagination = z.infer<typeof PaginationSchema>;
export type EmrSummaryQuery = z.infer<typeof EmrSummaryQuerySchema>;
export type EmrConsultationListQuery = z.infer<typeof EmrConsultationListQuerySchema>;
export type EmrConsultationCreate = z.infer<typeof EmrConsultationCreateSchema>;
export type EmrConsultationUpdate = z.infer<typeof EmrConsultationUpdateSchema>;
export type EmrPrescriptionListQuery = z.infer<typeof EmrPrescriptionListQuerySchema>;
export type EmrPrescriptionCreate = z.infer<typeof EmrPrescriptionCreateSchema>;
export type EmrPrescriptionUpdate = z.infer<typeof EmrPrescriptionUpdateSchema>;
export type EmrNotesListQuery = z.infer<typeof EmrNotesListQuerySchema>;

// Backward compatibility notes:
// - Encounter payloads mirror existing Encounters endpoints while removing providerId from body (taken from session).
// - ProgressNote DTOs are reused from guard.ts to avoid duplication and ensure identical validation.
// - Prescription DTOs anticipate a future Prisma Prescription model; fields chosen to support common eRx data.