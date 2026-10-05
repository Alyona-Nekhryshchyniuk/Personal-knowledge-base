# WebSocket Setup Guide

## Overview

The WebSocket server provides real-time review reminder notifications. It runs on the same port as the Next.js app (port 3000) using a custom HTTP server.

## Architecture

- **Custom Server** (port 3000): Handles both HTTP requests and WebSocket upgrades
  - Next.js request handler for HTTP routes
  - WebSocket server (`ws://localhost:3000/ws`) for real-time notifications
- **Database**: Stores sessions and notes; used to verify auth and query reminders

## Running

### Development Mode

```bash
npm run dev
```

This single command starts both the HTTP server and WebSocket server on port 3000.

## Configuration

The WebSocket server reads these environment variables from `.env.local`:

- `WS_CHECK_INTERVAL` (default: 300000) - Check interval in milliseconds (5 minutes)
- `DATABASE_URL` - Connection to the database (reads sessions and notes)
- `PORT` (default: 3000) - Port for both HTTP and WebSocket

### `.env.local`

```env
# WebSocket Configuration
WS_CHECK_INTERVAL=300000
PORT=3000
DATABASE_URL=file:./dev.db
```

## How It Works

### Client Side (`useWebSocket` hook)

1. User logs in via OAuth
2. `NotificationProvider` mounts and calls `useWebSocket()`
3. Hook connects to `ws://localhost:3000/ws?token=<session-id>`
4. Server verifies the session token
5. On successful connection:
   - Receives initial batch of all due/overdue notes
   - Displays toast notifications for each
   - Periodically receives new due notes every 5 minutes

### Server Side (`server.ts`)

1. Custom server listens on port 3000
2. HTTP requests routed to Next.js handler
3. WebSocket upgrades (`GET /ws`) handled by `ws` library
4. On client connection:
   - Validates session token against database
   - Stores connection in memory map
   - Sends initial batch of due notes
   - Starts 5-minute periodic check
5. Periodic check:
   - Queries database for new due notes
   - Sends to client if not already sent
6. On client disconnect:
   - Clears periodic interval
   - Removes connection from map

### Deduplication

- Client-side: `lastNotified` Set tracks notification IDs sent in this session
- Hash format: `{noteId}-{nextReviewDate}-{overdue}`
- Prevents duplicate notifications across reconnections

## Testing

### 1. Start the server

```bash
npm run dev
```

You should see:
```
[Server] App running at http://localhost:3000
[Server] WebSocket available at ws://localhost:3000/ws
```

### 2. Create a test note

1. Login at http://localhost:3000
2. Create a new note
3. Set review interval to "Daily"
4. Set next review date to "Today"

### 3. Check browser DevTools

- Open DevTools → Network → WS
- You should see a WebSocket connection to `ws://localhost:3000/ws`
- Status: "101 Switching Protocols" (look for `/ws` path, not `/_next/hmr`)

### 4. Watch console logs (server terminal)

You should see connection events:

```
[WS] User connected: user-123
[WS] Sent 1 initial notifications to user-123
[WS] Started periodic checks for user-123 (300000ms)
```

### 5. Verify notifications

1. You should see a toast notification: "📚 Review: [Note Title]"
2. Browser DevTools → Console → should see WebSocket messages logged
3. Check the WS tab → Messages → shows `review_reminder` messages

## Debugging

### WebSocket not connecting?

**Issue**: Connection fails, no messages received
- [ ] Check if server is running: `npm run dev`
- [ ] Check console for `[Server]` message confirming both HTTP and WebSocket started
- [ ] Verify port 3000 is not in use: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- [ ] Check browser DevTools → Network → WS for failed connection attempts to `/ws`
- [ ] Verify you're logged in (session cookie exists)

### No notifications received?

**Issue**: Server connected but no notifications
- [ ] Verify the note has:
  - [ ] Status = "Active" (not Archived)
  - [ ] review_interval ≠ "none" (e.g., "daily", "weekly")
  - [ ] nextReviewDate ≤ today (UTC)
- [ ] Check server logs for `[WS] Sent X initial notifications`
- [ ] Check database:
  ```bash
  npm run db:studio
  # Query Notes table, filter by userId, check status and nextReviewDate
  ```

### Connection drops after a few minutes?

**Issue**: WebSocket disconnects unexpectedly
- [ ] Check server logs for errors
- [ ] Check browser DevTools → Console for errors
- [ ] Verify session is still valid: DevTools → Application → Cookies → `__Secure-authjs.session-token` or `authjs.session-token`
- [ ] Session may have expired (default: 30 days)

### Rate limit exceeded?

**Issue**: Some notifications are not sent
- [ ] Check for rate limit logs: `[WS] Rate limit exceeded`
- [ ] Rate limiter tracks per user/connection; default: 100 per minute
- [ ] Restart server to reset rate limit

## Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Port for both HTTP and WebSocket |
| `WS_CHECK_INTERVAL` | 300000 (5 min) | How often to check for new due notes |
| `DATABASE_URL` | file:./dev.db | SQLite for dev, PostgreSQL for prod |
| `NODE_ENV` | development | Environment mode |

## Production Deployment

For production, deploy `server.ts` as the main entry point:

1. **Build**: `npm run build`
2. **Start**: `npm start` runs the custom server with both HTTP and WebSocket on port 3000
3. **Database**: Use PostgreSQL for production (update `DATABASE_URL`)
4. **SSL/TLS**: Use `wss://` (WebSocket Secure) via a reverse proxy (nginx, Caddy) with a valid certificate
5. **Load Balancing**: If multiple instances, use a load balancer (AWS ALB, nginx) to route requests; each instance maintains its own connection map (consider Redis for cross-instance state if needed)

## API Reference

### Client → Server Messages

```json
{
  "type": "subscribe",
  "payload": { "interval": "5m" }
}
```
Resets deduplication and resends all current notifications.

```json
{
  "type": "ping"
}
```
Server responds with `{"type": "pong"}` for heartbeat.

```json
{
  "type": "acknowledge",
  "payload": { "notificationId": "note-123-2026-10-05" }
}
```
Marks a notification as acknowledged (future: for analytics).

### Server → Client Messages

```json
{
  "type": "review_reminder",
  "data": {
    "id": "note-123-2026-10-05",
    "noteId": "note-123",
    "title": "Learn Rust",
    "collection": "Learning",
    "nextReviewDate": "2026-10-05",
    "overdue": false,
    "daysOverdue": 0,
    "dueToday": true
  }
}
```

```json
{
  "type": "subscribed",
  "message": "Successfully subscribed to notifications"
}
```

```json
{
  "type": "error",
  "message": "Failed to load notifications"
}
```

```json
{
  "type": "pong"
}
```

## Troubleshooting

### "Port 3000 already in use"

Kill the existing process:
```bash
# macOS/Linux
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or use a different port:
```bash
PORT=3001 npm run dev
```

### "Cannot find module 'ws'"

Ensure dependencies are installed:
```bash
npm install
```

### "Session token not found in database"

Ensure you're logged in:
1. Visit http://localhost:3000
2. Click "Sign In"
3. Complete OAuth flow
4. Check DevTools → Application → Cookies for session token (look for `authjs.session-token` or similar)
5. Session should then be in database

### "WebSocket connection times out"

Check if the server process is running and listening:
```bash
# Should print something like: tcp 0 0 127.0.0.1:3000 * LISTEN
netstat -an | grep 3000
```

If not listening, restart:
```bash
npm run dev
```

### "ts-node not found"

The custom server uses ts-node to run TypeScript. Ensure it's installed:
```bash
npm install
```

Then restart:
```bash
npm run dev
```
