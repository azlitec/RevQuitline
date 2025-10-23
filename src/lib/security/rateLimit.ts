// SECURITY: Simple in-memory rate limiter for API routes (e.g., registration attempts)
// Note: In-memory storage is per-process. For production, replace with a durable backend (Redis/Upstash).
// This utility is designed to be easy to swap; only the consume() function needs to be reimplemented.

import { NextRequest } from 'next/server';

export type LimitOptions = {
  // Window duration for counting attempts
  windowMs: number;
  // Maximum allowed attempts within the window
  max: number;
  // Optional key prefix to namespace different limiters
  keyPrefix?: string;
};

type Bucket = {
  count: number;
  expiresAt: number;
};

class MemoryRateLimiter {
  // SECURITY: Map of key -> { count, expiresAt } maintained per process
  private buckets = new Map<string, Bucket>();

  consume(key: string, options: LimitOptions): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const prefixedKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : key;

    const existing = this.buckets.get(prefixedKey);
    if (!existing || existing.expiresAt <= now) {
      // New window
      const expiresAt = now + options.windowMs;
      this.buckets.set(prefixedKey, { count: 1, expiresAt });
      return { allowed: true, remaining: options.max - 1, resetMs: options.windowMs };
    }

    if (existing.count >= options.max) {
      // SECURITY: Too many attempts in window
      return { allowed: false, remaining: 0, resetMs: existing.expiresAt - now };
    }

    existing.count += 1;
    this.buckets.set(prefixedKey, existing);
    return { allowed: true, remaining: Math.max(0, options.max - existing.count), resetMs: existing.expiresAt - now };
  }

  // Optional manual reset, useful for tests
  reset(key: string, keyPrefix?: string) {
    const k = keyPrefix ? `${keyPrefix}:${key}` : key;
    this.buckets.delete(k);
  }
}

const limiter = new MemoryRateLimiter();

// SECURITY: Attempt to derive a stable client IP from headers; do not trust user-supplied body values
export function getClientIp(req: NextRequest): string {
  // Next.js may not expose req.ip; prefer forwarded headers
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) {
    // Take first IP in chain
    const first = xfwd.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  // fallback: host header (not ideal but better than undefined)
  const host = req.headers.get('host');
  return host ? `host:${host}` : 'unknown';
}

// SECURITY: Consume limit for a given composite key (e.g., ip + email) under provided options
export function rateLimitConsume(req: NextRequest, keyParts: Array<string | undefined>, options: LimitOptions) {
  const ip = getClientIp(req);
  const parts = [ip, ...keyParts.filter(Boolean)].map((p) => (p ?? '').toLowerCase());
  const key = parts.join('|');

  const res = limiter.consume(key, options);
  return {
    allowed: res.allowed,
    remaining: res.remaining,
    resetMs: res.resetMs,
    key,
    ip,
  };
}

/**
 * Example integration (registration attempts):
 *
 * import { rateLimitConsume } from '@/lib/security/rateLimit';
 * import { errorResponse } from '@/lib/api/response';
 *
 * const limit = rateLimitConsume(req, [normalizedEmail], { windowMs: 15 * 60_000, max: 10, keyPrefix: 'register' });
 * if (!limit.allowed) {
 *   // SECURITY: Return 429 without revealing sensitive context
 *   return errorResponse('Too many registration attempts. Please try again later.', 429, {
 *     retryAfterMs: limit.resetMs,
 *   });
 * }
 *
 * // Proceed with registration...
 */

// SECURITY: Export internal for testability
export const __rateLimiter = limiter;