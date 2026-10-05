import { getConnectedUserIds, getUserConnections } from './connectionManager.ts';
import { getDueNotifications } from '../services/notifications.ts';

let schedulerInterval: NodeJS.Timeout | null = null;

async function tick() {
  const userIds = getConnectedUserIds();

  for (const userId of userIds) {
    const notifications = await getDueNotifications(userId);
    const connections = getUserConnections(userId);

    for (const ws of connections) {
      if (!ws.data) continue;

      const now = Date.now();
      const timeSinceLastSent = now - ws.data.lastSentAt;

      if (timeSinceLastSent < ws.data.intervalMs) {
        continue;
      }

      const filtered = notifications.filter(
        (ntf) => !ws.data?.notifiedIds.has(ntf.id)
      );

      if (filtered.length > 0) {
        filtered.forEach((ntf) => ws.data!.notifiedIds.add(ntf.id));

        const batch = {
          type: 'notification_batch' as const,
          notifications: filtered,
          generatedAt: new Date().toISOString(),
        };

        try {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify(batch));
            ws.data.lastSentAt = now;
          }
        } catch (error) {
          console.error('[WS Scheduler] Error sending notifications:', error);
        }
      }
    }
  }
}

export function startScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  schedulerInterval = setInterval(tick, 30_000);
  console.log('[WS Scheduler] Started (30s interval)');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[WS Scheduler] Stopped');
  }
}
