'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';

export interface ReviewReminder {
  id: string;
  noteId: string;
  title: string;
  collection: string;
  nextReviewDate: string;
  overdue: boolean;
  daysOverdue: number;
  dueToday: boolean;
}

interface NotificationContextType {
  notifications: ReviewReminder[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  clearNotification: (notificationId: string) => void;
  clearAll: () => void;
  dismiss: (notificationId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<ReviewReminder[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [toastShownIds, setToastShownIds] = useState<Set<string>>(new Set());

  const handleConnectionFailure = useCallback(() => {
    console.warn('[WS] Disconnected after multiple failures');
  }, []);

  const handleMessage = useCallback((data: any) => {
    if (data.type === 'notification_batch') {
      const newReminders = data.notifications || [];

      // Show toast for newly received notifications
      for (const reminder of newReminders) {
        if (!toastShownIds.has(reminder.id)) {
          setToastShownIds((prev) => new Set(prev).add(reminder.id));

          const statusText = reminder.overdue
            ? `Overdue by ${reminder.daysOverdue} day${reminder.daysOverdue > 1 ? 's' : ''}`
            : 'Due today';

          toast.info(`📚 Review: ${reminder.title}`, {
            description: `${statusText} in ${reminder.collection}`,
            duration: 5000,
          });
        }
      }

      setNotifications(newReminders);
    }
  }, [toastShownIds]);

  const { send } = useWebSocket(
    session ? '/api/ws' : null,
    handleMessage,
    session ? handleConnectionFailure : undefined
  );

  // Clear on logout
  useEffect(() => {
    if (!session) {
      setNotifications([]);
      setReadIds(new Set());
      setToastShownIds(new Set());
    }
  }, [session]);

  // Subscribe on login
  useEffect(() => {
    if (session) {
      send({ type: 'subscribe', interval: 30000 });
    }
  }, [send, session]);

  const markAsRead = useCallback((notificationId: string) => {
    setReadIds((prev) => new Set(prev).add(notificationId));
    send({ type: 'ack', notificationId });
  }, [send]);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setReadIds(new Set());
  }, []);

  const dismiss = useCallback((notificationId: string) => {
    clearNotification(notificationId);
    markAsRead(notificationId);
  }, [clearNotification, markAsRead]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearNotification,
        clearAll,
        dismiss,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
