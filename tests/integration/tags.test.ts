import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  getTag,
} from '@/lib/services/tags';
import { db } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  db: {
    tag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('Tags Service', () => {
  const userId = 'user-123';
  const tagId = 'tag-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('T033: listTags', () => {
    it('should list all tags for a user', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'important',
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { notes: 5 },
        },
        {
          id: 'tag-2',
          name: 'review-soon',
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { notes: 3 },
        },
      ];

      (db.tag.findMany as jest.Mock).mockResolvedValue(mockTags);

      const result = await listTags(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('important');
      expect(result[0].noteCount).toBe(5);
    });

    it('should throw error if userId is missing', async () => {
      await expect(listTags('')).rejects.toThrow('User ID is required');
    });
  });

  describe('T033: createTag', () => {
    it('should create a new tag', async () => {
      const mockTag = {
        id: tagId,
        name: 'archived',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.tag.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tag.create as jest.Mock).mockResolvedValue(mockTag);

      const result = await createTag(userId, 'archived');

      expect(result.name).toBe('archived');
      expect(result.id).toBe(tagId);
    });

    it('should reject empty tag name', async () => {
      await expect(createTag(userId, '')).rejects.toThrow(
        'Tag name is required'
      );
    });

    it('should reject name exceeding max length', async () => {
      const longName = 'a'.repeat(101);
      await expect(createTag(userId, longName)).rejects.toThrow(
        'Tag name must be 100 characters or less'
      );
    });

    it('should reject duplicate tag name for same user', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        name: 'important',
        userId,
      });

      await expect(createTag(userId, 'important')).rejects.toThrow(
        'Tag "important" already exists'
      );
    });

    it('should trim whitespace from tag name', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tag.create as jest.Mock).mockResolvedValue({
        id: tagId,
        name: 'trimmed',
        userId,
        createdAt: new Date(),
      });

      await createTag(userId, '  trimmed  ');

      expect(db.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'trimmed' }),
        })
      );
    });
  });

  describe('T034: updateTag', () => {
    it('should rename a tag', async () => {
      const mockTag = {
        id: tagId,
        name: 'new-name',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.tag.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: tagId, userId })
        .mockResolvedValueOnce(null); // Check for duplicate
      (db.tag.update as jest.Mock).mockResolvedValue(mockTag);

      const result = await updateTag(userId, tagId, 'new-name');

      expect(result.name).toBe('new-name');
    });

    it('should reject if tag not found', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateTag(userId, tagId, 'new-name')).rejects.toThrow(
        'Tag not found'
      );
    });

    it('should reject if user does not own tag', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId: 'different-user',
      });

      await expect(updateTag(userId, tagId, 'new-name')).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('should reject duplicate name for same user', async () => {
      (db.tag.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: tagId, userId })
        .mockResolvedValueOnce({
          id: 'other-tag',
          name: 'important',
          userId,
        });

      await expect(
        updateTag(userId, tagId, 'important')
      ).rejects.toThrow('Tag "important" already exists');
    });
  });

  describe('T034: deleteTag', () => {
    it('should delete tag and report notes modified', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId,
        _count: { notes: 5 },
      });
      (db.tag.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteTag(userId, tagId);

      expect(result.notesModified).toBe(5);
    });

    it('should reject if tag not found', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteTag(userId, tagId)).rejects.toThrow('Tag not found');
    });

    it('should reject if user does not own tag', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId: 'different-user',
      });

      await expect(deleteTag(userId, tagId)).rejects.toThrow('Unauthorized');
    });

    it('should allow deletion of tag with no notes', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId,
        _count: { notes: 0 },
      });

      const result = await deleteTag(userId, tagId);

      expect(result.notesModified).toBe(0);
    });
  });

  describe('T039: Cross-User Isolation', () => {
    it('user should not access another user\'s tag', async () => {
      const otherUserId = 'user-999';

      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId: otherUserId,
      });

      await expect(getTag(userId, tagId)).rejects.toThrow('Unauthorized');
    });

    it('user should not be able to rename another user\'s tag', async () => {
      const otherUserId = 'user-999';

      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId: otherUserId,
      });

      await expect(updateTag(userId, tagId, 'new-name')).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('user should not be able to delete another user\'s tag', async () => {
      const otherUserId = 'user-999';

      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId: otherUserId,
      });

      await expect(deleteTag(userId, tagId)).rejects.toThrow('Unauthorized');
    });
  });

  describe('T039: Unique Name Validation', () => {
    it('tag names should be unique per user', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-tag',
        name: 'important',
        userId,
      });

      await expect(createTag(userId, 'important')).rejects.toThrow(
        'already exists'
      );
    });

    it('different users should be able to have same tag name', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 creates "important"
      (db.tag.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tag.create as jest.Mock).mockResolvedValue({
        id: 'tag-1',
        name: 'important',
        userId: user1,
      });

      const result1 = await createTag(user1, 'important');
      expect(result1.name).toBe('important');

      // User 2 should also be able to create "important"
      (db.tag.findUnique as jest.Mock).mockResolvedValue(null);
      (db.tag.create as jest.Mock).mockResolvedValue({
        id: 'tag-2',
        name: 'important',
        userId: user2,
      });

      const result2 = await createTag(user2, 'important');
      expect(result2.name).toBe('important');
    });
  });

  describe('T039: No Cascade Delete', () => {
    it('should not delete notes when tag is deleted', async () => {
      (db.tag.findUnique as jest.Mock).mockResolvedValue({
        id: tagId,
        userId,
        _count: { notes: 5 },
      });

      const result = await deleteTag(userId, tagId);

      // Tag deleted but notes still exist
      expect(result.notesModified).toBe(5);
      // Verify delete was called (not all related notes)
      expect(db.tag.delete).toHaveBeenCalledWith({
        where: { id: tagId },
      });
    });
  });
});
