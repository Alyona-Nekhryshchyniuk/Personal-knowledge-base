/**
 * Input sanitization and validation utilities
 */

const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=
];

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  let sanitized = String(input).trim();

  // Remove dangerous patterns
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  try {
    const url = new URL(input);
    const allowedProtocols = ['http:', 'https:'];

    if (!allowedProtocols.includes(url.protocol)) {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string): boolean {
  if (!id) {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate review interval
 */
export function validateReviewInterval(
  interval: string
): interval is 'none' | 'daily' | 'weekly' | 'monthly' | 'custom' {
  const validIntervals = ['none', 'daily', 'weekly', 'monthly', 'custom'];
  return validIntervals.includes(interval);
}

/**
 * Validate custom days for review
 */
export function validateCustomDays(days: number): boolean {
  return Number.isInteger(days) && days > 0 && days <= 365;
}

/**
 * Validate note status
 */
export function validateNoteStatus(status: string): status is 'Active' | 'Archived' {
  return ['Active', 'Archived'].includes(status);
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(input: unknown[]): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeString(item))
    .filter((item) => item.length > 0);
}

/**
 * Sanitize array of UUIDs
 */
export function sanitizeUUIDArray(input: unknown[]): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === 'string')
    .filter((item) => validateUUID(item));
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page?: number, limit?: number): {
  page: number;
  limit: number;
} {
  const defaultPage = 1;
  const defaultLimit = 20;
  const maxLimit = 100;

  const validPage =
    Number.isInteger(page) && page! > 0 ? Math.min(page!, 10000) : defaultPage;
  const validLimit =
    Number.isInteger(limit) && limit! > 0
      ? Math.min(limit!, maxLimit)
      : defaultLimit;

  return { page: validPage, limit: validLimit };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string | null | undefined): string {
  if (!query) {
    return '';
  }

  const sanitized = sanitizeString(query);

  // Limit search query length
  if (sanitized.length > 500) {
    return sanitized.substring(0, 500);
  }

  return sanitized;
}
