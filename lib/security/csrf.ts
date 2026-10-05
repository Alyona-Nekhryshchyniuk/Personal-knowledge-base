import crypto from 'crypto';

/**
 * CSRF token management
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__Host-csrf';

export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

export function createCSRFCookie(token: string): string {
  return `${CSRF_COOKIE_NAME}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`;
}

export function verifyCSRFToken(headerToken: string, cookieToken: string): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get CSRF token from request headers
 */
export function getCSRFTokenFromHeader(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  // Header format: "Bearer <token>" or just "<token>"
  const parts = headerValue.split(' ');
  return parts.length === 2 ? parts[1] : parts[0];
}

/**
 * Extract CSRF token from cookie
 */
export function getCSRFTokenFromCookie(cookieString: string | null): string | null {
  if (!cookieString) {
    return null;
  }

  const cookies = cookieString.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCSRFProtection(method: string): boolean {
  const protectedMethods = ['POST', 'PATCH', 'DELETE', 'PUT'];
  return protectedMethods.includes(method.toUpperCase());
}

/**
 * Verify CSRF token from request
 */
export function verifyRequestCSRFToken(
  method: string,
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!requiresCSRFProtection(method)) {
    return true; // GET, HEAD, OPTIONS don't need CSRF protection
  }

  if (!headerToken || !cookieToken) {
    return false;
  }

  return verifyCSRFToken(headerToken, cookieToken);
}
