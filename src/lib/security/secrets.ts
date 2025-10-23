/**
 * Secrets management utilities.
 * Goals:
 * - Never log sensitive values (passwords, tokens, secrets)
 * - Provide masking utilities and safe logging helpers
 * - Centralize environment variable access and validation
 * - Redact sensitive fields from error responses/metadata to prevent PHI/secret leakage
 *
 * Usage:
 * - Use getRequiredEnv() to access env vars safely and enforce presence
 * - Use maskSecret() to present values in logs/UI without revealing the full secret
 * - Use safeLog() to log structured metadata with automatic redaction
 * - Use redactObject() to sanitize arbitrary objects (e.g., extras payloads, error contexts)
 */

type Redactable = Record<string, unknown>;

/**
 * Sensitivity dictionary for keys to redact in logs/responses.
 * Extend as your system grows (e.g., add provider API keys, service tokens).
 */
export const SENSITIVE_KEYS = [
  'password',
  'pass',
  'pwd',
  'secret',
  'secrets',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'x-api-key',
  'X-API-KEY',
  'SENDGRID_API_KEY',
  'EMAIL_PASS',
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
];

/**
 * Mask a secret string leaving the last N characters visible.
 * Example: 'abcd1234' with revealLast=4 -> '****1234'
 * If the input is short, masks entirely.
 */
export function maskSecret(value: string | undefined | null, revealLast = 4): string {
  if (!value) return '****';
  const s = String(value);
  if (s.length <= revealLast) return '*'.repeat(s.length);
  const visible = s.slice(-revealLast);
  return `${'*'.repeat(Math.max(4, s.length - revealLast))}${visible}`;
}

/**
 * Redact an arbitrary object by masking values of known sensitive keys.
 * Returns a shallow-cloned sanitized object; does not mutate original.
 * - Nested objects are shallowly redacted; extend if deep redaction is needed.
 */
export function redactObject<T extends Redactable>(obj: T, extraSensitiveKeys: string[] = []): T {
  try {
    const sensitiveSet = new Set<string>([...SENSITIVE_KEYS, ...extraSensitiveKeys].map((k) => k.toLowerCase()));
    const out: Record<string, unknown> = Array.isArray(obj) ? [...(obj as unknown[])] : { ...obj };

    for (const [key, val] of Object.entries(out)) {
      const lowerKey = key.toLowerCase();

      // If the key name suggests sensitivity, mask it
      if (sensitiveSet.has(lowerKey)) {
        out[key] = typeof val === 'string' ? maskSecret(val) : '****';
        continue;
      }

      // Additionally, mask common Authorization header values
      if (lowerKey === 'authorization' && typeof val === 'string') {
        // e.g., 'Bearer abcdef...'
        const parts = val.split(' ');
        const last = parts.pop();
        out[key] = `${parts.join(' ')} ${maskSecret(last ?? val)}`;
        continue;
      }

      // For nested simple objects, shallow redact keys
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        out[key] = redactObject(val as Record<string, unknown>, extraSensitiveKeys);
      }
    }

    return out as T;
  } catch {
    // Best-effort fallback: do not throw in sanitization path
    return obj;
  }
}

/**
 * Safe logging helper that redacts potentially sensitive metadata.
 * Do NOT pass raw PHI; limit to minimal operational metadata.
 */
export function safeLog(message: string, meta?: Redactable, extraSensitiveKeys: string[] = []): void {
  try {
    const sanitized = meta ? redactObject(meta, extraSensitiveKeys) : undefined;
    // eslint-disable-next-line no-console
    console.log(message, sanitized ?? '');
  } catch {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

/**
 * Fetch a required environment variable.
 * Throws error if missing; never logs values, only key names.
 */
export function getRequiredEnv(key: string): string {
  const val = process.env[key];
  if (typeof val !== 'string' || val.trim() === '') {
    const err: any = new Error(`Missing required env var: ${key}`);
    err.code = 'ENV_VAR_MISSING';
    throw err;
  }
  return val;
}

/**
 * Validate presence of a set of environment variables. Throws if any missing.
 * Returns true if valid. Intended for runtime checks in server bootstrap.
 */
export function validateEnv(required: string[]): boolean {
  const missing: string[] = [];
  for (const key of required) {
    const v = process.env[key];
    if (typeof v !== 'string' || v.trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    const err: any = new Error(`Missing required env vars: ${missing.join(', ')}`);
    err.code = 'ENV_VALIDATION_FAILED';
    throw err;
  }
  return true;
}

/**
 * Build a sanitized error extras payload without secrets.
 * - Use before attaching extras to errorResponse() to avoid accidental leakage.
 * - Redacts sensitive keys using redactObject().
 */
export function buildSafeErrorExtras(extras?: Redactable, extraSensitiveKeys: string[] = []): Redactable | undefined {
  if (!extras || typeof extras !== 'object') return undefined;
  return redactObject(extras, extraSensitiveKeys);
}

/**
 * Example integration:
 *
 * import { errorResponse } from '@/lib/api/response';
 * import { buildSafeErrorExtras, safeLog } from '@/lib/security/secrets';
 *
 * try {
 *   // ... operation
 * } catch (err) {
 *   safeLog('[Operation] Failed', { error: (err as any)?.message, reason: 'op_failed' });
 *   const extras = buildSafeErrorExtras({ code: (err as any)?.code, detail: 'sanitized failure context' });
 *   return errorResponse('Operation failed', 500, extras);
 * }
 */