/**
 * Auth validators using Zod
 * Standardized schemas to enforce consistent input validation.
 * Security:
 * - Strict formats for email/phone/password
 * - Role validation via enum
 * - Avoid permissive coercions unless intentional
 */
import { z } from 'zod';
import { EmailSchema, PasswordSchema, PhoneSchema } from '@/lib/validators/common';

/**
 * Roles allowed during self-registration.
 * Providers must start as pending to allow admin review.
 */
export const RegisterRoleEnum = z.enum(['USER', 'PROVIDER_PENDING']);

/**
 * Register payload:
 * - email: valid email
 * - password: strong password policy
 * - name: full name (we do not split here; route can derive first/last)
 * - role: USER or PROVIDER_PENDING
 * - Optional phone and licenseNumber (required for PROVIDER_PENDING by refine)
 */
export const registerSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    name: z.string().min(1).max(100),
    role: RegisterRoleEnum.default('USER'),
    phone: PhoneSchema.optional(),
    licenseNumber: z.string().min(3).max(64).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === 'PROVIDER_PENDING' && !val.licenseNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['licenseNumber'],
        message: 'Medical registration number is required for providers',
      });
    }
  });

/**
 * Login payload:
 * - email + password
 */
export const loginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

/**
 * Update Profile payload:
 * - Optional name/phone and future extensibility fields
 */
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: PhoneSchema.optional(),
  // add more profile fields here when needed (e.g., address)
});

// Types
export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;