import { startOfToday, addDays, addMonths, isBefore, isEqual } from 'date-fns';

type ReviewInterval = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Get today's date in UTC (midnight to midnight)
 */
export function getTodayUTC(): Date {
  return startOfToday();
}

/**
 * Calculate next review date based on interval
 */
export function calculateNextReviewDate(interval: ReviewInterval, customDays?: number | null): Date | null {
  if (interval === 'none') {
    return null;
  }

  const today = getTodayUTC();

  switch (interval) {
    case 'daily':
      return addDays(today, 1);
    case 'weekly':
      return addDays(today, 7);
    case 'monthly':
      return addMonths(today, 1);
    case 'custom':
      if (!customDays || customDays <= 0) {
        throw new Error('customDays must be > 0 for custom interval');
      }
      return addDays(today, customDays);
    default:
      return null;
  }
}

/**
 * Check if a note is due for review
 */
export function isDue(nextReviewDate: Date | null | undefined, status: string): boolean {
  if (!nextReviewDate || status === 'Archived') {
    return false;
  }

  const today = getTodayUTC();
  return isEqual(nextReviewDate, today) || isBefore(nextReviewDate, today);
}

/**
 * Check if a note is overdue
 */
export function isOverdue(nextReviewDate: Date | null | undefined, status: string): boolean {
  if (!nextReviewDate || status === 'Archived') {
    return false;
  }

  const today = getTodayUTC();
  return isBefore(nextReviewDate, today);
}

/**
 * Check if a note is due today
 */
export function isDueToday(nextReviewDate: Date | null | undefined, status: string): boolean {
  if (!nextReviewDate || status === 'Archived') {
    return false;
  }

  const today = getTodayUTC();
  return isEqual(nextReviewDate, today);
}

/**
 * Get days overdue
 */
export function getDaysOverdue(nextReviewDate: Date | null | undefined, status: string): number {
  if (!isOverdue(nextReviewDate, status)) {
    return 0;
  }

  const today = getTodayUTC();
  const diffTime = today.getTime() - (nextReviewDate as Date).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a note is in next 7 days
 */
export function isInNext7Days(nextReviewDate: Date | null | undefined, status: string): boolean {
  if (!nextReviewDate || status === 'Archived') {
    return false;
  }

  const today = getTodayUTC();
  const in7Days = addDays(today, 7);

  return (
    (isEqual(nextReviewDate, today) || isBefore(nextReviewDate, today)) ||
    (isEqual(nextReviewDate, in7Days) || isBefore(nextReviewDate, in7Days))
  );
}
