import {
  listNotes,
  createNote,
  getNote,
  updateNote,
  deleteNote,
  archiveNote,
  restoreNote,
  markAsReviewed,
  moveNote,
} from '@/lib/services/notes';
import { createCollection } from '@/lib/services/collections';
import { createTag } from '@/lib/services/tags';
import { db } from '@/lib/db';
import { getTodayUTC, calculateNextReviewDate } from '@/lib/dates';

describe('Notes Service', () => {
  let userId: string;
  let collectionId: string;
  let tagId1: string;
  let tagId2: string;

  beforeEach(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        provider: 'test',
        providerUserId: `test-${Date.now()}`,
        displayName: 'Test User',
      },
    });
    userId = user.id;

    // Create test collection
    const collection = await db.collection.create({
      data: {
        userId,
        name: `Test Collection ${Date.now()}`,
      },
    });
    collectionId = collection.id;

    // Create test tags
    const tag1 = await db.tag.create({
      data: {
        userId,
        name: `Tag1-${Date.now()}`,
      },
    });
    tagId1 = tag1.id;

    const tag2 = await db.tag.create({
      data: {
        userId,
        name: `Tag2-${Date.now()}`,
      },
    });
    tagId2 = tag2.id;
  });

  afterEach(async () => {
    // Cleanup
    await db.note.deleteMany({ where: { userId } });
    await db.noteTag.deleteMany({});
    await db.tag.deleteMany({ where: { userId } });
    await db.collection.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  });

  describe('createNote', () => {
    it('creates a new note with required fields', async () => {
      const note = await createNote(userId, {
        title: 'Test Note',
        content: 'Test content',
        collectionId,
      });

      expect(note.title).toBe('Test Note');
      expect(note.content).toBe('Test content');
      expect(note.collection.id).toBe(collectionId);
      expect(note.status).toBe('Active');
      expect(note.reviewInterval).toBe('none');
      expect(note.nextReviewDate).toBeNull();
    });

    it('creates note with review interval', async () => {
      const note = await createNote(userId, {
        title: 'Daily Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      expect(note.reviewInterval).toBe('daily');
      expect(note.nextReviewDate).toBeTruthy();
    });

    it('creates note with custom review interval', async () => {
      const note = await createNote(userId, {
        title: 'Custom Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'custom',
        customDays: 5,
      });

      expect(note.reviewInterval).toBe('custom');
      expect(note.customDays).toBe(5);
    });

    it('creates note with tags', async () => {
      const note = await createNote(userId, {
        title: 'Tagged Note',
        content: 'Content',
        collectionId,
        tagIds: [tagId1, tagId2],
      });

      expect(note.tags).toHaveLength(2);
      expect(note.tags.map((t) => t.id)).toContain(tagId1);
      expect(note.tags.map((t) => t.id)).toContain(tagId2);
    });

    it('creates note with source URL', async () => {
      const url = 'https://example.com';
      const note = await createNote(userId, {
        title: 'Link Note',
        content: 'Content',
        collectionId,
        sourceUrl: url,
      });

      expect(note.sourceUrl).toBe(url);
    });

    it('rejects empty title', async () => {
      await expect(
        createNote(userId, {
          title: '',
          content: 'Content',
          collectionId,
        })
      ).rejects.toThrow('title is required');
    });

    it('rejects empty content', async () => {
      await expect(
        createNote(userId, {
          title: 'Title',
          content: '',
          collectionId,
        })
      ).rejects.toThrow('content is required');
    });

    it('rejects missing collection', async () => {
      await expect(
        createNote(userId, {
          title: 'Title',
          content: 'Content',
          collectionId: 'nonexistent',
        })
      ).rejects.toThrow('Collection not found');
    });

    it('rejects collection not owned by user', async () => {
      const otherUser = await db.user.create({
        data: {
          provider: 'test',
          providerUserId: `other-${Date.now()}`,
          displayName: 'Other User',
        },
      });

      const otherCollection = await db.collection.create({
        data: {
          userId: otherUser.id,
          name: 'Other Collection',
        },
      });

      await expect(
        createNote(userId, {
          title: 'Title',
          content: 'Content',
          collectionId: otherCollection.id,
        })
      ).rejects.toThrow('not owned by user');

      await db.collection.delete({ where: { id: otherCollection.id } });
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('listNotes', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'Note 1',
        content: 'Content 1',
        collectionId,
        tagIds: [tagId1],
      });

      await createNote(userId, {
        title: 'Note 2',
        content: 'Content 2',
        collectionId,
        tagIds: [tagId2],
      });

      await createNote(userId, {
        title: 'Note 3',
        content: 'Content 3',
        collectionId,
        reviewInterval: 'daily',
      });
    });

    it('lists all notes for user', async () => {
      const notes = await listNotes(userId);
      expect(notes).toHaveLength(3);
    });

    it('filters by collection', async () => {
      const secondCollection = await createCollection(userId, 'Second Collection');
      await createNote(userId, {
        title: 'Note in Second',
        content: 'Content',
        collectionId: secondCollection.id,
      });

      const filtered = await listNotes(userId, { collectionId });
      expect(filtered).toHaveLength(3);
    });

    it('filters by tag (AND logic)', async () => {
      const filtered = await listNotes(userId, { tagIds: [tagId1] });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((n) => n.tags.map((t) => t.id).includes(tagId1))).toBe(true);
    });

    it('searches by title', async () => {
      const filtered = await listNotes(userId, { search: 'Note 1' });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((n) => n.title.includes('Note 1'))).toBe(true);
    });

    it('filters by status', async () => {
      const note = (await listNotes(userId))[0];
      await archiveNote(userId, note.id);

      const active = await listNotes(userId, { status: 'Active' });
      const archived = await listNotes(userId, { status: 'Archived' });

      expect(active.length).toBe(2);
      expect(archived.length).toBe(1);
    });

    it('paginates results', async () => {
      const page1 = await listNotes(userId, {}, 0, 2);
      const page2 = await listNotes(userId, {}, 2, 2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });
  });

  describe('getNote', () => {
    it('gets a single note by ID', async () => {
      const created = await createNote(userId, {
        title: 'Get Test',
        content: 'Content',
        collectionId,
      });

      const retrieved = await getNote(userId, created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Get Test');
    });

    it('rejects if note not found', async () => {
      await expect(getNote(userId, 'nonexistent')).rejects.toThrow('not found');
    });

    it('rejects if note not owned by user', async () => {
      const otherUser = await db.user.create({
        data: {
          provider: 'test',
          providerUserId: `other-${Date.now()}`,
          displayName: 'Other User',
        },
      });

      const note = await createNote(userId, {
        title: 'My Note',
        content: 'Content',
        collectionId,
      });

      await expect(getNote(otherUser.id, note.id)).rejects.toThrow('not owned by user');
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('updateNote', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await createNote(userId, {
        title: 'Original',
        content: 'Original content',
        collectionId,
      });
      noteId = note.id;
    });

    it('updates title', async () => {
      const updated = await updateNote(userId, noteId, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
      expect(updated.content).toBe('Original content');
    });

    it('updates content', async () => {
      const updated = await updateNote(userId, noteId, { content: 'New content' });
      expect(updated.content).toBe('New content');
    });

    it('updates review interval', async () => {
      const updated = await updateNote(userId, noteId, { reviewInterval: 'weekly' });
      expect(updated.reviewInterval).toBe('weekly');
      expect(updated.nextReviewDate).toBeTruthy();
    });

    it('moves to different collection', async () => {
      const newCollection = await createCollection(userId, 'New Collection');
      const updated = await updateNote(userId, noteId, { collectionId: newCollection.id });

      expect(updated.collection.id).toBe(newCollection.id);
    });
  });

  describe('deleteNote', () => {
    it('deletes a note', async () => {
      const note = await createNote(userId, {
        title: 'To Delete',
        content: 'Content',
        collectionId,
      });

      await deleteNote(userId, note.id);

      await expect(getNote(userId, note.id)).rejects.toThrow('not found');
    });

    it('rejects if not owned', async () => {
      const otherUser = await db.user.create({
        data: {
          provider: 'test',
          providerUserId: `other-${Date.now()}`,
          displayName: 'Other User',
        },
      });

      const note = await createNote(userId, {
        title: 'My Note',
        content: 'Content',
        collectionId,
      });

      await expect(deleteNote(otherUser.id, note.id)).rejects.toThrow('not owned by user');
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('archiveNote', () => {
    it('archives a note', async () => {
      const note = await createNote(userId, {
        title: 'To Archive',
        content: 'Content',
        collectionId,
      });

      const archived = await archiveNote(userId, note.id);
      expect(archived.status).toBe('Archived');
    });

    it('rejects if not owned', async () => {
      const otherUser = await db.user.create({
        data: {
          provider: 'test',
          providerUserId: `other-${Date.now()}`,
          displayName: 'Other User',
        },
      });

      const note = await createNote(userId, {
        title: 'My Note',
        content: 'Content',
        collectionId,
      });

      await expect(archiveNote(otherUser.id, note.id)).rejects.toThrow('not owned by user');
      await db.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('restoreNote', () => {
    it('restores archived note', async () => {
      const note = await createNote(userId, {
        title: 'To Restore',
        content: 'Content',
        collectionId,
      });

      await archiveNote(userId, note.id);
      const restored = await restoreNote(userId, note.id);

      expect(restored.status).toBe('Active');
    });
  });

  describe('markAsReviewed', () => {
    it('marks note as reviewed and updates dates', async () => {
      const note = await createNote(userId, {
        title: 'To Review',
        content: 'Content',
        collectionId,
        reviewInterval: 'weekly',
      });

      const reviewed = await markAsReviewed(userId, note.id);

      expect(reviewed.lastReviewedDate).toBeTruthy();
      expect(reviewed.nextReviewDate).toBeTruthy();
      expect(reviewed.lastReviewedDate).toEqual(getTodayUTC());
    });

    it('recalculates next review date correctly', async () => {
      const note = await createNote(userId, {
        title: 'To Review',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      const reviewed = await markAsReviewed(userId, note.id);
      const expectedNext = calculateNextReviewDate('daily');

      expect(reviewed.nextReviewDate).toEqual(expectedNext);
    });
  });

  describe('moveNote', () => {
    it('moves note to different collection', async () => {
      const note = await createNote(userId, {
        title: 'To Move',
        content: 'Content',
        collectionId,
      });

      const newCollection = await createCollection(userId, 'Target Collection');
      const moved = await moveNote(userId, note.id, newCollection.id);

      expect(moved.collection.id).toBe(newCollection.id);
    });

    it('rejects invalid target collection', async () => {
      const note = await createNote(userId, {
        title: 'To Move',
        content: 'Content',
        collectionId,
      });

      await expect(moveNote(userId, note.id, 'nonexistent')).rejects.toThrow(
        'Collection not found'
      );
    });
  });

  describe('Authorization', () => {
    it('prevents cross-user access', async () => {
      const otherUser = await db.user.create({
        data: {
          provider: 'test',
          providerUserId: `other-${Date.now()}`,
          displayName: 'Other User',
        },
      });

      const note = await createNote(userId, {
        title: 'My Note',
        content: 'Content',
        collectionId,
      });

      await expect(getNote(otherUser.id, note.id)).rejects.toThrow('not owned by user');
      await expect(updateNote(otherUser.id, note.id, { title: 'Hack' })).rejects.toThrow(
        'not owned by user'
      );
      await expect(deleteNote(otherUser.id, note.id)).rejects.toThrow('not owned by user');

      await db.user.delete({ where: { id: otherUser.id } });
    });
  });
});
