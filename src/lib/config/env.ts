/**
 * Environment Variable Validation for Vercel Deployment
 * 
 * This module validates critical environment variables at application startup
 * to catch configuration issues early, especially for Vercel Hobby plan deployments.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables
 * Only runs on server-side to avoid client errors
 */
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
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or Vercel environment variables.'
    );
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl.includes('pgbouncer=true')) {
      warnings.push(
        '[DATABASE_URL] Should include pgbouncer=true for optimal Vercel serverless performance'
      );
    }
    
    if (!dbUrl.includes(':6543')) {
      warnings.push(
        '[DATABASE_URL] Should use port 6543 for Supabase connection pooling (not 5432)'
      );
    }
    
    if (!dbUrl.includes('connection_limit=')) {
      warnings.push(
        '[DATABASE_URL] Should include connection_limit parameter to prevent connection exhaustion'
      );
    }

    // Check if it's a valid PostgreSQL URL
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      errors.push(
        '[DATABASE_URL] Must be a valid PostgreSQL connection string starting with postgresql:// or postgres://'
      );
    }
  }

  // Validate NEXTAUTH_SECRET length
  if (process.env.NEXTAUTH_SECRET) {
    if (process.env.NEXTAUTH_SECRET.length < 32) {
      errors.push(
        '[NEXTAUTH_SECRET] Must be at least 32 characters long for security.\n' +
        'Generate a new secret with: openssl rand -base64 32'
      );
    }
  }

  // Validate NEXTAUTH_URL format
  if (process.env.NEXTAUTH_URL) {
    const authUrl = process.env.NEXTAUTH_URL;
    
    // Check for trailing slash (auto-fixed in auth.ts, so just info)
    if (authUrl.endsWith('/')) {
      // Don't warn - we auto-fix this in auth.ts
      console.log('[Config] ℹ️  NEXTAUTH_URL trailing slash will be automatically removed');
    }

    // Check if it's a valid URL
    try {
      new URL(authUrl);
    } catch {
      errors.push(
        '[NEXTAUTH_URL] Must be a valid URL (e.g., http://localhost:3000 or https://your-app.vercel.app)'
      );
    }

    // Warn if using localhost in production
    if (process.env.NODE_ENV === 'production' && authUrl.includes('localhost')) {
      warnings.push(
        '[NEXTAUTH_URL] Using localhost in production. Will fallback to VERCEL_URL if available.'
      );
    }
  } else if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL) {
    warnings.push(
      '[NEXTAUTH_URL] Not set in production and VERCEL_URL not available. Authentication may not work correctly.'
    );
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

/**
 * Validates environment and throws if invalid
 * Use this at application startup (server-side only)
 */
export function validateEnvOrThrow(): void {
  // Skip on client-side
  if (typeof window !== 'undefined') {
    return;
  }

  const result = validateEnv();
  
  // Only throw for critical errors, not warnings
  if (!result.valid && result.errors.length > 0) {
    console.error(
      'Environment validation failed:\n' + 
      result.errors.join('\n')
    );
    // Don't throw in production to avoid breaking the app
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        'Environment validation failed:\n' + 
        result.errors.join('\n')
      );
    }
  }
}

/**
 * Get validated environment variables with type safety
 */
export function getEnv() {
  validateEnvOrThrow();
  
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}
