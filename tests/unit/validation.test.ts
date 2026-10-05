import {
  createCollectionSchema,
  createNoteSchema,
  updateNoteSchema,
  createTagSchema,
  notesFilterSchema,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('Collection Schema', () => {
    it('should validate valid collection name', () => {
      const input = { name: 'Learning' };
      const result = createCollectionSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Learning');
      }
    });

    it('should reject empty collection name', () => {
      const input = { name: '' };
      const result = createCollectionSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject collection name exceeding max length', () => {
      const input = { name: 'a'.repeat(256) };
      const result = createCollectionSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('Tag Schema', () => {
    it('should validate valid tag name', () => {
      const input = { name: 'important' };
      const result = createTagSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('important');
      }
    });

    it('should reject empty tag name', () => {
      const input = { name: '' };
      const result = createTagSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject tag name exceeding max length', () => {
      const input = { name: 'a'.repeat(101) };
      const result = createTagSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('Note Schema', () => {
    const validCollectionId = 'clg1a1a1a1a1a1a1a1a1a1a';

    it('should validate note with all required fields', () => {
      const input = {
        title: 'React Hooks',
        content: 'Custom hooks for reusable logic',
        collectionId: validCollectionId,
        reviewInterval: 'weekly',
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject note with empty title', () => {
      const input = {
        title: '',
        content: 'Some content',
        collectionId: validCollectionId,
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject note with empty content', () => {
      const input = {
        title: 'Title',
        content: '',
        collectionId: validCollectionId,
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should validate note with optional sourceUrl', () => {
      const input = {
        title: 'Rust Guide',
        content: 'Learning Rust',
        collectionId: validCollectionId,
        sourceUrl: 'https://doc.rust-lang.org',
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject invalid sourceUrl', () => {
      const input = {
        title: 'Note',
        content: 'Content',
        collectionId: validCollectionId,
        sourceUrl: 'not-a-url',
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should validate custom review interval with customDays', () => {
      const input = {
        title: 'Note',
        content: 'Content',
        collectionId: validCollectionId,
        reviewInterval: 'custom',
        customDays: 14,
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject custom interval without customDays', () => {
      const input = {
        title: 'Note',
        content: 'Content',
        collectionId: validCollectionId,
        reviewInterval: 'custom',
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject custom interval with invalid customDays', () => {
      const input = {
        title: 'Note',
        content: 'Content',
        collectionId: validCollectionId,
        reviewInterval: 'custom',
        customDays: 0,
      };
      const result = createNoteSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('Notes Filter Schema', () => {
    it('should validate filter with search', () => {
      const input = { search: 'React' };
      const result = notesFilterSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should validate filter with status', () => {
      const input = { status: 'active' };
      const result = notesFilterSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should validate filter with reviewState', () => {
      const input = { reviewState: 'due' };
      const result = notesFilterSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should apply default pagination', () => {
      const input = {};
      const result = notesFilterSchema.safeParse(input);

      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject invalid pagination', () => {
      const input = { page: -1, limit: 200 };
      const result = notesFilterSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});
