/**
 * Simple in-memory rate limiting for API endpoints
 * In production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10, // 10 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
};

/**
 * Consume rate limit for a given key (IP, email, etc.)
 * @param key - Unique identifier for rate limiting
 * @param config - Rate limit configuration
 * @returns Promise<void> - Throws error if rate limit exceeded
 */
export async function rateLimitConsume(
  key: string,
  config: RateLimitConfig = defaultConfig
): Promise<void> {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return;
  }

  if (entry.count >= config.maxRequests) {
    const error = new Error('Rate limit exceeded. Please try again later.') as any;
    error.status = 429;
    error.retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw error;
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
}

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string): {
  remaining: number;
  resetTime: number;
  total: number;
} {
  const entry = rateLimitStore.get(key);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return {
      remaining: defaultConfig.maxRequests,
      resetTime: now + defaultConfig.windowMs,
      total: defaultConfig.maxRequests,
    };
  }

  return {
    remaining: Math.max(0, defaultConfig.maxRequests - entry.count),
    resetTime: entry.resetTime,
    total: defaultConfig.maxRequests,
  };
}