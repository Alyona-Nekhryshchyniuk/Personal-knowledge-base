/**
 * Audit logging for sensitive operations
 */

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_SESSION_CREATED = 'USER_SESSION_CREATED',
  USER_SESSION_EXPIRED = 'USER_SESSION_EXPIRED',

  // Collections
  COLLECTION_CREATED = 'COLLECTION_CREATED',
  COLLECTION_UPDATED = 'COLLECTION_UPDATED',
  COLLECTION_DELETED = 'COLLECTION_DELETED',

  // Tags
  TAG_CREATED = 'TAG_CREATED',
  TAG_UPDATED = 'TAG_UPDATED',
  TAG_DELETED = 'TAG_DELETED',

  // Notes
  NOTE_CREATED = 'NOTE_CREATED',
  NOTE_UPDATED = 'NOTE_UPDATED',
  NOTE_DELETED = 'NOTE_DELETED',
  NOTE_ARCHIVED = 'NOTE_ARCHIVED',
  NOTE_RESTORED = 'NOTE_RESTORED',
  NOTE_REVIEWED = 'NOTE_REVIEWED',

  // Security
  FAILED_AUTH_ATTEMPT = 'FAILED_AUTH_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',

  // WebSocket
  WS_CONNECTION_OPENED = 'WS_CONNECTION_OPENED',
  WS_CONNECTION_CLOSED = 'WS_CONNECTION_CLOSED',
  WS_NOTIFICATION_SENT = 'WS_NOTIFICATION_SENT',
}

export interface AuditLogEntry {
  timestamp: Date;
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage?: string;
}

const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 10000; // Keep last 10k logs in memory

export function logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
  };

  auditLogs.push(fullEntry);

  // Keep only recent logs
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AUDIT] ${entry.action}:`, {
      userId: entry.userId,
      resourceType: entry.resourceType,
      success: entry.success,
      details: entry.details,
    });
  }

  // In production, you would send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service (e.g., Datadog, CloudWatch, ELK)
    // await logToExternalService(fullEntry);
  }
}

export function getAuditLogs(
  filter?: {
    userId?: string;
    action?: AuditAction;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }
): AuditLogEntry[] {
  let results = [...auditLogs];

  if (filter?.userId) {
    results = results.filter((log) => log.userId === filter.userId);
  }

  if (filter?.action) {
    results = results.filter((log) => log.action === filter.action);
  }

  if (filter?.fromDate) {
    results = results.filter((log) => log.timestamp >= filter.fromDate!);
  }

  if (filter?.toDate) {
    results = results.filter((log) => log.timestamp <= filter.toDate!);
  }

  // Return most recent first
  results = results.reverse();

  if (filter?.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

export function clearAuditLogs(): void {
  auditLogs.length = 0;
}

export function logCollectionOperation(
  action: AuditAction,
  userId: string,
  collectionId: string,
  success: boolean,
  details?: Record<string, unknown>
): void {
  logAuditEvent({
    userId,
    action,
    resourceType: 'Collection',
    resourceId: collectionId,
    details: details || {},
    ipAddress: null,
    userAgent: null,
    success,
  });
}

export function logNoteOperation(
  action: AuditAction,
  userId: string,
  noteId: string,
  success: boolean,
  details?: Record<string, unknown>
): void {
  logAuditEvent({
    userId,
    action,
    resourceType: 'Note',
    resourceId: noteId,
    details: details || {},
    ipAddress: null,
    userAgent: null,
    success,
  });
}

export function logTagOperation(
  action: AuditAction,
  userId: string,
  tagId: string,
  success: boolean,
  details?: Record<string, unknown>
): void {
  logAuditEvent({
    userId,
    action,
    resourceType: 'Tag',
    resourceId: tagId,
    details: details || {},
    ipAddress: null,
    userAgent: null,
    success,
  });
}

export function logSecurityEvent(
  action: AuditAction,
  userId: string | null,
  success: boolean,
  errorMessage?: string,
  details?: Record<string, unknown>
): void {
  logAuditEvent({
    userId,
    action,
    resourceType: 'Security',
    resourceId: null,
    details: details || {},
    ipAddress: null,
    userAgent: null,
    success,
    errorMessage,
  });
}

export function logWebSocketEvent(
  action: AuditAction,
  userId: string,
  details?: Record<string, unknown>
): void {
  logAuditEvent({
    userId,
    action,
    resourceType: 'WebSocket',
    resourceId: null,
    details: details || {},
    ipAddress: null,
    userAgent: null,
    success: true,
  });
}
