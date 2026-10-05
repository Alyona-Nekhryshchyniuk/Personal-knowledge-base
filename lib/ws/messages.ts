import { z } from 'zod';

export const reviewReminderSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  title: z.string(),
  collection: z.string(),
  nextReviewDate: z.string(),
  overdue: z.boolean(),
  daysOverdue: z.number(),
  dueToday: z.boolean(),
});

export const notificationBatchSchema = z.object({
  type: z.literal('notification_batch'),
  notifications: z.array(reviewReminderSchema),
  generatedAt: z.string(),
});

export const subscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  interval: z.number().min(5000).max(600000).optional().default(30000),
});

export const ackMessageSchema = z.object({
  type: z.literal('ack'),
  notificationId: z.string(),
});

export const ackOkMessageSchema = z.object({
  type: z.literal('ack_ok'),
  notificationId: z.string(),
});

export const errorMessageSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  subscribeMessageSchema,
  ackMessageSchema,
]);

export type ReviewReminder = z.infer<typeof reviewReminderSchema>;
export type NotificationBatch = z.infer<typeof notificationBatchSchema>;
export type SubscribeMessage = z.infer<typeof subscribeMessageSchema>;
export type AckMessage = z.infer<typeof ackMessageSchema>;
export type AckOkMessage = z.infer<typeof ackOkMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;
