import { WebSocket } from 'ws';

interface WSConnection extends WebSocket {
  data?: {
    userId: string;
    notifiedIds: Set<string>;
    lastSentAt: number;
    intervalMs: number;
  };
}

const connectionRegistry = new Map<string, Set<WSConnection>>();

export function registerConnection(ws: WSConnection, userId: string) {
  ws.data = {
    userId,
    notifiedIds: new Set(),
    lastSentAt: 0,
    intervalMs: 30000,
  };

  if (!connectionRegistry.has(userId)) {
    connectionRegistry.set(userId, new Set());
  }
  connectionRegistry.get(userId)!.add(ws);
}

export function unregisterConnection(ws: WSConnection) {
  if (!ws.data) return;

  const { userId } = ws.data;
  const connections = connectionRegistry.get(userId);

  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      connectionRegistry.delete(userId);
    }
  }
}

export function getConnectedUserIds(): string[] {
  return Array.from(connectionRegistry.keys());
}

export function getUserConnections(userId: string): WSConnection[] {
  const connections = connectionRegistry.get(userId);
  return connections ? Array.from(connections) : [];
}

export function broadcastToUser(userId: string, message: any) {
  const connections = connectionRegistry.get(userId);
  if (!connections) return;

  const payload = JSON.stringify(message);
  connections.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  });
}
