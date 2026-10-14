import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { parse } from 'url';
import next from 'next';
import { getToken } from 'next-auth/jwt';
import { getDueNotifications } from './lib/services/notifications';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const checkInterval = parseInt(process.env.WS_CHECK_INTERVAL || '300000', 10);
const connections = new Map<string, { send: (msg: string) => void; timer?: NodeJS.Timeout }>();

function sendNotifications(send: (msg: string) => void, userId: string) {
  getDueNotifications(userId)
    .then((notifications) => {
      send(
        JSON.stringify({
          type: 'review_reminder',
          payload: { notifications },
        })
      );
    })
    .catch((err) => console.error('[WebSocket] Error:', err));
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade for WebSocket
  server.on('upgrade', async (req, socket, head) => {
    const pathname = req.url ? parse(req.url).pathname : '';

    if (pathname !== '/api/ws') {
      socket.destroy();
      return;
    }

    try {
      // Extract session token from cookies
      const cookieHeader = req.headers.cookie || '';
      console.log('[WebSocket] Cookie header:', cookieHeader);

      const sessionToken = cookieHeader
        .split(';')
        .map((c: string) => c.trim())
        .find((c: string) => c.startsWith('authjs.session-token'))
        ?.split('=')[1];

      console.log('[WebSocket] Session token extracted:', sessionToken ? 'yes' : 'no');

      // Validate token
      const token = await getToken({
        req: {
          headers: { cookie: cookieHeader }
        } as any,
        secret: process.env.NEXTAUTH_SECRET,
      });

      console.log('[WebSocket] Token valid:', token?.sub ? `yes (${token.sub})` : 'no');

      if (!token?.sub) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // Upgrade connection
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, token.sub);
      });
    } catch (err) {
      console.error('[WebSocket] Upgrade error:', err);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws: any, req: any, userId: string) => {
    console.log(`[WebSocket] User ${userId} connected`);

    // Close old connection if exists
    const oldConn = connections.get(userId);
    if (oldConn?.timer) clearInterval(oldConn.timer);

    // Send initial batch
    sendNotifications((msg) => {
      if (ws.readyState === 1) ws.send(msg);
    }, userId);

    // Periodic check every 5 minutes
    const timer = setInterval(() => {
      if (ws.readyState === 1) {
        sendNotifications((msg) => ws.send(msg), userId);
      }
    }, checkInterval);

    connections.set(userId, { send: (msg) => ws.send(msg), timer });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'subscribe') {
          console.log(`[WebSocket] User ${userId} subscribed`);
          sendNotifications((msg) => ws.send(msg), userId);
        }
      } catch (err) {
        console.error('[WebSocket] Message error:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] User ${userId} disconnected`);
      const conn = connections.get(userId);
      if (conn?.timer) clearInterval(conn.timer);
      connections.delete(userId);
    });

    ws.on('error', (err: Error) => {
      console.error(`[WebSocket] Error:`, err);
    });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, () => {
    console.log(`[Server] Listening on http://localhost:${port}`);
  });
});
