'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getDismissedNotifications } from '@/lib/utils/dismissedNotifications';

export interface WebSocketNotification {
  noteId: string;
  title: string;
  collectionName: string;
  nextReviewDate: string;
  overdue: boolean;
  daysOverdue: number;
}

interface WebSocketMessage {
  type: string;
  payload: any;
}

const BACKOFF_DELAYS = [1000, 5000, 10000, 30000, 60000];
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket() {
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hashNotification = useCallback((notif: WebSocketNotification): string => {
    return `${notif.noteId}-${notif.nextReviewDate}-${notif.overdue}`;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
        seenRef.current.clear();
        wsRef.current = ws;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'review_reminder' && message.payload?.notifications) {
            const dismissed = getDismissedNotifications();
            const newNotifications = message.payload.notifications.filter((notif: WebSocketNotification) => {
              // Filter out dismissed notifications
              if (dismissed.has(notif.noteId)) {
                return false;
              }

              const hash = hashNotification(notif);
              if (seenRef.current.has(hash)) {
                return false;
              }
              seenRef.current.add(hash);
              return true;
            });

            if (newNotifications.length > 0) {
              setNotifications((prev) => {
                // Deduplicate against existing notifications too
                const dedupedHashes = new Set(prev.map(hashNotification));
                const filtered = newNotifications.filter((notif) => !dedupedHashes.has(hashNotification(notif)));
                return [...prev, ...filtered];
              });
            }
          }
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(true);
          const delay = BACKOFF_DELAYS[Math.min(reconnectAttemptsRef.current, BACKOFF_DELAYS.length - 1)];
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connect();
          }, delay);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
          setIsReconnecting(false);
        }
      };
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
    }
  }, [hashNotification]);

  const subscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', payload: {} }));
    }
  }, []);

  const dismissNotification = useCallback((noteId: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.noteId !== noteId));
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    notifications,
    isConnected,
    isReconnecting,
    subscribe,
    dismissNotification,
  };
}
