/**
 * User validators using Zod.
 * Security and integrity:
 * - Role-specific field validation to ensure only appropriate fields are accepted per role
 * - Strict email/phone formats (Malaysian phone policy from common validators)
 * - Provider profile validation (specialization, license, etc.)
 *
 * Usage patterns:
 * - updateUserSchema: use in admin or self-service profile update routes
 * - providerProfileSchema: embed or validate provider subdocument updates
 */
import { z } from 'zod';
import { EmailSchema, PhoneSchema } from '@/lib/validators/common';

/**
 * System roles as used in RBAC and Prisma:
 * Includes transitional provider roles for onboarding/approval workflows.
 */
export const RoleEnum = z.enum([
  'USER',
  'CLERK',
  'ADMIN',
  'PROVIDER',
  'PROVIDER_PENDING',
  'PROVIDER_REVIEWING',
]);

/**
 * Provider profile schema:
 * - specialization: clinical specialty string
 * - licenseNumber: medical council registration
 * - yearsOfExperience: optional reasonable bound
 * - clinicName/clinicAddress: optional practice metadata
 * - services: optional list of service offerings
 *
 * Security:
 * - Constrain lengths to avoid overlong inputs
 * - Avoid permissive coercions; prefer strict types
 */
export const providerProfileSchema = z.object({
  specialization: z.string().min(2).max(64),
  licenseNumber: z.string().min(3).max(64),
  yearsOfExperience: z.number().int().min(0).max(60).optional(),
  clinicName: z.string().min(2).max(128).optional(),
  clinicAddress: z.string().min(3).max(256).optional(),
  services: z.array(z.string().min(2).max(64)).optional(),
});

/**
 * Update User schema:
 * - Supports partial updates
 * - Enforces role-specific validation:
 *   - PROVIDER requires providerProfile (with license/specialization)
 *   - PROVIDER_PENDING/REVIEWING strongly recommended to provide license; enforce via refine when profile present
 *   - USER role must not send providerProfile
 *
 * Security:
 * - String length limits reduce attack surface and DB/storage pressure
 * - Email/Phone strict formats reduce injection risks
 */
export const updateUserSchema = z
  .object({
    role: RoleEnum.optional(),

    // Common profile fields
    email: EmailSchema.optional(),
    phone: PhoneSchema.optional(),
    firstName: z.string().min(1).max(64).optional(),
    lastName: z.string().max(64).optional(),
    address: z.string().max(256).optional(),
    city: z.string().max(64).optional(),
    country: z.string().max(64).optional(),

    // Provider-only subdocument
    providerProfile: providerProfileSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const role = val.role;

    // If role is a provider (final/approved), providerProfile must be supplied
    if (role === 'PROVIDER' && !val.providerProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providerProfile'],
        message: 'Provider profile is required for role PROVIDER',
      });
    }

    // If role is USER, disallow providerProfile to prevent privilege confusion
    if (role === 'USER' && val.providerProfile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providerProfile'],
        message: 'Provider profile is not allowed for role USER',
      });
    }

    // If role is transitional provider, ensure licenseNumber exists when profile is present
    if ((role === 'PROVIDER_PENDING' || role === 'PROVIDER_REVIEWING') && val.providerProfile) {
      const license = val.providerProfile.licenseNumber?.trim();
      if (!license) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['providerProfile', 'licenseNumber'],
          message: 'License number is required for pending/reviewing provider profiles',
        });
      }
    }

    // At least one field must be present to update
    const anyField =
      role !== undefined ||
      val.email !== undefined ||
      val.phone !== undefined ||
      val.firstName !== undefined ||
      val.lastName !== undefined ||
      val.address !== undefined ||
      val.city !== undefined ||
      val.country !== undefined ||
      val.providerProfile !== undefined;

    if (!anyField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'No updatable fields provided',
      });
    }
  });

/**
 * Types
 */
export type Role = z.infer<typeof RoleEnum>;
export type ProviderProfileDTO = z.infer<typeof providerProfileSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;