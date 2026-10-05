import { WebSocket } from 'ws';
import { registerConnection, unregisterConnection } from './connectionManager.ts';
import { getDueNotifications } from '../services/notifications.ts';
import { clientMessageSchema } from './messages.ts';

export async function attachConnectionHandlers(ws: WebSocket, userId: string) {
  registerConnection(ws as any, userId);

  const notifications = await getDueNotifications(userId);
  if (notifications.length > 0) {
    const wsData = (ws as any).data;
    notifications.forEach((ntf) => wsData.notifiedIds.add(ntf.id));

    ws.send(
      JSON.stringify({
        type: 'notification_batch',
        notifications,
        generatedAt: new Date().toISOString(),
      })
    );
    wsData.lastSentAt = Date.now();
  }

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const result = clientMessageSchema.safeParse(message);

      if (!result.success) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        return;
      }

      if (result.data.type === 'subscribe') {
        const wsData = (ws as any).data;
        if (wsData) {
          wsData.intervalMs = result.data.interval;
        }

        const fresh = await getDueNotifications(userId);
        fresh.forEach((ntf) => wsData.notifiedIds.add(ntf.id));

        ws.send(
          JSON.stringify({
            type: 'notification_batch',
            notifications: fresh,
            generatedAt: new Date().toISOString(),
          })
        );
        wsData.lastSentAt = Date.now();
      } else if (result.data.type === 'ack') {
        ws.send(
          JSON.stringify({
            type: 'ack_ok',
            notificationId: result.data.notificationId,
          })
        );
      }
    } catch (error) {
      console.error('[WS] Message handling error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }
  });

  ws.on('close', () => {
    unregisterConnection(ws as any);
  });
}
