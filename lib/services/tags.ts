import { db } from '@/lib/db';

/**
 * List all tags for a user
 */
export async function listTags(userId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const tags = await db.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: { notes: true },
      },
    },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    noteCount: tag._count.notes,
    createdAt: tag.createdAt,
  }));
}

/**
 * Create a new tag for a user
 */
export async function createTag(userId: string, name: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('Tag name is required');
  }

  if (name.length > 100) {
    throw new Error('Tag name must be 100 characters or less');
  }

  // Check for duplicate name
  const existing = await db.tag.findUnique({
    where: {
      userId_name: {
        userId,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    throw new Error(`Tag "${name}" already exists`);
  }

  const tag = await db.tag.create({
    data: {
      userId,
      name: name.trim(),
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
  };
}

/**
 * Update a tag (rename)
 */
export async function updateTag(userId: string, tagId: string, name: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!tagId) {
    throw new Error('Tag ID is required');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('Tag name is required');
  }

  if (name.length > 100) {
    throw new Error('Tag name must be 100 characters or less');
  }

  // Verify ownership
  const tag = await db.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Check for duplicate name (excluding current tag)
  const existing = await db.tag.findFirst({
    where: {
      userId,
      name: name.trim(),
      id: { not: tagId },
    },
  });

  if (existing) {
    throw new Error(`Tag "${name}" already exists`);
  }

  const updated = await db.tag.update({
    where: { id: tagId },
    data: { name: name.trim() },
  });

  return {
    id: updated.id,
    name: updated.name,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a tag (removes from notes but doesn't delete notes)
 */
export async function deleteTag(userId: string, tagId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!tagId) {
    throw new Error('Tag ID is required');
  }

  // Verify ownership
  const tag = await db.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Get note count before deletion
  const noteCount = await db.noteTag.count({
    where: { tagId },
  });

  // Delete tag (cascade delete on NoteTag via schema)
  await db.tag.delete({
    where: { id: tagId },
  });

  return {
    id: tag.id,
    name: tag.name,
    notesModified: noteCount,
  };
}

/**
 * Get a single tag with note count
 */
export async function getTag(userId: string, tagId: string) {
  if (!userId || !tagId) {
    throw new Error('User ID and Tag ID are required');
  }

  const tag = await db.tag.findUnique({
    where: { id: tagId },
    include: {
      _count: {
        select: { notes: true },
      },
    },
  });

  if (!tag) {
    throw new Error('Tag not found');
  }

  if (tag.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return {
    id: tag.id,
    name: tag.name,
    noteCount: tag._count.notes,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
}
