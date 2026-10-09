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
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const shouldReconnect = useRef(false);
  const seenNotifications = useRef(new Set<string>());

  const callbacks = useRef({
    onNotification,
    onError,
    onConnect,
    onDisconnect,
  });

  // Keep callbacks current without restarting the socket effect.
  useEffect(() => {
    callbacks.current = {
      onNotification,
      onError,
      onConnect,
      onDisconnect,
    };
  }, [onNotification, onError, onConnect, onDisconnect]);

  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] =
    useState<WebSocketNotification[]>([]);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const getWebSocketUrl = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const protocol =
      window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    return `${protocol}//${window.location.host}/api/ws`;
  }, []);

  const handleNotification = useCallback(
    (notification: WebSocketNotification) => {
      if (!notification?.id) {
        console.warn('[WS] Ignoring notification without an ID');
        return;
      }

      if (seenNotifications.current.has(notification.id)) return;

      seenNotifications.current.add(notification.id);
      setNotifications((prev) => [...prev, notification]);
      callbacks.current.onNotification?.(notification);

      const socket = ws.current;

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'ack',
            notificationId: notification.id,
          })
        );
      }
    },
    []
  );

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    const current = ws.current;

    // Do not create competing connections.
    if (
      current &&
      (current.readyState === WebSocket.CONNECTING ||
        current.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    const url = getWebSocketUrl();

    if (!url) {
      setLastError('Unable to determine WebSocket URL');
      return;
    }

    console.log('[WS] Connecting to', url);

    let socket: WebSocket;

    try {
      socket = new WebSocket(url);
      ws.current = socket;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection failed';

      console.error('[WS] Connection construction failed:', message);
      setLastError(message);
      callbacks.current.onError?.(message);
      return;
    }

    socket.onopen = () => {
      if (ws.current !== socket) return;

      console.log('[WS] Connected to', url);
      setConnected(true);
      setReconnectCount(0);
      reconnectCountRef.current = 0;
      setLastError(null);
      callbacks.current.onConnect?.();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'notification_batch':
            if (Array.isArray(message.notifications)) {
              message.notifications.forEach(handleNotification);
            }
            break;

          case 'ack_ok':
            console.log(
              '[WS] Notification acknowledged:',
              message.notificationId
            );
            break;

          case 'error':
            console.error('[WS] Server error:', message.message);
            setLastError(message.message);
            callbacks.current.onError?.(message.message);
            break;

          default:
            console.warn('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    };

    socket.onerror = () => {
      // Browsers generally don't expose the underlying failure reason.
      console.error('[WS] Connection error');
      setLastError('WebSocket connection error');
      callbacks.current.onError?.('WebSocket connection error');
    };

    socket.onclose = (event) => {
      console.log('[WS] Closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      if (ws.current === socket) {
        ws.current = null;
        setConnected(false);
      }

      callbacks.current.onDisconnect?.();

      // Manual disconnect or React cleanup must not reconnect.
      if (!shouldReconnect.current) return;

      if (reconnectCountRef.current < reconnectAttempts) {
        const attempt = reconnectCountRef.current + 1;
        reconnectCountRef.current = attempt;
        setReconnectCount(attempt);

        const delay = reconnectDelay * Math.pow(2, attempt - 1);

        console.log(
          `[WS] Reconnecting in ${delay}ms (attempt ${attempt}/${reconnectAttempts})`
        );

        reconnectTimeout.current = setTimeout(() => {
          reconnectTimeout.current = null;
          if (shouldReconnect.current) connect();
        }, delay);
      } else {
        console.error('[WS] Max reconnection attempts reached');
        setLastError('Connection lost - max reconnection attempts reached');
      }
    };
  }, [getWebSocketUrl, handleNotification, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    const socket = ws.current;
    ws.current = null;

    if (socket) {
      // Prevent intentional closure from triggering reconnect logic.
      socket.onclose = null;
      socket.close(1000, 'Client disconnected');
    }

    setConnected(false);
    setNotifications([]);
    seenNotifications.current.clear();
  }, []);

  const manualConnect = useCallback(() => {
    shouldReconnect.current = true;
    reconnectCountRef.current = 0;
    setReconnectCount(0);
    connect();
  }, [connect]);

  const subscribe = useCallback(() => {
    const socket = ws.current;

    if (socket?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending subscribe message');

      socket.send(
        JSON.stringify({
          type: 'subscribe',
          interval: 30000,
        })
      );
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    seenNotifications.current.clear();
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      const socket = ws.current;
      ws.current = null;

      if (socket) {
        socket.onclose = null;
        socket.close(1000, 'Effect cleanup');
      }

      setConnected(false);
    };
  }, [autoConnect, connect]);

  return {
    connected,
    notifications,
    reconnectCount,
    lastError,
    connect: manualConnect,
    disconnect,
    subscribe,
    clearNotifications,
  };
}
