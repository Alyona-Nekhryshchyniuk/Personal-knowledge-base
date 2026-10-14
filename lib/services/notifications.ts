import { db } from '@/lib/db';
import { getTodayUTC, getDaysOverdue } from '@/lib/dates';

export interface Notification {
  noteId: string;
  title: string;
  collectionName: string;
  nextReviewDate: string; // ISO date string
  overdue: boolean;
  daysOverdue: number;
}

/**
 * Get due/overdue notifications for a user
 * Filters: Active status, has review interval, nextReviewDate <= today
 */
export async function getDueNotifications(userId: string): Promise<Notification[]> {
  const today = getTodayUTC();

  const notes = await db.note.findMany({
    where: {
      userId,
      status: 'Active',
      reviewInterval: { not: 'none' },
      nextReviewDate: {
        lte: today,
      },
    },
    include: {
      collection: true,
    },
  });

  return notes.map((note) => {
    const nextReviewDate = note.nextReviewDate as Date;
    const isOverdue = nextReviewDate < today;
    const daysOverdue = getDaysOverdue(nextReviewDate, note.status);

    return {
      noteId: note.id,
      title: note.title,
      collectionName: note.collection.name,
      nextReviewDate: nextReviewDate.toISOString().split('T')[0],
      overdue: isOverdue,
      daysOverdue,
    };
  });
}

/**
 * Create a hash for deduplication
 */
export function hashNotification(notification: Notification): string {
  return `${notification.noteId}-${notification.nextReviewDate}-${notification.overdue}`;
}
