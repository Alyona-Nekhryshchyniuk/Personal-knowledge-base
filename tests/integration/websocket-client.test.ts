import { WebSocketNotification } from '@/lib/hooks/useWebSocket';

describe('WebSocket Client', () => {
  const mockNotification: WebSocketNotification = {
    noteId: 'note-1',
    title: 'Review me',
    collectionName: 'Collection',
    nextReviewDate: '2026-10-14',
    overdue: false,
    daysOverdue: 0,
  };

  it('should create notification hash', () => {
    const hash1 = `${mockNotification.noteId}-${mockNotification.nextReviewDate}-${mockNotification.overdue}`;
    const hash2 = `${mockNotification.noteId}-${mockNotification.nextReviewDate}-${mockNotification.overdue}`;

    expect(hash1).toBe(hash2);
  });

  it('should differentiate notifications by hash', () => {
    const notif1 = { ...mockNotification, noteId: 'note-1' };
    const notif2 = { ...mockNotification, noteId: 'note-2' };

    const hash1 = `${notif1.noteId}-${notif1.nextReviewDate}-${notif1.overdue}`;
    const hash2 = `${notif2.noteId}-${notif2.nextReviewDate}-${notif2.overdue}`;

    expect(hash1).not.toBe(hash2);
  });

  it('should track seen notifications', () => {
    const seen = new Set<string>();
    const hash = `${mockNotification.noteId}-${mockNotification.nextReviewDate}-${mockNotification.overdue}`;

    expect(seen.has(hash)).toBe(false);
    seen.add(hash);
    expect(seen.has(hash)).toBe(true);
  });

  it('should handle multiple notifications without duplication', () => {
    const notif1 = { ...mockNotification, noteId: 'note-1' };
    const notif2 = { ...mockNotification, noteId: 'note-2' };
    const notif1Duplicate = { ...mockNotification, noteId: 'note-1' };

    const hashes = new Set<string>();

    [notif1, notif2, notif1Duplicate].forEach((notif) => {
      const hash = `${notif.noteId}-${notif.nextReviewDate}-${notif.overdue}`;
      hashes.add(hash);
    });

    expect(hashes.size).toBe(2);
  });
});
