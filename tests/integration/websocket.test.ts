import {
  getDueNotifications,
  getOverdueNotifications,
  getAllNotifications,
  buildNotificationPayload,
  createNotificationHash,
  getNewlyDueNotifications,
} from '@/lib/services/notifications';
import { createNote } from '@/lib/services/notes';
import { createCollection } from '@/lib/services/collections';
import { db } from '@/lib/db';
import { getTodayUTC } from '@/lib/dates';

describe('WebSocket Notifications (T062-T068)', () => {
  let userId: string;
  let collectionId: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: {
        provider: 'test',
        providerUserId: `test-${Date.now()}`,
        displayName: 'Test User',
      },
    });
    userId = user.id;

    const collection = await db.collection.create({
      data: {
        userId,
        name: `TestCollection-${Date.now()}`,
      },
    });
    collectionId = collection.id;
  });

  afterEach(async () => {
    await db.note.deleteMany({ where: { userId } });
    await db.collection.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  });

  describe('T063: Review Notification Query', () => {
    beforeEach(async () => {
      const today = getTodayUTC();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create overdue note
      await createNote(userId, {
        title: 'Overdue Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      const overdueNote = (await db.note.findFirst({ where: { userId, title: 'Overdue Note' } }))!;
      await db.note.update({
        where: { id: overdueNote.id },
        data: { nextReviewDate: yesterday },
      });

      // Create due today note
      const dueTodayNote = await createNote(userId, {
        title: 'Due Today',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: dueTodayNote.id },
        data: { nextReviewDate: today },
      });

      // Create future note
      await createNote(userId, {
        title: 'Future Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      const futureNote = (await db.note.findFirst({ where: { userId, title: 'Future Note' } }))!;
      await db.note.update({
        where: { id: futureNote.id },
        data: { nextReviewDate: tomorrow },
      });

      // Create archived note
      const archivedNote = await createNote(userId, {
        title: 'Archived Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: archivedNote.id },
        data: { nextReviewDate: today, status: 'Archived' },
      });
    });

    it('returns only due and overdue notes', async () => {
      const notifications = await getDueNotifications(userId);
      expect(notifications.length).toBeGreaterThanOrEqual(2);
      expect(notifications.every((n) => n.overdue || n.dueToday)).toBe(true);
    });

    it('excludes archived notes', async () => {
      const notifications = await getDueNotifications(userId);
      expect(notifications.every((n) => !n.title.includes('Archived'))).toBe(true);
    });

    it('excludes future notes', async () => {
      const notifications = await getDueNotifications(userId);
      expect(notifications.every((n) => !n.title.includes('Future'))).toBe(true);
    });
  });

  describe('T063: Overdue Notifications', () => {
    beforeEach(async () => {
      const today = getTodayUTC();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const overdueNote = await createNote(userId, {
        title: 'Overdue Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: overdueNote.id },
        data: { nextReviewDate: yesterday },
      });

      const dueTodayNote = await createNote(userId, {
        title: 'Due Today',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: dueTodayNote.id },
        data: { nextReviewDate: today },
      });
    });

    it('returns only overdue notes', async () => {
      const notifications = await getOverdueNotifications(userId);
      expect(notifications.every((n) => n.overdue)).toBe(true);
      expect(notifications.every((n) => !n.dueToday)).toBe(true);
    });
  });

  describe('T063: All Notifications', () => {
    beforeEach(async () => {
      const today = getTodayUTC();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);

      const dueTodayNote = await createNote(userId, {
        title: 'Due Today',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: dueTodayNote.id },
        data: { nextReviewDate: today },
      });

      const futureNote = await createNote(userId, {
        title: 'Future Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: futureNote.id },
        data: { nextReviewDate: in7Days },
      });
    });

    it('returns all notifications within 7 days', async () => {
      const notifications = await getAllNotifications(userId);
      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('T067: Notification Payload Builder', () => {
    it('builds notification payload correctly', async () => {
      const today = getTodayUTC();
      const note = await createNote(userId, {
        title: 'Test Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      const dbNote = (await db.note.findUnique({
        where: { id: note.id },
        include: { collection: { select: { name: true } } },
      }))!;

      const payload = buildNotificationPayload(dbNote);

      expect(payload.noteId).toBe(note.id);
      expect(payload.title).toBe('Test Note');
      expect(payload.collection).toBe(dbNote.collection.name);
      expect(payload.id).toBeTruthy();
      expect(typeof payload.overdue).toBe('boolean');
      expect(typeof payload.daysOverdue).toBe('number');
      expect(typeof payload.dueToday).toBe('boolean');
    });

    it('marks overdue notes correctly', async () => {
      const today = getTodayUTC();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const note = await createNote(userId, {
        title: 'Overdue Test',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      await db.note.update({
        where: { id: note.id },
        data: { nextReviewDate: yesterday },
      });

      const dbNote = (await db.note.findUnique({
        where: { id: note.id },
        include: { collection: { select: { name: true } } },
      }))!;

      const payload = buildNotificationPayload(dbNote);

      expect(payload.overdue).toBe(true);
      expect(payload.daysOverdue).toBeGreaterThan(0);
      expect(payload.dueToday).toBe(false);
    });
  });

  describe('T062-T064: Deduplication', () => {
    it('creates unique notification hash', async () => {
      const today = getTodayUTC();
      const note = await createNote(userId, {
        title: 'Test Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      const dbNote = (await db.note.findUnique({
        where: { id: note.id },
        include: { collection: { select: { name: true } } },
      }))!;

      const payload = buildNotificationPayload(dbNote);
      const hash = createNotificationHash(payload);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('produces same hash for same notification', async () => {
      const today = getTodayUTC();
      const note = await createNote(userId, {
        title: 'Test Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      const dbNote = (await db.note.findUnique({
        where: { id: note.id },
        include: { collection: { select: { name: true } } },
      }))!;

      const payload = buildNotificationPayload(dbNote);
      const hash1 = createNotificationHash(payload);
      const hash2 = createNotificationHash(payload);

      expect(hash1).toBe(hash2);
    });
  });

  describe('T062-T064: Periodic Checks', () => {
    it('detects newly due notes since last check', async () => {
      const today = getTodayUTC();
      const yesterday = new Date(today);
      yesterday.setTime(today.getTime() - 1000); // 1 second ago

      const note = await createNote(userId, {
        title: 'New Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      await db.note.update({
        where: { id: note.id },
        data: { nextReviewDate: today, updatedAt: new Date() },
      });

      const newNotifications = await getNewlyDueNotifications(userId, yesterday);

      expect(newNotifications.length).toBeGreaterThan(0);
      expect(newNotifications.some((n) => n.noteId === note.id)).toBe(true);
    });
  });

  describe('T065-T066: Error Handling', () => {
    it('rejects missing user ID in getDueNotifications', async () => {
      await expect(getDueNotifications('')).rejects.toThrow('User ID is required');
    });

    it('rejects missing user ID in getOverdueNotifications', async () => {
      await expect(getOverdueNotifications('')).rejects.toThrow('User ID is required');
    });

    it('rejects missing user ID in getAllNotifications', async () => {
      await expect(getAllNotifications('')).rejects.toThrow('User ID is required');
    });

    it('returns empty array for user with no notes', async () => {
      const notifications = await getDueNotifications(userId);
      expect(notifications).toHaveLength(0);
    });
  });

  describe('T062-T068: Integration', () => {
    it('handles full notification flow', async () => {
      const today = getTodayUTC();

      // Create note that's due
      const note = await createNote(userId, {
        title: 'Integration Test Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      await db.note.update({
        where: { id: note.id },
        data: { nextReviewDate: today },
      });

      // Get notifications
      const notifications = await getDueNotifications(userId);
      expect(notifications.length).toBeGreaterThan(0);

      // Verify payload structure
      const notification = notifications[0];
      expect(notification).toHaveProperty('id');
      expect(notification).toHaveProperty('noteId');
      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('collection');
      expect(notification).toHaveProperty('nextReviewDate');
      expect(notification).toHaveProperty('overdue');
      expect(notification).toHaveProperty('daysOverdue');
      expect(notification).toHaveProperty('dueToday');

      // Verify deduplication
      const hash = createNotificationHash(notification);
      expect(hash).toBeTruthy();
    });
  });
});
