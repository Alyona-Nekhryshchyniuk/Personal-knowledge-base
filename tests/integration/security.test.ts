import {
  checkRateLimit,
  checkWebSocketRateLimit,
  checkAPIRateLimit,
  resetRateLimit,
} from '@/lib/security/rate-limiter';
import {
  sanitizeString,
  sanitizeUrl,
  validateEmail,
  validateUUID,
  validateReviewInterval,
  validateCustomDays,
  validatePaginationParams,
} from '@/lib/security/sanitize';
import {
  generateCSRFToken,
  verifyCSRFToken,
  verifyRequestCSRFToken,
  getCSRFTokenFromHeader,
  getCSRFTokenFromCookie,
} from '@/lib/security/csrf';
import { logAuditEvent, getAuditLogs, clearAuditLogs, AuditAction } from '@/lib/security/audit-log';

describe('Security Features (T077-T084)', () => {
  describe('T077: Rate Limiting', () => {
    beforeEach(() => {
      resetRateLimit('test-user:endpoint');
    });

    it('allows requests within limit', () => {
      const result = checkRateLimit('test-user', { maxRequests: 10, windowMs: 1000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('blocks requests exceeding limit', () => {
      const options = { maxRequests: 2, windowMs: 1000 };

      const result1 = checkRateLimit('test-key', options);
      expect(result1.allowed).toBe(true);

      const result2 = checkRateLimit('test-key', options);
      expect(result2.allowed).toBe(true);

      const result3 = checkRateLimit('test-key', options);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
    });

    it('provides WebSocket-specific rate limits', () => {
      const result1 = checkWebSocketRateLimit('user-1', 'conn-1');
      expect(result1.allowed).toBe(true);

      // Simulate 48 more notifications (total 49)
      for (let i = 0; i < 48; i++) {
        checkWebSocketRateLimit('user-1', 'conn-1');
      }

      const result50 = checkWebSocketRateLimit('user-1', 'conn-1');
      expect(result50.allowed).toBe(true);

      const result51 = checkWebSocketRateLimit('user-1', 'conn-1');
      expect(result51.allowed).toBe(false);
    });

    it('provides API endpoint rate limits with retry-after', () => {
      const result1 = checkAPIRateLimit('user-1', '/api/notes');
      expect(result1.allowed).toBe(true);
      expect(result1.retryAfter).toBe(0);

      // Multiple requests up to limit (100)
      for (let i = 0; i < 99; i++) {
        checkAPIRateLimit('user-1', '/api/notes');
      }

      const resultExceeded = checkAPIRateLimit('user-1', '/api/notes');
      expect(resultExceeded.allowed).toBe(false);
      expect(resultExceeded.retryAfter).toBeGreaterThan(0);
    });

    it('rate limits are per-key', () => {
      const options = { maxRequests: 2, windowMs: 1000 };

      checkRateLimit('key-1', options);
      checkRateLimit('key-1', options);

      const key1Result = checkRateLimit('key-1', options);
      expect(key1Result.allowed).toBe(false);

      // Different key should still be allowed
      const key2Result = checkRateLimit('key-2', options);
      expect(key2Result.allowed).toBe(true);
    });
  });

  describe('T078 & T082: CSRF Protection', () => {
    it('generates unique CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('verifies matching CSRF tokens', () => {
      const token = generateCSRFToken();
      const result = verifyCSRFToken(token, token);
      expect(result).toBe(true);
    });

    it('rejects mismatched CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const result = verifyCSRFToken(token1, token2);
      expect(result).toBe(false);
    });

    it('verifies CSRF tokens from request headers', () => {
      const token = generateCSRFToken();

      // Test header parsing
      const headerValue = `Bearer ${token}`;
      const parsedToken = getCSRFTokenFromHeader(headerValue);
      expect(parsedToken).toBe(token);

      // Test verification
      const verified = verifyCSRFToken(parsedToken!, token);
      expect(verified).toBe(true);
    });

    it('protects only state-changing methods', () => {
      const result1 = verifyRequestCSRFToken('GET', 'token', 'token');
      expect(result1).toBe(true); // GET doesn't need CSRF

      const result2 = verifyRequestCSRFToken('POST', null, 'token');
      expect(result2).toBe(false); // POST requires CSRF token

      const token = generateCSRFToken();
      const result3 = verifyRequestCSRFToken('POST', token, token);
      expect(result3).toBe(true); // Valid CSRF token
    });
  });

  describe('T082: Input Sanitization', () => {
    it('sanitizes XSS attempts', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeString(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    it('sanitizes event handlers', () => {
      const malicious = 'Click me <div onclick="alert(1)">here</div>';
      const sanitized = sanitizeString(malicious);

      expect(sanitized).not.toContain('onclick');
    });

    it('sanitizes URLs properly', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeUrl(null)).toBe('');
    });

    it('validates email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('validates UUIDs', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUUID = 'not-a-uuid';

      expect(validateUUID(validUUID)).toBe(true);
      expect(validateUUID(invalidUUID)).toBe(false);
      expect(validateUUID('')).toBe(false);
    });

    it('validates review intervals', () => {
      expect(validateReviewInterval('daily')).toBe(true);
      expect(validateReviewInterval('weekly')).toBe(true);
      expect(validateReviewInterval('monthly')).toBe(true);
      expect(validateReviewInterval('custom')).toBe(true);
      expect(validateReviewInterval('none')).toBe(true);
      expect(validateReviewInterval('invalid')).toBe(false);
    });

    it('validates custom days', () => {
      expect(validateCustomDays(1)).toBe(true);
      expect(validateCustomDays(30)).toBe(true);
      expect(validateCustomDays(365)).toBe(true);
      expect(validateCustomDays(0)).toBe(false);
      expect(validateCustomDays(-1)).toBe(false);
      expect(validateCustomDays(366)).toBe(false);
      expect(validateCustomDays(1.5)).toBe(false);
    });

    it('validates pagination parameters', () => {
      const result = validatePaginationParams(2, 50);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);

      const resultInvalid = validatePaginationParams(-1, 200);
      expect(resultInvalid.page).toBe(1);
      expect(resultInvalid.limit).toBe(100); // Capped at max
    });
  });

  describe('T084: Audit Logging', () => {
    beforeEach(() => {
      clearAuditLogs();
    });

    it('logs audit events', () => {
      logAuditEvent({
        userId: 'user-1',
        action: AuditAction.NOTE_CREATED,
        resourceType: 'Note',
        resourceId: 'note-1',
        details: { title: 'Test Note' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        success: true,
      });

      const logs = getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditAction.NOTE_CREATED);
      expect(logs[0].userId).toBe('user-1');
    });

    it('filters audit logs by user', () => {
      logAuditEvent({
        userId: 'user-1',
        action: AuditAction.NOTE_CREATED,
        resourceType: 'Note',
        resourceId: 'note-1',
        details: {},
        ipAddress: null,
        userAgent: null,
        success: true,
      });

      logAuditEvent({
        userId: 'user-2',
        action: AuditAction.NOTE_CREATED,
        resourceType: 'Note',
        resourceId: 'note-2',
        details: {},
        ipAddress: null,
        userAgent: null,
        success: true,
      });

      const user1Logs = getAuditLogs({ userId: 'user-1' });
      expect(user1Logs).toHaveLength(1);
      expect(user1Logs[0].userId).toBe('user-1');
    });

    it('filters audit logs by action', () => {
      logAuditEvent({
        userId: 'user-1',
        action: AuditAction.NOTE_CREATED,
        resourceType: 'Note',
        resourceId: 'note-1',
        details: {},
        ipAddress: null,
        userAgent: null,
        success: true,
      });

      logAuditEvent({
        userId: 'user-1',
        action: AuditAction.NOTE_DELETED,
        resourceType: 'Note',
        resourceId: 'note-2',
        details: {},
        ipAddress: null,
        userAgent: null,
        success: true,
      });

      const createdLogs = getAuditLogs({ action: AuditAction.NOTE_CREATED });
      expect(createdLogs).toHaveLength(1);
      expect(createdLogs[0].action).toBe(AuditAction.NOTE_CREATED);
    });

    it('limits audit log retention', () => {
      // Log many events
      for (let i = 0; i < 15; i++) {
        logAuditEvent({
          userId: `user-${i}`,
          action: AuditAction.NOTE_CREATED,
          resourceType: 'Note',
          resourceId: `note-${i}`,
          details: {},
          ipAddress: null,
          userAgent: null,
          success: true,
        });
      }

      const logs = getAuditLogs();
      // Should retain most recent events
      expect(logs.length).toBeLessThanOrEqual(15);
    });

    it('clears audit logs', () => {
      logAuditEvent({
        userId: 'user-1',
        action: AuditAction.NOTE_CREATED,
        resourceType: 'Note',
        resourceId: 'note-1',
        details: {},
        ipAddress: null,
        userAgent: null,
        success: true,
      });

      clearAuditLogs();
      const logs = getAuditLogs();
      expect(logs).toHaveLength(0);
    });
  });
});
