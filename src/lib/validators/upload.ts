/**
 * File upload validators using Zod.
 * Security:
 * - Enforces strict allowlist for MIME types
 * - Validates file size limits (default: 10MB)
 * - Validates basic filename constraints (not used for storage decisions)
 * - NOTE: Always generate server-side filenames; never trust client-provided names.
 */
import { z } from 'zod';

/**
 * Allowed MIME types for uploads.
 * Aligns with server-side validation in [validateFileUpload()](src/lib/security/fileValidation.ts:119)
 */
export const AllowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

/**
 * File Upload Metadata Validation
 * - fileName: original client filename (for display/log only)
 * - fileSize: size in bytes
 * - mimeType: declared MIME type
 *
 * Security:
 * - Do not rely on fileName/mimeType for storage; always validate magic bytes (server-side).
 */
export const fileUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, 'fileName is required')
    .max(255, 'fileName too long'),
  fileSize: z
    .number()
    .int()
    .positive('fileSize must be positive')
    .max(MaxFileSizeBytes, 'File exceeds maximum size of 10MB'),
  mimeType: z.enum(AllowedMimeTypes, {
    errorMap: () => ({ message: `Unsupported MIME type. Allowed: ${AllowedMimeTypes.join(', ')}` }),
  }),
});

// Types
export type FileUploadDTO = z.infer<typeof fileUploadSchema>;