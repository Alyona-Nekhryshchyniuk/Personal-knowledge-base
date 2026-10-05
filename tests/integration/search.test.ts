import { searchNotes, advancedSearch, getSearchSuggestions } from '@/lib/services/search';
import { createNote } from '@/lib/services/notes';
import { createCollection } from '@/lib/services/collections';
import { createTag } from '@/lib/services/tags';
import { db } from '@/lib/db';
import { getTodayUTC } from '@/lib/dates';

describe('Search & Filtering', () => {
  let userId: string;
  let collectionId: string;
  let collectionId2: string;
  let tagId1: string;
  let tagId2: string;

  beforeEach(async () => {
    const user = await db.user.create({
      data: {
        provider: 'test',
        providerUserId: `test-${Date.now()}`,
        displayName: 'Test User',
      },
    });
    userId = user.id;

    const col1 = await db.collection.create({
      data: { userId, name: `Collection1-${Date.now()}` },
    });
    collectionId = col1.id;

    const col2 = await db.collection.create({
      data: { userId, name: `Collection2-${Date.now()}` },
    });
    collectionId2 = col2.id;

    const tag1 = await db.tag.create({
      data: { userId, name: `Tag1-${Date.now()}` },
    });
    tagId1 = tag1.id;

    const tag2 = await db.tag.create({
      data: { userId, name: `Tag2-${Date.now()}` },
    });
    tagId2 = tag2.id;
  });

  afterEach(async () => {
    await db.note.deleteMany({ where: { userId } });
    await db.noteTag.deleteMany({});
    await db.tag.deleteMany({ where: { userId } });
    await db.collection.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  });

  describe('T055: Search by Title', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'React Best Practices',
        content: 'Learn React patterns',
        collectionId,
      });
      await createNote(userId, {
        title: 'Vue Guide',
        content: 'Vue best practices and patterns',
        collectionId,
      });
      await createNote(userId, {
        title: 'Angular Basics',
        content: 'Introduction to Angular',
        collectionId,
      });
    });

    it('searches by title', async () => {
      const results = await searchNotes(userId, 'React');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('React');
    });

    it('is case-insensitive', async () => {
      const resultsLower = await searchNotes(userId, 'react');
      const resultsUpper = await searchNotes(userId, 'REACT');
      expect(resultsLower.length).toBe(resultsUpper.length);
    });

    it('returns no results for non-matching query', async () => {
      const results = await searchNotes(userId, 'Python');
      expect(results.length).toBe(0);
    });
  });

  describe('T055: Search by Content', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'Note 1',
        content: 'This note contains JavaScript information',
        collectionId,
      });
      await createNote(userId, {
        title: 'Note 2',
        content: 'This note is about TypeScript',
        collectionId,
      });
    });

    it('searches by content', async () => {
      const results = await searchNotes(userId, 'JavaScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('JavaScript');
    });
  });

  describe('T055: Search by URL', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'Github Link',
        content: 'Saved from Github',
        collectionId,
        sourceUrl: 'https://github.com/user/repo',
      });
      await createNote(userId, {
        title: 'Stack Overflow',
        content: 'Helpful answer',
        collectionId,
        sourceUrl: 'https://stackoverflow.com/questions/12345',
      });
    });

    it('searches by URL', async () => {
      const results = await searchNotes(userId, 'github');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sourceUrl).toContain('github');
    });
  });

  describe('T056: Collection Filter', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'In Collection 1',
        content: 'Content',
        collectionId,
      });
      await createNote(userId, {
        title: 'In Collection 2',
        content: 'Content',
        collectionId: collectionId2,
      });
    });

    it('filters by single collection', async () => {
      const results = await searchNotes(userId, 'In', {
        collectionId,
      });
      expect(results).toHaveLength(1);
      expect(results[0].collection.id).toBe(collectionId);
    });
  });

  describe('T057: Tag Filter', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'Tagged Note 1',
        content: 'Content',
        collectionId,
        tagIds: [tagId1],
      });
      await createNote(userId, {
        title: 'Tagged Note 2',
        content: 'Content',
        collectionId,
        tagIds: [tagId2],
      });
      await createNote(userId, {
        title: 'Tagged Note 3',
        content: 'Content',
        collectionId,
        tagIds: [tagId1, tagId2],
      });
    });

    it('filters by single tag', async () => {
      const results = await searchNotes(userId, 'Tagged', {
        tagIds: [tagId1],
      });
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by multiple tags (AND logic)', async () => {
      const results = await searchNotes(userId, 'Tagged', {
        tagIds: [tagId1, tagId2],
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Tagged Note 3');
    });
  });

  describe('T058: Status Filter', () => {
    beforeEach(async () => {
      const note = await createNote(userId, {
        title: 'Active Note',
        content: 'Content',
        collectionId,
      });
      await db.note.update({
        where: { id: note.id },
        data: { status: 'Active' },
      });

      const note2 = await createNote(userId, {
        title: 'Archived Note',
        content: 'Content',
        collectionId,
      });
      await db.note.update({
        where: { id: note2.id },
        data: { status: 'Archived' },
      });
    });

    it('filters by Active status', async () => {
      const results = await searchNotes(userId, 'Note', {
        status: 'Active',
      });
      expect(results.every((n) => n.status === 'Active')).toBe(true);
    });

    it('filters by Archived status', async () => {
      const results = await searchNotes(userId, 'Note', {
        status: 'Archived',
      });
      expect(results.every((n) => n.status === 'Archived')).toBe(true);
    });
  });

  describe('T059: Review State Filter', () => {
    beforeEach(async () => {
      const today = getTodayUTC();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createNote(userId, {
        title: 'Due Today',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });

      const overdueNote = await createNote(userId, {
        title: 'Overdue Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'daily',
      });
      await db.note.update({
        where: { id: overdueNote.id },
        data: { nextReviewDate: new Date(today.getTime() - 86400000) },
      });

      await createNote(userId, {
        title: 'No Review Note',
        content: 'Content',
        collectionId,
        reviewInterval: 'none',
      });
    });

    it('filters by due state', async () => {
      const results = await advancedSearch(userId, {
        query: 'Today',
        reviewState: 'due',
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('filters by overdue state', async () => {
      const results = await advancedSearch(userId, {
        query: 'Overdue',
        reviewState: 'overdue',
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('filters by no review state', async () => {
      const results = await advancedSearch(userId, {
        query: 'No Review',
        reviewState: 'none',
      });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('T060: Combined Filters', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'JavaScript Guide',
        content: 'Learn JavaScript',
        collectionId,
        tagIds: [tagId1],
        reviewInterval: 'weekly',
      });

      await createNote(userId, {
        title: 'TypeScript Tips',
        content: 'TypeScript best practices',
        collectionId: collectionId2,
        tagIds: [tagId2],
        reviewInterval: 'none',
      });
    });

    it('combines search + collection', async () => {
      const results = await searchNotes(userId, 'Script', {
        collectionId,
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((n) => n.collection.id === collectionId)).toBe(true);
    });

    it('combines search + tags', async () => {
      const results = await searchNotes(userId, 'Script', {
        tagIds: [tagId1],
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('combines all filters', async () => {
      const results = await advancedSearch(userId, {
        query: 'Script',
        collectionId,
        tagIds: [tagId1],
        status: 'Active',
        reviewState: 'next7days',
      });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('T055: Search Relevance', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'React',
        content: 'React framework',
        collectionId,
      });
      await createNote(userId, {
        title: 'Guide to React',
        content: 'This is a comprehensive guide about React development',
        collectionId,
      });
    });

    it('prioritizes title matches', async () => {
      const results = await searchNotes(userId, 'React');
      expect(results[0].title).toBe('React');
    });

    it('includes relevance score', async () => {
      const results = await searchNotes(userId, 'React');
      expect(results.every((n) => 'relevanceScore' in n)).toBe(true);
      expect(results[0].relevanceScore > results[1].relevanceScore).toBe(true);
    });
  });

  describe('T055: Search Pagination', () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i++) {
        await createNote(userId, {
          title: `Note ${i}`,
          content: 'Searchable content',
          collectionId,
        });
      }
    });

    it('paginates results', async () => {
      const page1 = await searchNotes(userId, 'Note', { take: 10 });
      const page2 = await searchNotes(userId, 'Note', { skip: 10, take: 10 });

      expect(page1.length).toBe(10);
      expect(page2.length).toBeLessThanOrEqual(10);
    });
  });

  describe('T055: Search Suggestions', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'JavaScript Basics',
        content: 'Content',
        collectionId,
      });
      await createNote(userId, {
        title: 'JavaScript Advanced',
        content: 'Content',
        collectionId,
      });
    });

    it('returns suggestions for prefix', async () => {
      const suggestions = await getSearchSuggestions(userId, 'Java');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('requires minimum prefix length', async () => {
      const suggestions = await getSearchSuggestions(userId, 'J');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Advanced Search', () => {
    beforeEach(async () => {
      await createNote(userId, {
        title: 'With URL',
        content: 'Content',
        collectionId,
        sourceUrl: 'https://example.com',
      });
      await createNote(userId, {
        title: 'No URL',
        content: 'Content',
        collectionId,
      });
    });

    it('filters by URL presence', async () => {
      const withUrl = await advancedSearch(userId, {
        hasUrl: true,
      });
      const withoutUrl = await advancedSearch(userId, {
        hasUrl: false,
      });

      expect(withUrl.length).toBeGreaterThan(0);
      expect(withUrl.every((n) => n.sourceUrl)).toBe(true);
      expect(withoutUrl.every((n) => !n.sourceUrl)).toBe(true);
    });
  });

  describe('T061: Empty Results', () => {
    it('handles empty search results gracefully', async () => {
      const results = await searchNotes(userId, 'NonExistent');
      expect(results).toHaveLength(0);
    });

    it('handles empty filtered results', async () => {
      const results = await advancedSearch(userId, {
        collectionId,
        status: 'Active',
      });
      expect(results).toHaveLength(0);
    });
  });
});
