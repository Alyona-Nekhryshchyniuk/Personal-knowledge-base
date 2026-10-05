"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWebSocket(url: string | null, onMessage: (data: any) => void, onFailureThreshold?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(1000);
  const failureCountRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const onFailureThresholdRef = useRef(onFailureThreshold);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onFailureThresholdRef.current = onFailureThreshold;
  }, [onFailureThreshold]);

  const connect = useCallback(() => {
    if (typeof window === "undefined" || !url) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS] Connected to", wsUrl);
        backoffRef.current = 1000;
        failureCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current(data);
        } catch (error) {
          console.error("[WS] Failed to parse message", error);
        }
      };

      ws.onerror = (event) => {
        console.error("[WS] Error:", event);
      };

      ws.onclose = () => {
        failureCountRef.current++;
        console.warn(`[WS] Disconnected (attempt ${failureCountRef.current})`);
        if (failureCountRef.current >= 3 && onFailureThresholdRef.current) {
          console.error("[WS] Max reconnection attempts reached");
          onFailureThresholdRef.current();
          return;
        }
        const nextBackoff = Math.min(backoffRef.current * 2, 30000);
        backoffRef.current = nextBackoff;
        console.log(`[WS] Reconnecting in ${nextBackoff}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, nextBackoff);
      };

      wsRef.current = ws;
    } catch (error) {
      failureCountRef.current++;
      console.error("[WS] Connection error:", error);
      if (failureCountRef.current >= 3 && onFailureThresholdRef.current) {
        onFailureThresholdRef.current();
        return;
      }
      const nextBackoff = Math.min(backoffRef.current * 2, 30000);
      backoffRef.current = nextBackoff;
      reconnectTimeoutRef.current = setTimeout(connect, nextBackoff);
    }
  }, [url]);

  useEffect(() => {
    if (!url) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect, url]);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { send };
}
