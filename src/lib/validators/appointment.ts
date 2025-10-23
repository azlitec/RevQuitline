/**
 * Appointment validators using Zod
 * Security and safety:
 * - Enforce required fields and formats
 * - Validate date/time is in the future
 * - Provide update/reschedule schemas with safe enums
 *
 * Note:
 * - These schemas are aligned with the current app model where appointments have:
 *   title, description, date (ISO), duration, type, serviceName, price, providerId, patientId, meetingLink
 * - Routes should additionally verify provider availability and prevent double-booking at DB level.
 */
import { z } from 'zod';
import { DateTimeSchema } from '@/lib/validators/common';
import { isFutureDateTime } from '@/lib/validators/common';

// Status values used in current routes and UI
export const AppointmentStatusEnum = z.enum([
  'scheduled',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
]);

/**
 * Create Appointment schema for POST /api/appointments
 * Route will derive patientId from session if user is patient.
 */
export const createAppointmentSchema = z
  .object({
    title: z.string().min(1, 'title is required').max(200),
    description: z.string().optional(),
    date: DateTimeSchema, // ISO8601
    duration: z.coerce.number().int().positive().max(240).optional(), // minutes, cap at 4 hours
    type: z.string().min(1).default('consultation'),
    serviceName: z.string().optional(),
    price: z.coerce.number().nonnegative().optional(),
    providerId: z.string().min(1, 'providerId is required'),
    patientId: z.string().min(1).optional(), // may be injected by route if session user is patient
    meetingLink: z.string().url().optional(),
  })
  .superRefine((val, ctx) => {
    if (!isFutureDateTime(val.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date'],
        message: 'Appointment date/time must be in the future',
      });
    }
  });

/**
 * Update Appointment status schema (PATCH)
 */
export const updateAppointmentSchema = z.object({
  id: z.string().min(1),
  status: AppointmentStatusEnum,
});

/**
 * Reschedule schema: used by dedicated reschedule route
 */
export const rescheduleSchema = z
  .object({
    id: z.string().min(1),
    newDateTime: DateTimeSchema,
    reason: z.string().min(3).max(500),
  })
  .superRefine((val, ctx) => {
    if (!isFutureDateTime(val.newDateTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newDateTime'],
        message: 'New appointment date/time must be in the future',
      });
    }
  });

// Types
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;
export type CreateAppointmentDTO = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentDTO = z.infer<typeof updateAppointmentSchema>;
export type RescheduleAppointmentDTO = z.infer<typeof rescheduleSchema>;