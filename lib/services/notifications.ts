import { db } from '../db.ts';
import { getTodayUTC, isOverdue, isDueToday, isInNext7Days } from '../dates.ts';

export interface NotificationPayload {
  id: string;
  noteId: string;
  title: string;
  collection: string;
  nextReviewDate: string;
  overdue: boolean;
  daysOverdue: number;
  dueToday: boolean;
}

/**
 * Get all due/overdue notes for a user
 */
export async function getDueNotifications(userId: string): Promise<NotificationPayload[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const today = getTodayUTC();

  const notes = await db.note.findMany({
    where: {
      userId,
      status: 'Active',
      reviewInterval: { not: 'none' },
      nextReviewDate: { lte: today },
    },
    include: {
      collection: { select: { name: true } },
    },
    orderBy: { nextReviewDate: 'asc' },
  });

  return notes.map((note) => buildNotificationPayload(note));
}

/**
 * Get all notifications (including upcoming within 7 days)
 */
export async function getAllNotifications(userId: string): Promise<NotificationPayload[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const today = getTodayUTC();
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const notes = await db.note.findMany({
    where: {
      userId,
      status: 'Active',
      reviewInterval: { not: 'none' },
      nextReviewDate: {
        lte: in7Days,
        gte: today,
      },
    },
    include: {
      collection: { select: { name: true } },
    },
    orderBy: [{ nextReviewDate: 'asc' }, { title: 'asc' }],
  });

  return notes.map((note) => buildNotificationPayload(note));
}

/**
 * Get only overdue notes
 */
export async function getOverdueNotifications(userId: string): Promise<NotificationPayload[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const today = getTodayUTC();

  const notes = await db.note.findMany({
    where: {
      userId,
      status: 'Active',
      reviewInterval: { not: 'none' },
      nextReviewDate: { lt: today },
    },
    include: {
      collection: { select: { name: true } },
    },
    orderBy: { nextReviewDate: 'asc' },
  });

  return notes.map((note) => buildNotificationPayload(note));
}

/**
 * Build notification payload from note
 */
export function buildNotificationPayload(note: any): NotificationPayload {
  const today = getTodayUTC();
  const nextReview = new Date(note.nextReviewDate);
  const daysOverdue = calculateDaysOverdue(nextReview, today);

  const dateStr = typeof note.nextReviewDate === 'string'
    ? note.nextReviewDate.split('T')[0]
    : nextReview.toISOString().split('T')[0];

  return {
    id: `${note.id}-${dateStr}`,
    noteId: note.id,
    title: note.title,
    collection: note.collection.name,
    nextReviewDate: dateStr,
    overdue: isOverdue(nextReview, note.status),
    daysOverdue,
    dueToday: isDueToday(nextReview, note.status),
  };
}

/**
 * Calculate days overdue
 */
function calculateDaysOverdue(nextReviewDate: Date, today: Date): number {
  if (nextReviewDate.getTime() >= today.getTime()) {
    return 0;
  }

  const diffTime = today.getTime() - nextReviewDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Create notification hash for deduplication
 */
export function createNotificationHash(notification: NotificationPayload): string {
  return `${notification.noteId}-${notification.nextReviewDate}-${notification.overdue}`;
}

/**
 * Get notifications that are newly due since last check
 */
export async function getNewlyDueNotifications(
  userId: string,
  sinceDate: Date
): Promise<NotificationPayload[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const today = getTodayUTC();

  const notes = await db.note.findMany({
    where: {
      userId,
      status: 'Active',
      reviewInterval: { not: 'none' },
      nextReviewDate: {
        lte: today,
        gte: sinceDate,
      },
      updatedAt: {
        gte: sinceDate,
      },
    },
    include: {
      collection: { select: { name: true } },
    },
    orderBy: { nextReviewDate: 'asc' },
  });

  return notes.map((note) => buildNotificationPayload(note));
}
