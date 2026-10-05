import { db } from '@/lib/db';

/**
 * Search notes with full-text capabilities
 */
export async function searchNotes(
  userId: string,
  query: string,
  options?: {
    collectionId?: string;
    tagIds?: string[];
    status?: 'Active' | 'Archived';
    skip?: number;
    take?: number;
  }
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!query || query.trim().length === 0) {
    throw new Error('Search query is required');
  }

  const searchTerm = `%${query.trim()}%`;

  const where: any = {
    userId,
    status: options?.status || 'Active',
    OR: [
      { title: { contains: query.trim(), mode: 'insensitive' } },
      { content: { contains: query.trim(), mode: 'insensitive' } },
      { sourceUrl: { contains: query.trim(), mode: 'insensitive' } },
    ],
  };

  if (options?.collectionId) {
    where.collectionId = options.collectionId;
  }

  const notes = await db.note.findMany({
    where,
    skip: options?.skip || 0,
    take: Math.min(options?.take || 20, 100),
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
    orderBy: [
      // Prioritize exact matches in title
      { title: 'asc' },
      { updatedAt: 'desc' },
    ],
  });

  // Filter by tags if provided (AND logic)
  let filtered = notes;
  if (options?.tagIds && options.tagIds.length > 0) {
    filtered = notes.filter((note) => {
      const noteTags = note.tags.map((nt) => nt.tag.id);
      return options.tagIds!.every((tagId) => noteTags.includes(tagId));
    });
  }

  // Calculate relevance score for each result
  const scored = filtered.map((note) => {
    let score = 0;

    const queryLower = query.trim().toLowerCase();
    const titleLower = note.title.toLowerCase();
    const contentLower = note.content.toLowerCase();

    // Exact matches score highest
    if (titleLower === queryLower) score += 100;
    // Title contains scores high
    else if (titleLower.includes(queryLower)) score += 50;
    // Content contains scores medium
    if (contentLower.includes(queryLower)) score += 25;
    // URL contains scores lower
    if (note.sourceUrl?.toLowerCase().includes(queryLower)) score += 10;

    // Recent notes score slightly higher
    const daysSinceUpdate = Math.floor(
      (Date.now() - note.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate < 7) score += 5;

    return { ...note, relevanceScore: score };
  });

  // Sort by relevance
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored.map((note) => ({
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
    relevanceScore: note.relevanceScore,
  }));
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSearchSuggestions(userId: string, prefix: string, limit: number = 10) {
  if (!userId || !prefix || prefix.trim().length < 2) {
    return [];
  }

  const searchPrefix = `%${prefix.trim()}%`;

  const [titleMatches, contentMatches] = await Promise.all([
    db.note.findMany({
      where: {
        userId,
        status: 'Active',
        title: { contains: prefix.trim(), mode: 'insensitive' },
      },
      select: { title: true },
      distinct: ['title'],
      take: limit,
      orderBy: { title: 'asc' },
    }),
    db.note.findMany({
      where: {
        userId,
        status: 'Active',
        content: { contains: prefix.trim(), mode: 'insensitive' },
      },
      select: { content: true },
      distinct: ['content'],
      take: limit,
      orderBy: { content: 'asc' },
    }),
  ]);

  const suggestions = [
    ...titleMatches.map((m) => ({
      type: 'title' as const,
      value: m.title,
    })),
    ...contentMatches
      .map((m) => ({
        type: 'content' as const,
        value: m.content.substring(0, 100),
      }))
      .filter((item, index, self) => self.findIndex((i) => i.value === item.value) === index),
  ].slice(0, limit);

  return suggestions;
}

/**
 * Advanced search with filters
 */
export async function advancedSearch(
  userId: string,
  options: {
    query?: string;
    collectionId?: string;
    tagIds?: string[];
    status?: 'Active' | 'Archived';
    reviewState?: 'due' | 'overdue' | 'next7days' | 'none';
    startDate?: Date;
    endDate?: Date;
    hasUrl?: boolean;
    skip?: number;
    take?: number;
  }
) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const where: any = { userId };

  // Apply status filter
  if (options.status) {
    where.status = options.status;
  }

  // Apply query search
  if (options.query?.trim()) {
    where.OR = [
      { title: { contains: options.query.trim(), mode: 'insensitive' } },
      { content: { contains: options.query.trim(), mode: 'insensitive' } },
      { sourceUrl: { contains: options.query.trim(), mode: 'insensitive' } },
    ];
  }

  // Apply collection filter
  if (options.collectionId) {
    where.collectionId = options.collectionId;
  }

  // Apply date range filter
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  // Apply URL filter
  if (options.hasUrl !== undefined) {
    if (options.hasUrl) {
      where.sourceUrl = { not: null };
    } else {
      where.sourceUrl = null;
    }
  }

  let notes = await db.note.findMany({
    where,
    skip: options.skip || 0,
    take: Math.min(options.take || 20, 100),
    include: {
      collection: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Filter by tags if provided (AND logic)
  if (options.tagIds && options.tagIds.length > 0) {
    notes = notes.filter((note) => {
      const noteTags = note.tags.map((nt) => nt.tag.id);
      return options.tagIds!.every((tagId) => noteTags.includes(tagId));
    });
  }

  // Filter by review state if provided
  if (options.reviewState) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    notes = notes.filter((note) => {
      if (!note.nextReviewDate) {
        return options.reviewState === 'none';
      }

      const nextReview = new Date(note.nextReviewDate);

      switch (options.reviewState) {
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
