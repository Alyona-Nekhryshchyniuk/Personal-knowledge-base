'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWebSocket, type WebSocketNotification } from '@/lib/hooks/useWebSocket';
import { toast } from 'sonner';

export type ReviewReminder = WebSocketNotification;

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

  const {
    connected,
    notifications: wsNotifications,
    subscribe,
    connect,
  } = useWebSocket({
    autoConnect: false,
    onNotification: (notification) => {
      if (!toastShownIds.has(notification.id)) {
        setToastShownIds((prev) => new Set(prev).add(notification.id));

        const statusText = notification.overdue
          ? `Overdue by ${notification.daysOverdue} day${notification.daysOverdue > 1 ? 's' : ''}`
          : 'Due today';

        console.log('[Notifications] Showing toast:', notification.title);
        toast.info(`📚 Review: ${notification.title}`, {
          description: `${statusText} in ${notification.collection}`,
          duration: 5000,
        });
      }
    },
  });

  // Update notifications when WebSocket receives them
  useEffect(() => {
    setNotifications(wsNotifications);
  }, [wsNotifications]);

  // Clear on logout
  useEffect(() => {
    if (!session) {
      setNotifications([]);
      setReadIds(new Set());
      setToastShownIds(new Set());
    }
  }, [session]);

  // Connect when session is available
  useEffect(() => {
    if (session?.user?.id) {
      console.log('[Notifications] Session available, connecting WebSocket:', session.user.id);
      connect();
    }
  }, [session?.user?.id, connect]);

  // Subscribe once connected
  useEffect(() => {
    if (session && connected) {
      subscribe();
    }
  }, [session, connected, subscribe]);

  const markAsRead = useCallback((notificationId: string) => {
    setReadIds((prev) => new Set(prev).add(notificationId));
  }, []);

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
