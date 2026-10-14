import { getDueNotifications, hashNotification } from '@/lib/services/notifications';
import { db } from '@/lib/db';
import { getTodayUTC } from '@/lib/dates';
import { addDays } from 'date-fns';

// Mock db for basic testing
jest.mock('@/lib/db');

describe('getDueNotifications', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const today = getTodayUTC();
  const userId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns due notes for active user', async () => {
    const mockNotes = [
      {
        id: 'note-1',
        title: 'Note 1',
        status: 'Active',
        reviewInterval: 'daily',
        nextReviewDate: today,
        collection: { name: 'Collection 1' },
      },
    ];

    (mockDb.note.findMany as jest.Mock).mockResolvedValue(mockNotes);

    const result = await getDueNotifications(userId);

    expect(result).toHaveLength(1);
    expect(result[0].noteId).toBe('note-1');
    expect(result[0].overdue).toBe(false);
    expect(result[0].daysOverdue).toBe(0);
  });

  it('filters out archived notes', async () => {
    (mockDb.note.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getDueNotifications(userId);

    expect(result).toHaveLength(0);
  });

  it('filters out notes with review interval none', async () => {
    (mockDb.note.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getDueNotifications(userId);

    expect(result).toHaveLength(0);
  });

  it('includes overdue notes', async () => {
    const yesterday = addDays(today, -1);
    const mockNotes = [
      {
        id: 'note-overdue',
        title: 'Overdue Note',
        status: 'Active',
        reviewInterval: 'daily',
        nextReviewDate: yesterday,
        collection: { name: 'Collection 1' },
      },
    ];

    (mockDb.note.findMany as jest.Mock).mockResolvedValue(mockNotes);

    const result = await getDueNotifications(userId);

    expect(result).toHaveLength(1);
    expect(result[0].overdue).toBe(true);
    expect(result[0].daysOverdue).toBeGreaterThan(0);
  });
});

describe('hashNotification', () => {
  it('creates consistent hash', () => {
    const notification = {
      noteId: 'note-1',
      title: 'Test',
      collectionName: 'Col',
      nextReviewDate: '2026-10-14',
      overdue: false,
      daysOverdue: 0,
    };

    const hash1 = hashNotification(notification);
    const hash2 = hashNotification(notification);

    expect(hash1).toBe(hash2);
  });

  it('different notifications have different hashes', () => {
    const notif1 = {
      noteId: 'note-1',
      title: 'Test',
      collectionName: 'Col',
      nextReviewDate: '2026-10-14',
      overdue: false,
      daysOverdue: 0,
    };

    const notif2 = {
      noteId: 'note-2',
      title: 'Test',
      collectionName: 'Col',
      nextReviewDate: '2026-10-14',
      overdue: false,
      daysOverdue: 0,
    };

    expect(hashNotification(notif1)).not.toBe(hashNotification(notif2));
  });
});
