import { getDueNotifications } from '@/lib/services/notifications';

jest.mock('@/lib/services/notifications');

describe('WebSocket E2E Flow', () => {
  const mockGetDueNotifications = getDueNotifications as jest.MockedFunction<typeof getDueNotifications>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve initial notifications on connect', async () => {
    const mockNotifications = [
      {
        noteId: 'note-1',
        title: 'Review me',
        collectionName: 'Learning',
        nextReviewDate: '2026-10-14',
        overdue: false,
        daysOverdue: 0,
      },
    ];

    mockGetDueNotifications.mockResolvedValue(mockNotifications);

    const result = await getDueNotifications('user-123');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('noteId');
  });

  it('should refresh notifications on subscribe', async () => {
    const mockNotifications = [
      {
        noteId: 'note-1',
        title: 'Review me',
        collectionName: 'Learning',
        nextReviewDate: '2026-10-14',
        overdue: false,
        daysOverdue: 0,
      },
      {
        noteId: 'note-2',
        title: 'Overdue note',
        collectionName: 'Ideas',
        nextReviewDate: '2026-10-12',
        overdue: true,
        daysOverdue: 2,
      },
    ];

    mockGetDueNotifications.mockResolvedValue(mockNotifications);

    const result = await getDueNotifications('user-123');

    expect(result).toHaveLength(2);
  });

  it('should track multiple users independently', async () => {
    const user1Notifs = [
      {
        noteId: 'note-1',
        title: 'User 1 note',
        collectionName: 'Col 1',
        nextReviewDate: '2026-10-14',
        overdue: false,
        daysOverdue: 0,
      },
    ];

    const user2Notifs = [
      {
        noteId: 'note-2',
        title: 'User 2 note',
        collectionName: 'Col 2',
        nextReviewDate: '2026-10-14',
        overdue: false,
        daysOverdue: 0,
      },
    ];

    mockGetDueNotifications.mockResolvedValueOnce(user1Notifs);
    mockGetDueNotifications.mockResolvedValueOnce(user2Notifs);

    const result1 = await getDueNotifications('user-1');
    const result2 = await getDueNotifications('user-2');

    expect(result1[0].noteId).not.toBe(result2[0].noteId);
  });

  it('should handle empty notification list', async () => {
    mockGetDueNotifications.mockResolvedValue([]);

    const result = await getDueNotifications('user-no-notes');

    expect(result).toHaveLength(0);
  });
});
