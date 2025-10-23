/**
 * Centralized common validators using Zod.
 * Security: Prefer strict formats to minimize attack surface (SQLi/XSS).
 */
import { z } from 'zod';

/**
 * Email: RFC-compliant via z.string().email().
 * Avoid accepting display names or malformed inputs.
 */
export const EmailSchema = z.string().email();

/**
 * Malaysian phone: must start with +60 and contain 8–10 digits after country code.
 * Example: +60123456789
 */
const MY_PHONE_REGEX = /^\+60\d{8,10}$/;
export const PhoneSchema = z
  .string()
  .regex(MY_PHONE_REGEX, 'Phone must be in Malaysian format, e.g. +60123456789');

/**
 * Password policy:
 * - Min 8 chars
 * - At least 1 uppercase
 * - At least 1 number
 * - At least 1 special character
 */
const UPPER = /[A-Z]/;
const NUM = /\d/;
const SPECIAL = /[!@#$%^&*()_\-+=\[{\]}\\|;:'",.<>/?`~]/;
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((s) => UPPER.test(s), { message: 'Password must contain an uppercase letter' })
  .refine((s) => NUM.test(s), { message: 'Password must contain a number' })
  .refine((s) => SPECIAL.test(s), { message: 'Password must contain a special character' });

/**
 * ID formats
 */
export const UuidSchema = z.string().uuid();
export const CuidSchema = z.string().cuid();

/**
 * ISO8601 DateTime string
 */
export const DateTimeSchema = z.string().datetime();

/**
 * Pagination: page (0-based) and limit with safe defaults.
 * Security: Cap limit to prevent DoS via large queries.
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Sorting: allow a client-specified field name, and safe order values.
 * Security: Backend must whitelist sortBy against actual column names before use.
 */
export const SortingSchema = z.object({
  sortBy: z.string().min(1).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Helpers
 */
export function isFutureDateTime(value: string): boolean {
  // Basic future check; caller should also validate provider availability.
  const now = Date.now();
  const dt = Date.parse(value);
  return Number.isFinite(dt) && dt > now;
}

// Types
export type Email = z.infer<typeof EmailSchema>;
export type Phone = z.infer<typeof PhoneSchema>;
export type Password = z.infer<typeof PasswordSchema>;
export type UUID = z.infer<typeof UuidSchema>;
export type CUID = z.infer<typeof CuidSchema>;
export type DateTime = z.infer<typeof DateTimeSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Sorting = z.infer<typeof SortingSchema>;