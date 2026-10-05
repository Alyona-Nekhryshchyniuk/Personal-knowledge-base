/**
 * Simple in-memory rate limiter for API endpoints and WebSocket connections
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number; // milliseconds
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

export function checkRateLimit(
  key: string,
  options: Partial<RateLimitOptions> = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const now = Date.now();

  let entry = rateLimitMap.get(key);

  // Create new entry or reset if window expired
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);
  }

  // Check if limit exceeded
  const allowed = entry.count < config.maxRequests;

  if (allowed) {
    entry.count++;
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

export function getRateLimitReset(key: string): number | null {
  const entry = rateLimitMap.get(key);
  return entry?.resetAt || null;
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  cleanupExpiredEntries();
}, 5 * 60 * 1000);

/**
 * WebSocket-specific rate limiter
 * Limits notifications sent per connection per window
 */
export function checkWebSocketRateLimit(
  userId: string,
  connectionId: string
): { allowed: boolean; remaining: number } {
  const key = `ws:${userId}:${connectionId}`;

  // Default: 50 notifications per minute per connection
  const result = checkRateLimit(key, {
    maxRequests: 50,
    windowMs: 60 * 1000,
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
  };
}

/**
 * API endpoint rate limiter
 * Limits requests per user per window
 */
export function checkAPIRateLimit(
  userId: string,
  endpoint: string
): { allowed: boolean; remaining: number; retryAfter: number } {
  const key = `api:${userId}:${endpoint}`;

  // Default: 100 requests per minute per endpoint per user
  const result = checkRateLimit(key, {
    maxRequests: 100,
    windowMs: 60 * 1000,
  });

  const retryAfter = result.allowed ? 0 : Math.ceil((result.resetAt - Date.now()) / 1000);

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    retryAfter,
  };
}
