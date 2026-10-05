import { db } from '@/lib/db';
import { calculateNextReviewDate, getTodayUTC } from '@/lib/dates';
import { ReviewInterval } from '@/lib/validation';

export interface CreateNoteInput {
  title: string;
  content: string;
  collectionId: string;
  sourceUrl?: string;
  reviewInterval?: ReviewInterval;
  customDays?: number;
  tagIds?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  sourceUrl?: string;
  collectionId?: string;
  reviewInterval?: ReviewInterval;
  customDays?: number;
}

export interface NoteFilters {
  collectionId?: string;
  tagIds?: string[];
  status?: 'Active' | 'Archived';
  reviewState?: 'due' | 'overdue' | 'next7days' | 'none';
  search?: string;
}

/**
 * List notes for a user with filtering and pagination
 */
export async function listNotes(
  userId: string,
  filters?: NoteFilters,
  skip: number = 0,
  take: number = 20
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const where: any = { userId };

  if (filters?.collectionId) {
    where.collectionId = filters.collectionId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } },
      { sourceUrl: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  let notes = await db.note.findMany({
    where,
    skip,
    take,
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Filter by tags if provided
  if (filters?.tagIds && filters.tagIds.length > 0) {
    notes = notes.filter((note) => {
      const noteTags = note.tags.map((nt) => nt.tag.id);
      return filters.tagIds!.every((tagId) => noteTags.includes(tagId));
    });
  }

  // Filter by review state if provided
  if (filters?.reviewState) {
    const today = getTodayUTC();
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    notes = notes.filter((note) => {
      if (!note.nextReviewDate) {
        return filters.reviewState === 'none';
      }

      const nextReview = new Date(note.nextReviewDate);

      switch (filters.reviewState) {
        case 'due':
          return nextReview.getTime() <= today.getTime() && note.status === 'Active';
        case 'overdue':
          return nextReview.getTime() < today.getTime() && note.status === 'Active';
        case 'next7days':
          return (
            (nextReview.getTime() >= today.getTime() &&
              nextReview.getTime() <= in7Days.getTime()) ||
            (nextReview.getTime() < today.getTime() && note.status === 'Active')
          );
        case 'none':
          return !note.nextReviewDate;
        default:
          return true;
      }
    });
  }

  return notes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    collection: note.collection,
    tags: note.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: note.sourceUrl,
    status: note.status,
    reviewInterval: note.reviewInterval,
    customDays: note.customDays,
    nextReviewDate: note.nextReviewDate,
    lastReviewedDate: note.lastReviewedDate,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }));
}

/**
 * Create a new note
 */
export async function createNote(userId: string, input: CreateNoteInput) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Note title is required');
  }

  if (!input.content || input.content.trim().length === 0) {
    throw new Error('Note content is required');
  }

  if (!input.collectionId) {
    throw new Error('Collection ID is required');
  }

  // Verify collection ownership
  const collection = await db.collection.findUnique({
    where: { id: input.collectionId },
  });

  if (!collection || collection.userId !== userId) {
    throw new Error('Collection not found or not owned by user');
  }

  // Validate tags ownership
  if (input.tagIds && input.tagIds.length > 0) {
    const tags = await db.tag.findMany({
      where: { id: { in: input.tagIds }, userId },
    });

    if (tags.length !== input.tagIds.length) {
      throw new Error('Some tags not found or not owned by user');
    }
  }

  const reviewInterval = input.reviewInterval || 'none';
  const nextReviewDate = calculateNextReviewDate(reviewInterval as ReviewInterval, input.customDays);

  const note = await db.note.create({
    data: {
      userId,
      collectionId: input.collectionId,
      title: input.title.trim(),
      content: input.content.trim(),
      sourceUrl: input.sourceUrl?.trim(),
      reviewInterval,
      customDays: input.customDays,
      nextReviewDate,
      tags: input.tagIds && input.tagIds.length > 0 ? {
        create: input.tagIds.map((tagId) => ({
          tagId,
        })),
      } : undefined,
    },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    collection: note.collection,
    tags: note.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: note.sourceUrl,
    status: note.status,
    reviewInterval: note.reviewInterval,
    customDays: note.customDays,
    nextReviewDate: note.nextReviewDate,
    lastReviewedDate: note.lastReviewedDate,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Get a single note by ID
 */
export async function getNote(userId: string, noteId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    collection: note.collection,
    tags: note.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: note.sourceUrl,
    status: note.status,
    reviewInterval: note.reviewInterval,
    customDays: note.customDays,
    nextReviewDate: note.nextReviewDate,
    lastReviewedDate: note.lastReviewedDate,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/**
 * Update a note
 */
export async function updateNote(userId: string, noteId: string, input: UpdateNoteInput) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  if (input.collectionId && input.collectionId !== note.collectionId) {
    const collection = await db.collection.findUnique({
      where: { id: input.collectionId },
    });

    if (!collection || collection.userId !== userId) {
      throw new Error('Collection not found or not owned by user');
    }
  }

  const reviewInterval = input.reviewInterval || note.reviewInterval;
  let nextReviewDate = note.nextReviewDate;

  if (input.reviewInterval !== undefined || input.customDays !== undefined) {
    nextReviewDate = calculateNextReviewDate(
      reviewInterval as ReviewInterval,
      input.customDays || note.customDays
    );
  }

  const updated = await db.note.update({
    where: { id: noteId },
    data: {
      title: input.title?.trim() || note.title,
      content: input.content?.trim() || note.content,
      sourceUrl: input.sourceUrl !== undefined ? input.sourceUrl?.trim() : note.sourceUrl,
      collectionId: input.collectionId || note.collectionId,
      reviewInterval,
      customDays: input.customDays !== undefined ? input.customDays : note.customDays,
      nextReviewDate,
    },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    collection: updated.collection,
    tags: updated.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: updated.sourceUrl,
    status: updated.status,
    reviewInterval: updated.reviewInterval,
    customDays: updated.customDays,
    nextReviewDate: updated.nextReviewDate,
    lastReviewedDate: updated.lastReviewedDate,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

/**
 * Delete a note
 */
export async function deleteNote(userId: string, noteId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  await db.note.delete({
    where: { id: noteId },
  });

  return { id: noteId };
}

/**
 * Archive a note
 */
export async function archiveNote(userId: string, noteId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  const archived = await db.note.update({
    where: { id: noteId },
    data: { status: 'Archived' },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: archived.id,
    title: archived.title,
    content: archived.content,
    collection: archived.collection,
    tags: archived.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: archived.sourceUrl,
    status: archived.status,
    reviewInterval: archived.reviewInterval,
    customDays: archived.customDays,
    nextReviewDate: archived.nextReviewDate,
    lastReviewedDate: archived.lastReviewedDate,
    createdAt: archived.createdAt,
    updatedAt: archived.updatedAt,
  };
}

/**
 * Restore a note from archive
 */
export async function restoreNote(userId: string, noteId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  const restored = await db.note.update({
    where: { id: noteId },
    data: { status: 'Active' },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: restored.id,
    title: restored.title,
    content: restored.content,
    collection: restored.collection,
    tags: restored.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: restored.sourceUrl,
    status: restored.status,
    reviewInterval: restored.reviewInterval,
    customDays: restored.customDays,
    nextReviewDate: restored.nextReviewDate,
    lastReviewedDate: restored.lastReviewedDate,
    createdAt: restored.createdAt,
    updatedAt: restored.updatedAt,
  };
}

/**
 * Mark a note as reviewed
 */
export async function markAsReviewed(userId: string, noteId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  const today = getTodayUTC();
  const nextReviewDate = calculateNextReviewDate(
    note.reviewInterval as ReviewInterval,
    note.customDays
  );

  const reviewed = await db.note.update({
    where: { id: noteId },
    data: {
      lastReviewedDate: today,
      nextReviewDate,
    },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: reviewed.id,
    title: reviewed.title,
    content: reviewed.content,
    collection: reviewed.collection,
    tags: reviewed.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: reviewed.sourceUrl,
    status: reviewed.status,
    reviewInterval: reviewed.reviewInterval,
    customDays: reviewed.customDays,
    nextReviewDate: reviewed.nextReviewDate,
    lastReviewedDate: reviewed.lastReviewedDate,
    createdAt: reviewed.createdAt,
    updatedAt: reviewed.updatedAt,
  };
}

/**
 * Move a note to a different collection
 */
export async function moveNote(userId: string, noteId: string, collectionId: string) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!noteId) {
    throw new Error('Note ID is required');
  }

  if (!collectionId) {
    throw new Error('Collection ID is required');
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
  });

  if (!note || note.userId !== userId) {
    throw new Error('Note not found or not owned by user');
  }

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection || collection.userId !== userId) {
    throw new Error('Collection not found or not owned by user');
  }

  const moved = await db.note.update({
    where: { id: noteId },
    data: { collectionId },
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  return {
    id: moved.id,
    title: moved.title,
    content: moved.content,
    collection: moved.collection,
    tags: moved.tags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    sourceUrl: moved.sourceUrl,
    status: moved.status,
    reviewInterval: moved.reviewInterval,
    customDays: moved.customDays,
    nextReviewDate: moved.nextReviewDate,
    lastReviewedDate: moved.lastReviewedDate,
    createdAt: moved.createdAt,
    updatedAt: moved.updatedAt,
  };
}
