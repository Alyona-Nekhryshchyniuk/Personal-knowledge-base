import { getDueNotifications } from '@/lib/services/notifications';
import { db } from '@/lib/db';

jest.mock('@/lib/db');
jest.mock('@/lib/services/notifications');

describe('WebSocket Integration', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const mockGetDueNotifications = getDueNotifications as jest.MockedFunction<typeof getDueNotifications>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve due notifications for valid user', async () => {
    const mockNotifications = [
      {
        noteId: 'note-1',
        title: 'Review me',
        collectionName: 'Collection 1',
        nextReviewDate: '2026-10-14',
        overdue: false,
        daysOverdue: 0,
      },
    ];

    mockGetDueNotifications.mockResolvedValue(mockNotifications);

    const result = await getDueNotifications('user-123');

    expect(result).toHaveLength(1);
    expect(result[0].noteId).toBe('note-1');
    expect(mockGetDueNotifications).toHaveBeenCalledWith('user-123');
  });

  it('should return empty array when no notifications due', async () => {
    mockGetDueNotifications.mockResolvedValue([]);

    const result = await getDueNotifications('user-456');

    expect(result).toHaveLength(0);
  });

  it('should handle multiple notifications', async () => {
    const mockNotifications = [
      {
        noteId: 'note-1',
        title: 'Review 1',
        collectionName: 'Col A',
        nextReviewDate: '2026-10-14',
        overdue: false,
        daysOverdue: 0,
      },
      {
        noteId: 'note-2',
        title: 'Review 2',
        collectionName: 'Col B',
        nextReviewDate: '2026-10-13',
        overdue: true,
        daysOverdue: 1,
      },
    ];

    mockGetDueNotifications.mockResolvedValue(mockNotifications);

    const result = await getDueNotifications('user-789');

    expect(result).toHaveLength(2);
    expect(result[1].overdue).toBe(true);
  });
});
