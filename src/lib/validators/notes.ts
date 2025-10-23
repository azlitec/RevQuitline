/**
 * Notes validators using Zod
 * Security:
 * - Sanitize HTML content to prevent XSS
 * - Enforce minimal field constraints and safe lengths
 * - Keep types flexible but validate required fields
 */
import { z } from 'zod';
import { sanitizeHtml } from '@/lib/security/sanitize';
import { UuidSchema } from '@/lib/validators/common';

/**
 * Create Note payload:
 * - patientId: required
 * - appointmentId: optional (link note to specific appointment)
 * - content: sanitized rich text (basic formatting only)
 * - type: note classification (free-form string, routes/controllers can enforce allowed values)
 */
export const createNoteSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  appointmentId: z.string().min(1).optional(),
  content: z
    .string()
    .min(1, 'content is required')
    .max(20000, 'content must be at most 20,000 characters')
    .transform((html) => sanitizeHtml(html)),
  type: z.string().min(1, 'type is required').max(64),
});

/**
 * Finalize Note payload:
 * - noteId: required UUID (or string ID if not UUID; use UuidSchema when UUIDs are guaranteed)
 * - signature: required digital signature string (min length 16)
 */
export const finalizeNoteSchema = z.object({
  noteId: z.string().min(1),
  signature: z.string().min(16, 'signature must be at least 16 characters'),
  // Optional finalizedAt accepted at route level if needed
});

/**
 * Alternative strict version if noteId must be UUID in your DB:
 * Uncomment and use this instead of finalizeNoteSchema above.
 */
// export const finalizeNoteSchema = z.object({
//   noteId: UuidSchema,
//   signature: z.string().min(16, 'signature must be at least 16 characters'),
// });

/**
 * Types
 */
export type CreateNoteDTO = z.infer<typeof createNoteSchema>;
export type FinalizeNoteDTO = z.infer<typeof finalizeNoteSchema>;