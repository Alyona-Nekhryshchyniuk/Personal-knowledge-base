import {
  getTodayUTC,
  calculateNextReviewDate,
  isDue,
  isOverdue,
  isDueToday,
  getDaysOverdue,
  isInNext7Days,
} from '@/lib/dates';
import { addDays, addMonths, startOfToday } from 'date-fns';

describe('Review Date Calculations', () => {
  const today = startOfToday();

  describe('calculateNextReviewDate', () => {
    it('should return null for "none" interval', () => {
      const result = calculateNextReviewDate('none');
      expect(result).toBeNull();
    });

    it('should calculate daily review date (today + 1 day)', () => {
      const result = calculateNextReviewDate('daily');
      const expected = addDays(today, 1);

      expect(result).toEqual(expected);
    });

    it('should calculate weekly review date (today + 7 days)', () => {
      const result = calculateNextReviewDate('weekly');
      const expected = addDays(today, 7);

      expect(result).toEqual(expected);
    });

    it('should calculate monthly review date (today + 1 calendar month)', () => {
      const result = calculateNextReviewDate('monthly');
      const expected = addMonths(today, 1);

      expect(result).toEqual(expected);
    });

    it('should calculate custom review date', () => {
      const result = calculateNextReviewDate('custom', 14);
      const expected = addDays(today, 14);

      expect(result).toEqual(expected);
    });

    it('should throw error for custom interval without customDays', () => {
      expect(() => calculateNextReviewDate('custom', undefined)).toThrow(
        'customDays must be > 0 for custom interval'
      );
    });

    it('should handle February edge case (Feb 28 + 1 month = Mar 28)', () => {
      const febDate = new Date('2026-02-28');
      // Manually test the edge case
      const nextMonth = addMonths(febDate, 1);
      expect(nextMonth.getMonth()).toBe(2); // March
      expect(nextMonth.getDate()).toBe(28);
    });
  });

  describe('isDue', () => {
    it('should return true if nextReviewDate equals today', () => {
      expect(isDue(today, 'Active')).toBe(true);
    });

    it('should return true if nextReviewDate is before today', () => {
      const yesterday = addDays(today, -1);
      expect(isDue(yesterday, 'Active')).toBe(true);
    });

    it('should return false if nextReviewDate is in future', () => {
      const tomorrow = addDays(today, 1);
      expect(isDue(tomorrow, 'Active')).toBe(false);
    });

    it('should return false if status is Archived', () => {
      expect(isDue(today, 'Archived')).toBe(false);
    });

    it('should return false if nextReviewDate is null', () => {
      expect(isDue(null, 'Active')).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('should return true if nextReviewDate is before today', () => {
      const yesterday = addDays(today, -1);
      expect(isOverdue(yesterday, 'Active')).toBe(true);
    });

    it('should return false if nextReviewDate equals today', () => {
      expect(isOverdue(today, 'Active')).toBe(false);
    });

    it('should return false if nextReviewDate is in future', () => {
      const tomorrow = addDays(today, 1);
      expect(isOverdue(tomorrow, 'Active')).toBe(false);
    });

    it('should return false if status is Archived', () => {
      const yesterday = addDays(today, -1);
      expect(isOverdue(yesterday, 'Archived')).toBe(false);
    });
  });

  describe('isDueToday', () => {
    it('should return true only if nextReviewDate equals today', () => {
      expect(isDueToday(today, 'Active')).toBe(true);
    });

    it('should return false if nextReviewDate is before today', () => {
      const yesterday = addDays(today, -1);
      expect(isDueToday(yesterday, 'Active')).toBe(false);
    });

    it('should return false if nextReviewDate is after today', () => {
      const tomorrow = addDays(today, 1);
      expect(isDueToday(tomorrow, 'Active')).toBe(false);
    });
  });

  describe('getDaysOverdue', () => {
    it('should return 0 if note is not overdue', () => {
      const tomorrow = addDays(today, 1);
      expect(getDaysOverdue(tomorrow, 'Active')).toBe(0);
    });

    it('should return 1 if note is 1 day overdue', () => {
      const yesterday = addDays(today, -1);
      expect(getDaysOverdue(yesterday, 'Active')).toBe(1);
    });

    it('should return 7 if note is 7 days overdue', () => {
      const weekAgo = addDays(today, -7);
      expect(getDaysOverdue(weekAgo, 'Active')).toBe(7);
    });

    it('should return 0 if status is Archived', () => {
      const yesterday = addDays(today, -1);
      expect(getDaysOverdue(yesterday, 'Archived')).toBe(0);
    });
  });

  describe('isInNext7Days', () => {
    it('should return true if nextReviewDate is today', () => {
      expect(isInNext7Days(today, 'Active')).toBe(true);
    });

    it('should return true if nextReviewDate is within 7 days', () => {
      const in3Days = addDays(today, 3);
      expect(isInNext7Days(in3Days, 'Active')).toBe(true);
    });

    it('should return true if nextReviewDate is exactly 7 days from now', () => {
      const in7Days = addDays(today, 7);
      expect(isInNext7Days(in7Days, 'Active')).toBe(true);
    });

    it('should return false if nextReviewDate is more than 7 days away', () => {
      const in8Days = addDays(today, 8);
      expect(isInNext7Days(in8Days, 'Active')).toBe(false);
    });

    it('should return true if nextReviewDate is overdue', () => {
      const yesterday = addDays(today, -1);
      expect(isInNext7Days(yesterday, 'Active')).toBe(true);
    });

    it('should return false if status is Archived', () => {
      const tomorrow = addDays(today, 1);
      expect(isInNext7Days(tomorrow, 'Archived')).toBe(false);
    });
  });
});
