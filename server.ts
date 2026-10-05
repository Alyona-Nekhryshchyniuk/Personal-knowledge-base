import http from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { authenticateConnection } from './lib/ws/auth.ts';
import { attachConnectionHandlers } from './lib/ws/handleConnection.ts';
import { startScheduler } from './lib/ws/scheduler.ts';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    if (req.url === '/api/ws') {
      const session = await authenticateConnection(req);

      if (!session?.user?.id) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, session);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', async (ws, session: any) => {
    const userId = session.user.id;
    console.log(`[WS] Client connected: ${userId}`);

    try {
      await attachConnectionHandlers(ws, userId);
    } catch (err) {
      console.error('[WS] Error attaching handlers:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize connection' }));
      ws.close();
    }

    ws.on('error', (err) => {
      console.error('[WS] Error:', err);
    });
  });

  startScheduler();

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (${dev ? 'development' : 'production'})`);
    console.log(`> WebSocket available at ws://${hostname}:${port}/api/ws`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
      process.exit(1);
    }
    throw err;
  });
});
