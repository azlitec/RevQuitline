'use strict';

/**
 * Environment variables validation script (runtime-safe, no secret logging).
 * Security:
 * - Validates presence of required env vars without printing values
 * - Throws a single error listing missing keys (names only)
 * - Designed to be required from next.config.ts or app startup bootstrap
 *
 * Usage:
 *   const { validateEnv } = require('./scripts/validate-env');
 *   validateEnv(); // throws if missing vars
 */

const DISABLE_GOOGLE = process.env.DISABLE_GOOGLE === 'true';
const DISABLE_EMAIL = process.env.DISABLE_EMAIL === 'true';

const BASE_REQUIRED = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const EMAIL_REQUIRED = DISABLE_EMAIL ? [] : [
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
];

const GOOGLE_REQUIRED = DISABLE_GOOGLE ? [] : [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

const REQUIRED = [
  ...BASE_REQUIRED,
  ...EMAIL_REQUIRED,
  ...GOOGLE_REQUIRED,
];

// Optional env vars (do not throw if missing):
// - GOOGLE_OAUTH_REDIRECT_URI: explicit OAuth callback URL override; default derives from NEXTAUTH_URL/VERCEL_URL
// - APP_TIMEZONE: calendar timezone; defaults to 'UTC'

/**
 * Validate env vars; fails closed by throwing Error when any are missing.
 * Returns true if all required env vars are present.
 */
function validateEnv(required = REQUIRED) {
  const missing = [];
  for (const key of required) {
    const val = process.env[key];
    if (typeof val !== 'string' || val.trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    const err = new Error(`Missing required env vars: ${missing.join(', ')}`);
    // Security: include only names, no values; attach a code for programmatic handling
    err.code = 'ENV_VALIDATION_FAILED';
    throw err;
  }
  return true;
}

// Do not auto-run here to avoid crashing build/test processes unexpectedly.
// Integrate explicitly from next.config.ts or a server bootstrap file.
module.exports = { validateEnv };