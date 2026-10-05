import { Session } from 'next-auth';
import { db } from '@/lib/db';

/**
 * Authorization utility functions for verifying user permissions
 */

export async function verifyUserOwnsCollection(
  userId: string,
  collectionId: string
): Promise<boolean> {
  if (!userId || !collectionId) {
    return false;
  }

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { userId: true },
  });

  return collection?.userId === userId;
}

export async function verifyUserOwnsNote(
  userId: string,
  noteId: string
): Promise<boolean> {
  if (!userId || !noteId) {
    return false;
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { userId: true },
  });

  return note?.userId === userId;
}

export async function verifyUserOwnsTag(
  userId: string,
  tagId: string
): Promise<boolean> {
  if (!userId || !tagId) {
    return false;
  }

  const tag = await db.tag.findUnique({
    where: { id: tagId },
    select: { userId: true },
  });

  return tag?.userId === userId;
}

export function verifySession(session: Session | null): session is Session {
  return !!session?.user?.id;
}

export function getUserId(session: Session | null): string | null {
  return session?.user?.id || null;
}

export async function verifyUserOwnsNoteWithCollection(
  userId: string,
  noteId: string,
  collectionId: string
): Promise<boolean> {
  if (!userId || !noteId || !collectionId) {
    return false;
  }

  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { userId: true, collectionId: true },
  });

  return note?.userId === userId && note?.collectionId === collectionId;
}

/**
 * Verify user can perform bulk operations
 */
export async function verifyUserCanBulkOperateNotes(
  userId: string,
  noteIds: string[]
): Promise<boolean> {
  if (!userId || noteIds.length === 0) {
    return false;
  }

  const notes = await db.note.findMany({
    where: { id: { in: noteIds } },
    select: { userId: true },
  });

  return notes.every((note) => note.userId === userId);
}

/**
 * Verify user can modify note with specific tags
 */
export async function verifyUserCanAssignTags(
  userId: string,
  tagIds: string[]
): Promise<boolean> {
  if (!userId || tagIds.length === 0) {
    return true; // Empty tag list is valid
  }

  const tags = await db.tag.findMany({
    where: { id: { in: tagIds } },
    select: { userId: true },
  });

  return tags.every((tag) => tag.userId === userId);
}

/**
 * Rate limit check for user (returned from middleware/rate-limiter)
 */
export function checkUserRateLimit(
  userId: string,
  endpoint: string,
  checkFn: (userId: string, endpoint: string) => { allowed: boolean; remaining: number }
): { allowed: boolean; remaining: number } {
  return checkFn(userId, endpoint);
}
