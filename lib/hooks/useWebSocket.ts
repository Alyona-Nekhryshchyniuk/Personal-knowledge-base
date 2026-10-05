'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketNotification {
  id: string;
  noteId: string;
  title: string;
  collection: string;
  nextReviewDate: string;
  overdue: boolean;
  daysOverdue: number;
  dueToday: boolean;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onNotification?: (notification: WebSocketNotification) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    onNotification,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const seenNotifications = useRef(new Set<string>());
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/ws`;
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') {
      console.log('[WS] Cannot connect - server side');
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    try {
      const url = getWebSocketUrl();
      console.log('[WS] Connecting to', url);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        setConnected(true);
        setReconnectCount(0);
        setLastError(null);
        onConnect?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'notification_batch':
              if (message.notifications && Array.isArray(message.notifications)) {
                for (const notification of message.notifications) {
                  handleNotification(notification);
                }
              }
              break;

            case 'ack_ok':
              console.log('[WS] Notification acknowledged:', message.notificationId);
              break;

            case 'error':
              console.error('[WS] Server error:', message.message);
              setLastError(message.message);
              onError?.(message.message);
              break;

            default:
              console.warn('[WS] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[WS] Error parsing message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        const errorMessage = 'WebSocket connection error';
        setLastError(errorMessage);
        onError?.(errorMessage);
      };

      ws.current.onclose = () => {
        console.log('[WS] Disconnected');
        setConnected(false);
        onDisconnect?.();

        if (reconnectCount < reconnectAttempts) {
          console.log(
            `[WS] Reconnecting... (attempt ${reconnectCount + 1}/${reconnectAttempts})`
          );
          reconnectTimeout.current = setTimeout(() => {
            setReconnectCount((prev) => prev + 1);
            connect();
          }, reconnectDelay);
        } else {
          console.log('[WS] Max reconnection attempts reached');
          setLastError('Connection lost - max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setLastError(errorMessage);
      onError?.(errorMessage);
    }
  }, [
    getWebSocketUrl,
    reconnectCount,
    reconnectAttempts,
    reconnectDelay,
    onConnect,
    onDisconnect,
    onError,
  ]);

  const handleNotification = useCallback(
    (notification: WebSocketNotification) => {
      const notificationId = notification.id;

      if (seenNotifications.current.has(notificationId)) {
        return;
      }

      seenNotifications.current.add(notificationId);
      setNotifications((prev) => [...prev, notification]);
      onNotification?.(notification);

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'ack',
            notificationId,
          })
        );
      }
    },
    [onNotification]
  );

  const subscribe = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending subscribe message');
      ws.current.send(
        JSON.stringify({
          type: 'subscribe',
          intervalMs: 30000,
        })
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    setConnected(false);
    setNotifications([]);
    seenNotifications.current.clear();
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    seenNotifications.current.clear();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (autoConnect) {
      connect();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setConnected(false);
    };
  }, [autoConnect, connect]);

  return {
    connected,
    notifications,
    lastError,
    connect,
    disconnect,
    subscribe,
    clearNotifications,
  };
}
