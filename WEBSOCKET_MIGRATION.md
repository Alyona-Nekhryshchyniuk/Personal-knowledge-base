# WebSocket Migration Summary

## What Changed

The WebSocket server has been migrated from a **separate port (3001)** to run **on the same port (3000)** as the main Next.js application.

### Before
- `npm run dev` → Next.js app on port 3000 (HTTP only)
- `npm run ws` → WebSocket server on port 3001
- `npm run dev:all` → Both servers concurrently

### After
- `npm run dev` → Single custom server on port 3000 (HTTP + WebSocket)
- No separate WebSocket process needed
- Simpler development workflow

## Implementation Details

### Files Changed
1. **`server.ts`** (NEW) - Custom HTTP server with WebSocket support
   - Handles all HTTP requests via Next.js
   - Upgrades `/ws` connections to WebSocket
   - Runs on port 3000

2. **`hooks/useWebSocket.ts`** (UPDATED)
   - Changed from `ws://localhost:3001` to dynamic URL detection
   - Now connects to `ws://localhost:3000/ws` (or `wss://` in production)

3. **`components/NotificationProvider.tsx`** (NEW)
   - Global context for WebSocket notifications
   - Wraps the app to provide notifications to all pages

4. **`package.json`** (UPDATED)
   - `npm run dev` now uses `ts-node --esm server.ts`
   - Removed separate `npm run ws` and `npm run dev:all` scripts
   - Removed `concurrently` dependency

5. **`.env.example`** (UPDATED)
   - Removed `WS_PORT` (now 3000 always)
   - Removed `NEXT_PUBLIC_WS_URL` (auto-detected by client)
   - Kept `WS_CHECK_INTERVAL` for periodic checks

6. **`WEBSOCKET_SETUP.md`** (UPDATED)
   - Updated all documentation to reflect single-port architecture

### Files Removed
- `ws-server.ts` - No longer needed
- `lib/websocket-server.ts` - No longer needed

## How to Run

```bash
npm run dev
```

That's it! The server starts on http://localhost:3000 with WebSocket on ws://localhost:3000/ws.

## Testing

1. Start server:
   ```bash
   npm run dev
   ```

2. Login at http://localhost:3000

3. Create a note with:
   - Review interval: "Daily"
   - Next review date: "Today"

4. Check DevTools → Network → WS:
   - Look for connection to `/ws` (not `/_next/hmr`)
   - Should see "101 Switching Protocols"

5. You should see a toast notification: "📚 Review: [Note Title]"

## Architecture

```
Client (Browser)
  ├─ HTTP requests → localhost:3000
  └─ WebSocket connection → ws://localhost:3000/ws

Custom Server (server.ts)
  ├─ HTTP handler → Next.js request handler
  └─ WebSocket handler → ws library upgrade

Next.js App
  ├─ Pages, API routes, etc.
  └─ Handled by Node's http.createServer()

Database
  ├─ Verify sessions
  └─ Query due notes
```

## Benefits

✅ **Single process** - Simpler to manage and deploy  
✅ **No CORS issues** - Same origin for HTTP and WebSocket  
✅ **Easier development** - One command to start everything  
✅ **Standard Next.js pattern** - Aligns with common setups  
✅ **Better scaling** - Can load balance WebSocket with HTTP together  

## Production Deployment

The custom server approach works seamlessly in production:

1. **Build**: `npm run build` compiles Next.js
2. **Start**: `npm start` runs the custom server with both HTTP and WebSocket
3. **Deploy**: Deploy `server.ts` (or compiled `dist/server.js`) as the main process
4. **Environment**: Set `NODE_ENV=production` and `DATABASE_URL` to PostgreSQL

The server automatically handles:
- SSL/TLS termination (via reverse proxy like nginx)
- WebSocket upgrades
- Session verification
- Periodic notification checks

## Migration Notes

- ✅ No breaking changes to the API
- ✅ Client-side hook auto-detects WebSocket URL
- ✅ All notification logic remains the same
- ✅ Database schema unchanged
- ✅ Environment variables simplified

For detailed troubleshooting, see `WEBSOCKET_SETUP.md`.
