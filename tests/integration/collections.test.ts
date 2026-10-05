import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollection,
} from '@/lib/services/collections';
import { db } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  db: {
    collection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('Collections Service', () => {
  const userId = 'user-123';
  const collectionId = 'collection-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('T025: listCollections', () => {
    it('should list all collections for a user', async () => {
      const mockCollections = [
        {
          id: 'col-1',
          name: 'Learning',
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { notes: 5 },
        },
        {
          id: 'col-2',
          name: 'Projects',
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { notes: 3 },
        },
      ];

      (db.collection.findMany as jest.Mock).mockResolvedValue(mockCollections);

      const result = await listCollections(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Learning');
      expect(result[0].noteCount).toBe(5);
    });

    it('should throw error if userId is missing', async () => {
      await expect(listCollections('')).rejects.toThrow('User ID is required');
    });
  });

  describe('T025: createCollection', () => {
    it('should create a new collection', async () => {
      const mockCollection = {
        id: collectionId,
        name: 'Research',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.collection.findUnique as jest.Mock).mockResolvedValue(null);
      (db.collection.create as jest.Mock).mockResolvedValue(mockCollection);

      const result = await createCollection(userId, 'Research');

      expect(result.name).toBe('Research');
      expect(result.id).toBe(collectionId);
    });

    it('should reject empty collection name', async () => {
      await expect(createCollection(userId, '')).rejects.toThrow(
        'Collection name is required'
      );
    });

    it('should reject name exceeding max length', async () => {
      const longName = 'a'.repeat(256);
      await expect(createCollection(userId, longName)).rejects.toThrow(
        'Collection name must be 255 characters or less'
      );
    });

    it('should reject duplicate collection name for same user', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        name: 'Learning',
        userId,
      });

      await expect(createCollection(userId, 'Learning')).rejects.toThrow(
        'Collection "Learning" already exists'
      );
    });

    it('should trim whitespace from collection name', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue(null);
      (db.collection.create as jest.Mock).mockResolvedValue({
        id: collectionId,
        name: 'Trimmed',
        userId,
        createdAt: new Date(),
      });

      await createCollection(userId, '  Trimmed  ');

      expect(db.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Trimmed' }),
        })
      );
    });
  });

  describe('T026: updateCollection', () => {
    it('should rename a collection', async () => {
      const mockCollection = {
        id: collectionId,
        name: 'New Name',
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.collection.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: collectionId, userId })
        .mockResolvedValueOnce(null); // Check for duplicate
      (db.collection.update as jest.Mock).mockResolvedValue(mockCollection);

      const result = await updateCollection(userId, collectionId, 'New Name');

      expect(result.name).toBe('New Name');
    });

    it('should reject if collection not found', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateCollection(userId, collectionId, 'New Name')
      ).rejects.toThrow('Collection not found');
    });

    it('should reject if user does not own collection', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId: 'different-user',
      });

      await expect(
        updateCollection(userId, collectionId, 'New Name')
      ).rejects.toThrow('Unauthorized');
    });

    it('should reject duplicate name for same user', async () => {
      (db.collection.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: collectionId, userId })
        .mockResolvedValueOnce({
          id: 'other-col',
          name: 'Learning',
          userId,
        });

      await expect(
        updateCollection(userId, collectionId, 'Learning')
      ).rejects.toThrow('Collection "Learning" already exists');
    });
  });

  describe('T026: deleteCollection', () => {
    it('should delete collection and cascade notes', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId,
        _count: { notes: 5 },
      });
      (db.collection.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteCollection(userId, collectionId);

      expect(result.notesDeleted).toBe(5);
    });

    it('should reject if collection not found', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteCollection(userId, collectionId)).rejects.toThrow(
        'Collection not found'
      );
    });

    it('should reject if user does not own collection', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId: 'different-user',
      });

      await expect(deleteCollection(userId, collectionId)).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('T032: Cross-User Isolation', () => {
    it('user should not access another user\'s collection', async () => {
      const otherUserId = 'user-999';

      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId: otherUserId,
      });

      await expect(getCollection(userId, collectionId)).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('user should not be able to rename another user\'s collection', async () => {
      const otherUserId = 'user-999';

      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId: otherUserId,
      });

      await expect(
        updateCollection(userId, collectionId, 'New Name')
      ).rejects.toThrow('Unauthorized');
    });

    it('user should not be able to delete another user\'s collection', async () => {
      const otherUserId = 'user-999';

      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId: otherUserId,
      });

      await expect(deleteCollection(userId, collectionId)).rejects.toThrow(
        'Unauthorized'
      );
    });
  });

  describe('T032: Unique Name Validation', () => {
    it('collection names should be unique per user', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-col',
        name: 'Learning',
        userId,
      });

      await expect(createCollection(userId, 'Learning')).rejects.toThrow(
        'already exists'
      );
    });

    it('different users should be able to have same collection name', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 creates "Learning"
      (db.collection.findUnique as jest.Mock).mockResolvedValue(null);
      (db.collection.create as jest.Mock).mockResolvedValue({
        id: 'col-1',
        name: 'Learning',
        userId: user1,
      });

      const result1 = await createCollection(user1, 'Learning');
      expect(result1.name).toBe('Learning');

      // User 2 should also be able to create "Learning"
      (db.collection.findUnique as jest.Mock).mockResolvedValue(null);
      (db.collection.create as jest.Mock).mockResolvedValue({
        id: 'col-2',
        name: 'Learning',
        userId: user2,
      });

      const result2 = await createCollection(user2, 'Learning');
      expect(result2.name).toBe('Learning');
    });
  });

  describe('T032: Cascade Delete', () => {
    it('should report number of notes deleted with collection', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId,
        _count: { notes: 10 },
      });

      const result = await deleteCollection(userId, collectionId);

      expect(result.notesDeleted).toBe(10);
    });

    it('should allow deletion of empty collection', async () => {
      (db.collection.findUnique as jest.Mock).mockResolvedValue({
        id: collectionId,
        userId,
        _count: { notes: 0 },
      });

      const result = await deleteCollection(userId, collectionId);

      expect(result.notesDeleted).toBe(0);
    });
  });
});
