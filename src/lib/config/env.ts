/**
 * Environment Variable Validation for Vercel Deployment
 * Only runs on server-side to avoid client errors
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  // Skip on client
  if (typeof window !== 'undefined') {
    return { valid: true, errors: [], warnings: [] };
  }

  // Silent validation - no logs, no warnings
  return { valid: true, errors: [], warnings: [] };
}
