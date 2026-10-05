# WebSocket Protocol Contract

**Version**: 1.0.0  
**Created**: 2026-10-01  
**Purpose**: Define WebSocket message formats, flow, and behavior for real-time review notifications

---

## Connection Overview

**Endpoint**: `ws://localhost:3000/api/ws` (local dev, use `wss://` in production)

**Authentication**: 
- Session cookie or Bearer token in URL query param
- Example: `ws://localhost:3000/api/ws?token=<session-token>`

**Upgrade Requirements**:
- Must be authenticated (valid session)
- CORS checks applied (frontend origin must match)

**Connection Behavior**:
- On successful upgrade: Server sends initial notification batch
- Stays open while browser tab is active
- Reconnection: Client automatically attempts reconnect on connection loss
- Server checks for review-due notes every 5 minutes (configurable WS_CHECK_INTERVAL)

---

## Message Format

All messages are JSON objects with required `type` field and optional `payload` field.

### Generic Message Structure

```json
{
  "type": "message_type",
  "payload": { }
}
```

---

## Server → Client Messages

Messages sent by server to client.

### Message Type: `review_reminder`

Notification that one or more notes are due or overdue for review.

**Sent When**:
- WebSocket connection opens (initial batch)
- Every 5 minutes if new notes become due
- Immediately after user marks note as reviewed (if status changes)

**Payload**:
```json
{
  "type": "review_reminder",
  "payload": {
    "notifications": [
      {
        "id": "notification-uuid",
        "noteId": "note-uuid",
        "title": "React Hooks Best Practices",
        "collection": "Development",
        "nextReviewDate": "2026-10-01",
        "overdue": false,
        "daysOverdue": 0,
        "dueToday": true
      },
      {
        "id": "notification-uuid",
        "noteId": "note-uuid-2",
        "title": "OOP Design Patterns",
        "collection": "Learning",
        "nextReviewDate": "2026-09-30",
        "overdue": true,
        "daysOverdue": 1,
        "dueToday": false
      }
    ]
  }
}
```

**Notification Fields**:
- `id`: Unique identifier for this notification (for deduplication)
- `noteId`: UUID of the note
- `title`: Note title (for UI display)
- `collection`: Collection name (for context)
- `nextReviewDate`: Date (YYYY-MM-DD) the note is/was due
- `overdue`: Boolean, true if nextReviewDate < today
- `daysOverdue`: Number of days past due (0 if not overdue)
- `dueToday`: Boolean, true if nextReviewDate = today

**Behavior**:
- Sent on initial connection with all currently due/overdue notes
- Sent periodically (every 5 min) if new notes become due
- Duplicate detection: Client tracks notification IDs (hashes) and deduplicates

**Deduplication**:
- Client maintains Set of seen notification IDs
- If notification ID already in Set: do not render (toast/display already shown)
- If new notification ID: add to Set and render

---

### Message Type: `connection_established`

Confirmation that WebSocket connection is established and authenticated.

**Sent When**: Immediately after successful connection upgrade

**Payload**:
```json
{
  "type": "connection_established",
  "payload": {
    "userId": "user-uuid",
    "timestamp": "2026-10-01T10:00:00Z",
    "checkInterval": 300000
  }
}
```

**Fields**:
- `userId`: Authenticated user's ID
- `timestamp`: Server time (ISO 8601 UTC)
- `checkInterval`: Review check interval in milliseconds (default 300000 = 5 min)

---

### Message Type: `error`

Error message from server.

**Sent When**: Authentication fails, protocol error, or server error

**Payload**:
```json
{
  "type": "error",
  "payload": {
    "code": "UNAUTHORIZED",
    "message": "Invalid session token"
  }
}
```

**Error Codes**:
- `UNAUTHORIZED` — Invalid or expired session
- `FORBIDDEN` — User not allowed on this connection
- `PROTOCOL_ERROR` — Client sent invalid message format
- `INTERNAL_ERROR` — Server error

**Behavior**:
- Connection closes after error
- Client should attempt reconnect

---

### Message Type: `pong`

Response to client's `ping` message (keep-alive).

**Sent When**: Server receives client's `ping` message

**Payload**:
```json
{
  "type": "pong",
  "payload": {
    "timestamp": "2026-10-01T10:00:05Z"
  }
}
```

---

## Client → Server Messages

Messages sent by client to server.

### Message Type: `subscribe`

Request server to send current notification batch and refresh periodic checks.

**Sent When**:
- On page load (client initiates)
- User manually refreshes notifications (if UI provides button)
- After user marks note as reviewed (to clear old notification)

**Payload**:
```json
{
  "type": "subscribe",
  "payload": { }
}
```

**Server Behavior**:
- Re-queries all currently due/overdue notes for authenticated user
- Sends fresh `review_reminder` message with current state
- Resets internal check timer (ensures timely checks)

**Response**:
- Server sends `review_reminder` message with current notifications
- Or empty notifications array if none due

---

### Message Type: `acknowledge`

Acknowledge (dismiss) a notification.

**Sent When**: User dismisses a toast or notification in UI

**Payload**:
```json
{
  "type": "acknowledge",
  "payload": {
    "notificationId": "notification-uuid"
  }
}
```

**Server Behavior**:
- Server removes notification from its queue for this user (if tracking server-side)
- Or server simply acknowledges (if using client-side deduplication only)

**Response**:
- Server sends `pong` or does not respond (optional)

---

### Message Type: `ping`

Keep-alive ping from client.

**Sent When**: Client periodically (every 30 seconds) to detect stale connections

**Payload**:
```json
{
  "type": "ping",
  "payload": {}
}
```

**Server Behavior**:
- Server responds with `pong` message

---

## Connection Lifecycle

### 1. Establish Connection

```
Client                              Server
  |                                   |
  |-- WebSocket Upgrade Request -->  |
  |  (with session token)             |
  |                                   |
  |                     Authenticate  |
  |                                   |
  |  <-- 101 Switching Protocols --   |
  |                                   |
  |  <-- connection_established ---   |
  |  <-- review_reminder ----------   | (initial batch)
  |  (current due/overdue notes)      |
  |
```

### 2. Receive Periodic Notifications

```
Client                              Server
  |                                   |
  |                         [5-min check interval]
  |                                   |
  |  <-- review_reminder ----------   |
  |  (if new notes became due)        |
  |
```

### 3. Client Subscription Request

```
Client                              Server
  |                                   |
  |-- subscribe ------------------>  |
  |                                   |
  |                     Re-query notes |
  |                                   |
  |  <-- review_reminder ----------   |
  |  (fresh batch)                    |
  |
```

### 4. Acknowledgment

```
Client                              Server
  |                                   |
  |-- acknowledge ----------------->  |
  |  (notification dismissed)         |
  |                                   |
  |  (client removes from UI)         |
  |
```

### 5. Reconnection on Disconnect

```
Client                              Server
  |                                   |
  |  (connection drops)               |
  |                                   |
  |  [Client wait 1 second]           |
  |                                   |
  |-- WebSocket Upgrade Request -->  |
  |  (new connection)                 |
  |  <-- connection_established ---   |
  |  <-- review_reminder ----------   | (fresh batch)
  |
```

---

## Deduplication Strategy

### Client-Side Deduplication (Chosen Approach)

**Implementation**:
1. Client maintains `Set<string>` of seen notification IDs
2. On receive `review_reminder`:
   - For each notification in payload:
     - Compute hash: `notificationHash = hash(noteId + nextReviewDate + overdue)`
     - If hash NOT in Set:
       - Add hash to Set
       - Render toast/notification in UI
     - If hash in Set:
       - Skip (already shown)
3. When user marks note as reviewed:
   - Send `subscribe` message to server
   - Server re-queries and sends fresh batch (old notification hashes absent)
   - UI updates automatically

**Rationale**:
- Reduces server load (no database queries for tracking)
- Simpler implementation
- Client has full control over UI state

---

## Error Handling & Reconnection

### Automatic Reconnection

**Trigger**: WebSocket connection closes or errors

**Behavior**:
1. Client detects connection close (onerror, onclose events)
2. Wait 1 second (avoid rapid reconnect storms)
3. Attempt to open new connection
4. If successful: send `subscribe` message
5. If failed: retry after 5 seconds (exponential backoff: 5s, 10s, 30s, 60s max)
6. Show "Reconnecting..." message in UI

**Max Attempts**: 5 before giving up and showing error to user

### Authentication Failure

**Trigger**: Server sends `error` type `UNAUTHORIZED`

**Behavior**:
1. Connection closes
2. User is redirected to login screen
3. User must log in again

### Protocol Errors

**Trigger**: Client sends invalid JSON or unknown message type

**Behavior**:
1. Server logs error
2. Server sends `error` message
3. Connection closes (client can reconnect)

---

## Configuration

**Environment Variables**:
- `WS_CHECK_INTERVAL` — Review check interval in milliseconds (default: 300000 = 5 minutes)
- `WS_HEARTBEAT_INTERVAL` — Server-side keep-alive interval (default: 30000 = 30 seconds)
- `WS_MAX_BACKOFF` — Max reconnection backoff in milliseconds (default: 60000 = 1 minute)

---

## Performance Considerations

### Payload Size
- Initial batch: typically 0-20 notifications (< 5 KB)
- Periodic checks: 0-5 new notifications
- Keep payloads small to reduce bandwidth

### Connection Pooling
- One WebSocket per browser tab (not multiplexed)
- Separate connections for each tab session

### Timeouts
- Connection timeout: 10 seconds
- Idle timeout: 2 minutes (client ping/pong maintains connection)
- Reconnect timeout: escalating (1s → 5s → 10s → 30s → 60s)

---

## Security Considerations

### Authentication
- WebSocket upgrade requires valid session (cookie or token)
- Session token validated before connection accepted
- User ID extracted from authenticated session

### Authorization
- Server only sends notifications for authenticated user
- User cannot subscribe to another user's notifications
- Message type validation prevents injection

### Data Sanitization
- All strings sanitized before sending
- No sensitive data in notification payloads (only IDs and dates)
- No user secrets or OAuth tokens transmitted

---

## Testing Considerations

### Mock WebSocket Server
- Tests use `ws` library or mock WebSocket for unit tests
- Mock server simulates:
  - Connection handshake
  - Initial notification batch
  - Periodic notifications
  - Error scenarios
  - Disconnection/reconnection

### Test Cases
1. Connection succeeds with valid session
2. Connection fails with invalid session
3. Initial notification batch received
4. Periodic notifications sent
5. Subscription request updates notifications
6. Acknowledgment processed
7. Reconnection after disconnect
8. Protocol error handling
9. No duplicate notifications for same note

---

## Message Examples

### Initial Connection & Notifications

```json
{"type": "connection_established", "payload": {"userId": "user-123", "timestamp": "2026-10-01T10:00:00Z", "checkInterval": 300000}}
{"type": "review_reminder", "payload": {"notifications": [{"id": "notif-1", "noteId": "note-a", "title": "React Hooks", "collection": "Dev", "nextReviewDate": "2026-10-01", "overdue": false, "daysOverdue": 0, "dueToday": true}]}}
```

### Periodic Notification (5 minutes later)

```json
{"type": "review_reminder", "payload": {"notifications": [{"id": "notif-1", "noteId": "note-a", "title": "React Hooks", "collection": "Dev", "nextReviewDate": "2026-10-01", "overdue": false, "daysOverdue": 0, "dueToday": true}, {"id": "notif-2", "noteId": "note-b", "title": "Design Patterns", "collection": "Learning", "nextReviewDate": "2026-09-30", "overdue": true, "daysOverdue": 1, "dueToday": false}]}}
```

### Client Subscription Request

```json
{"type": "subscribe", "payload": {}}
```

### Server Response to Subscription

```json
{"type": "review_reminder", "payload": {"notifications": [{"id": "notif-1", "noteId": "note-a", "title": "React Hooks", "collection": "Dev", "nextReviewDate": "2026-10-01", "overdue": false, "daysOverdue": 0, "dueToday": true}]}}
```

### Client Acknowledgment

```json
{"type": "acknowledge", "payload": {"notificationId": "notif-1"}}
```

### Keep-Alive Ping/Pong

```json
{"type": "ping", "payload": {}}
{"type": "pong", "payload": {"timestamp": "2026-10-01T10:00:05Z"}}
```

### Error on Disconnect

```json
{"type": "error", "payload": {"code": "UNAUTHORIZED", "message": "Session expired"}}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-01 | Initial WebSocket protocol |

---

**Next**: Quickstart validation guide
