/**
 * CSRF protection utilities.
 * Security:
 * - Verify the Origin header matches the Host for state-changing requests (POST/PUT/PATCH/DELETE)
 * - Fail closed when Origin is missing or malformed
 * - Prefer Origin over Referer; if needed, you can extend to allow Referer fallback for same-host HTTPS
 *
 * Usage:
 * - In middleware: block state-changing requests when verifyCsrfToken() returns false
 * - In routes: optionally re-check via ensureCsrf() for defense-in-depth on sensitive endpoints
 */
import type { NextRequest } from 'next/server';

/**
 * Verify that the request's Origin header matches the Host.
 * This prevents cross-origin POSTs from other domains when cookies are present.
 * Note: NextAuth provides CSRF for auth routes; apply this to other state-changing routes.
 */
export function verifyCsrfToken(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');

  // Missing Origin -> treat as failed unless you explicitly allow same-origin navigation without Origin
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    // Basic host check; if you operate behind proxies, consider x-forwarded-host
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Determine if the request is state-changing (requires CSRF validation).
 */
export function isStateChanging(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

/**
 * Ensure CSRF is valid for state-changing methods. Returns a boolean.
 * Routes can use this for additional defense-in-depth even if middleware enforces CSRF.
 */
export function ensureCsrf(req: NextRequest): boolean {
  if (!isStateChanging(req)) return true;
  return verifyCsrfToken(req);
}