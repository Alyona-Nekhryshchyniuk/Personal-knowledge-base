'use client';

import { ReactNode, createContext, useContext } from 'react';
import { useWebSocket, WebSocketNotification } from '@/lib/hooks/useWebSocket';

interface NotificationContextType {
  notifications: WebSocketNotification[];
  isConnected: boolean;
  isReconnecting: boolean;
  subscribe: () => void;
  dismissNotification: (noteId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { notifications, isConnected, isReconnecting, subscribe, dismissNotification } = useWebSocket();

  return (
    <NotificationContext.Provider value={{ notifications, isConnected, isReconnecting, subscribe, dismissNotification }}>
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
