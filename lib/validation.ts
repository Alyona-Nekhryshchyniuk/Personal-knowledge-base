import { z } from 'zod';

// Auth Schemas
export const providerSchema = z.enum(['google', 'github']);

// Collection Schemas
export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255),
});

// Tag Schemas
export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// Note Schemas
export const reviewIntervalSchema = z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']);

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters'),
  content: z.string().min(1, 'Content is required'),
  collectionId: z.string().cuid(),
  tags: z.array(z.string().cuid()).default([]),
  sourceUrl: z.string().url('Source URL must be a valid URL').optional().or(z.literal('')),
  reviewInterval: reviewIntervalSchema.default('none'),
  customDays: z.number().int('Custom days must be an integer').positive('Custom days must be greater than 0').optional(),
}).refine(
  (data) => data.reviewInterval !== 'custom' || (data.customDays && data.customDays > 0),
  { message: 'Custom days must be greater than 0 when review interval is custom', path: ['customDays'] }
);

export const updateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  collectionId: z.string().cuid().optional(),
  tags: z.array(z.string().cuid()).optional(),
  sourceUrl: z.string().url('Source URL must be a valid URL').optional().or(z.literal('')),
  reviewInterval: reviewIntervalSchema.optional(),
  customDays: z.number().int('Custom days must be an integer').positive('Custom days must be greater than 0').optional(),
}).refine(
  (data) => data.reviewInterval !== 'custom' || (data.customDays && data.customDays > 0),
  { message: 'Custom days must be greater than 0 when review interval is custom', path: ['customDays'] }
);

export const moveNoteSchema = z.object({
  collectionId: z.string().cuid(),
});

// Search/Filter Schemas
export const notesFilterSchema = z.object({
  search: z.string().optional(),
  collection: z.string().cuid().optional(),
  tags: z.string().optional(), // comma-separated tag IDs
  status: z.enum(['active', 'archived']).optional(),
  reviewState: z.enum(['due', 'overdue', 'next7days', 'none']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// Type exports
export type Provider = z.infer<typeof providerSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type MoveNoteInput = z.infer<typeof moveNoteSchema>;
export type NotesFilter = z.infer<typeof notesFilterSchema>;
export type ReviewInterval = z.infer<typeof reviewIntervalSchema>;
