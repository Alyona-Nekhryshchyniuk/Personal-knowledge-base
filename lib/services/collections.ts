import { db } from '@/lib/db';

/**
 * List all collections for a user
 */
export async function listCollections(userId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const collections = await db.collection.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: { notes: true },
      },
    },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    noteCount: collection._count.notes,
    createdAt: collection.createdAt,
  }));
}

/**
 * Create a new collection for a user
 */
export async function createCollection(userId: string, name: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('Collection name is required');
  }

  if (name.length > 255) {
    throw new Error('Collection name must be 255 characters or less');
  }

  // Check for duplicate name
  const existing = await db.collection.findUnique({
    where: {
      userId_name: {
        userId,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    throw new Error(`Collection "${name}" already exists`);
  }

  const collection = await db.collection.create({
    data: {
      userId,
      name: name.trim(),
    },
  });

  return {
    id: collection.id,
    name: collection.name,
    createdAt: collection.createdAt,
  };
}

/**
 * Update a collection (rename)
 */
export async function updateCollection(
  userId: string,
  collectionId: string,
  name: string
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!collectionId) {
    throw new Error('Collection ID is required');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('Collection name is required');
  }

  if (name.length > 255) {
    throw new Error('Collection name must be 255 characters or less');
  }

  // Verify ownership
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error('Collection not found');
  }

  if (collection.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Check for duplicate name (excluding current collection)
  const existing = await db.collection.findFirst({
    where: {
      userId,
      name: name.trim(),
      id: { not: collectionId },
    },
  });

  if (existing) {
    throw new Error(`Collection "${name}" already exists`);
  }

  const updated = await db.collection.update({
    where: { id: collectionId },
    data: { name: name.trim() },
  });

  return {
    id: updated.id,
    name: updated.name,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a collection and cascade delete all notes
 */
export async function deleteCollection(userId: string, collectionId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!collectionId) {
    throw new Error('Collection ID is required');
  }

  // Verify ownership
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error('Collection not found');
  }

  if (collection.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Get note count before deletion
  const noteCount = await db.note.count({
    where: { collectionId },
  });

  // Delete collection and cascade delete notes
  await db.collection.delete({
    where: { id: collectionId },
  });

  return {
    id: collection.id,
    name: collection.name,
    notesDeleted: noteCount,
  };
}

/**
 * Get a single collection with note count
 */
export async function getCollection(userId: string, collectionId: string) {
  if (!userId || !collectionId) {
    throw new Error('User ID and Collection ID are required');
  }

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    include: {
      _count: {
        select: { notes: true },
      },
    },
  });

  if (!collection) {
    throw new Error('Collection not found');
  }

  if (collection.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return {
    id: collection.id,
    name: collection.name,
    noteCount: collection._count.notes,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}
