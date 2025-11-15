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
  // Skip validation on client-side
  if (typeof window !== 'undefined') {
    return { valid: true, errors: [], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    errors.push(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl.includes('pgbouncer=true')) {
      warnings.push('[DATABASE_URL] Should include pgbouncer=true');
    }
    
    if (!dbUrl.includes(':6543')) {
      warnings.push('[DATABASE_URL] Should use port 6543');
    }
  }

  // Validate NEXTAUTH_SECRET length
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('[NEXTAUTH_SECRET] Must be at least 32 characters long');
  }

  // Log results (only on server)
  if (typeof window === 'undefined') {
    if (errors.length > 0) {
      console.error('[Config] Environment validation failed:');
      errors.forEach(error => console.error(`  ❌ ${error}`));
    }

    if (warnings.length > 0) {
      console.warn('[Config] Environment validation warnings:');
      warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('[Config] ✅ Environment validation passed');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
