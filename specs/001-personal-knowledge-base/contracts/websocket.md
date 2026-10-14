# WebSocket Protocol Contract

**Version**: 1.0.0  
**Source of Truth**: `/req.txt` (Business Requirements)  
**Purpose**: Real-time review reminder notifications

---

## Connection

**Endpoint**: `ws://localhost:3000/api/ws` (use `wss://` in production)

**Authentication**: Requires valid next-auth session
- Session validated before connection upgrade
- User ID extracted from authenticated session

**Behavior on Connect**:
- Server immediately sends batch of all notes currently due today or overdue
- Periodic checks every 5 minutes for new due notes

---

## Notification Rules

**Archived notes are NEVER sent** — Filter: `status = 'Active'`

**Notes with no review schedule are NEVER sent** — Filter: `reviewInterval != 'none'`

**A note is "due"** if:
- `nextReviewDate <= TODAY (UTC)` AND
- `status = 'Active'` AND
- `reviewInterval != 'none'`

**A note is "overdue"** if:
- `nextReviewDate < TODAY (UTC)` AND
- `status = 'Active'` AND
- `reviewInterval != 'none'`

---

## Message Format

All WebSocket messages are JSON objects with required `type` field and optional `payload` field:

```json
{
  "type": "message_type",
  "payload": { }
}
```

---

## Server → Client Messages

### `review_reminder`

Notification that notes are due or overdue for review.

**Sent When**:
- On connection (initial batch of all currently due/overdue notes)
- Every 5 minutes if any notes are currently due/overdue
- After receiving client `subscribe` message (fresh batch)

**Payload** (from req.txt):
```json
{
  "type": "review_reminder",
  "payload": {
    "notifications": [
      {
        "noteId": "note-uuid",
        "title": "Note Title",
        "collection": "Collection Name",
        "nextReviewDate": "2026-10-15",
        "overdue": false,
        "daysOverdue": 0
      }
    ]
  }
}
```

**Notification Fields**:
- `noteId`: UUID of the note (required by req.txt)
- `title`: Note title (required by req.txt)
- `collection`: Collection name (required by req.txt)
- `nextReviewDate`: Date (YYYY-MM-DD) note is/was due (required by req.txt)
- `overdue`: Boolean, true if nextReviewDate < today (required by req.txt)
- `daysOverdue`: Number of days past due (0 if not overdue; helpful for UI)

**Deduplication**:
- Client-side only (no server-side queue)
- Client maintains Set of seen notification IDs
- Client computes ID as: `hash(noteId + nextReviewDate + overdue)`
- If notification ID already seen: skip (don't re-render)
- If new notification ID: add to Set and render

---

## Client → Server Messages

### `subscribe`

Request server to re-query and send fresh notification batch.

**Sent When**:
- After user marks note as reviewed (to clear old notification)
- User manually refreshes notifications in UI (if button provided)
- Client initiates on page load (optional)

**Payload**:
```json
{
  "type": "subscribe",
  "payload": {}
}
```

**Server Behavior**:
- Re-queries all currently due/overdue notes for authenticated user
- Sends fresh `review_reminder` message
- Causes client to see new state (re-queries not in dedup cache)

---

## Connection Lifecycle

### 1. Establish Connection
```
Client                          Server
  |                               |
  |-- WebSocket Upgrade Req -->  |
  |  (with session cookie)        |
  |                     Validate  |
  |  <-- HTTP 101 Upgrade ---      |
  |  <-- review_reminder --       | (initial batch)
  |  (all currently due notes)    |
```

### 2. Periodic Notifications (Every 5 Minutes)
```
Client                          Server
  |                               |
  |                    [5-min timer fires]
  |  <-- review_reminder --       |
  |  (if new notes now due)       |
```

### 3. Client Subscription
```
Client                          Server
  |                               |
  |-- subscribe ---------------  |
  |                    Re-query   |
  |  <-- review_reminder --       |
  |  (fresh batch)                |
```

### 4. Reconnection
```
Client                          Server
  |                               |
  |  (connection drops)           |
  |  [wait 1 second]              |
  |                               |
  |-- WebSocket Upgrade Req -->  |
  |  <-- HTTP 101 Upgrade ---      |
  |  <-- review_reminder --       | (fresh batch)
```

---

## Error Handling

### Connection Failures
- Client automatically attempts reconnection with exponential backoff (1s, 5s, 10s, 30s, max 60s)
- Max 5 reconnection attempts before giving up
- Shows "Reconnecting..." message in UI

### Authentication Failure
- If session is invalid or expires: server closes connection
- Client detects close and redirects user to login screen

---

## Configuration

**Environment Variables**:
- `WS_CHECK_INTERVAL` — Review check interval (default: 300000 ms = 5 minutes)
- `WS_MAX_BACKOFF` — Max reconnection backoff (default: 60000 ms = 1 minute)

---

## Performance

**Payload Size**:
- Typical notification: ~200 bytes per note
- Initial batch: 0-100 notifications (~20 KB worst case)
- Periodic check: 0-10 new notifications per 5-min window

**Connection Pooling**:
- One WebSocket per browser tab
- No multiplexing

**Timeouts**:
- Connection timeout: 10 seconds
- Idle timeout: 2 minutes (client/server ping-pong maintains connection)

---

## Security

### Authentication
- WebSocket upgrade requires valid next-auth session
- User ID extracted from session; used to filter all queries

### Authorization
- Server sends notifications ONLY for authenticated user
- User cannot subscribe to another user's notifications

### Data Sanitization
- All strings escaped before sending
- No sensitive data in payloads (only IDs and dates)
- No OAuth tokens or secrets transmitted

---

## Examples

### On Connection
```json
{
  "type": "review_reminder",
  "payload": {
    "notifications": [
      {
        "noteId": "note-123",
        "title": "React Hooks Best Practices",
        "collection": "Development",
        "nextReviewDate": "2026-10-14",
        "overdue": false,
        "daysOverdue": 0
      },
      {
        "noteId": "note-456",
        "title": "Design Patterns",
        "collection": "Learning",
        "nextReviewDate": "2026-10-13",
        "overdue": true,
        "daysOverdue": 1
      }
    ]
  }
}
```

### Client Subscribe Request
```json
{
  "type": "subscribe",
  "payload": {}
}
```

### Periodic Notification (5 minutes later)
```json
{
  "type": "review_reminder",
  "payload": {
    "notifications": [
      {
        "noteId": "note-789",
        "title": "OOP Principles",
        "collection": "Learning",
        "nextReviewDate": "2026-10-14",
        "overdue": false,
        "daysOverdue": 0
      }
    ]
  }
}
```

---

## Testing

**Test Cases**:
1. ✅ Connection succeeds with valid session
2. ✅ Connection fails with invalid session (close)
3. ✅ Initial batch sent on connect with all due/overdue notes
4. ✅ Archived notes never in batch
5. ✅ Notes with `reviewInterval = 'none'` never in batch
6. ✅ Periodic batch sent every 5 minutes
7. ✅ Subscribe message triggers fresh batch
8. ✅ No duplicate notifications (same noteId not sent twice in 5-min window)
9. ✅ Client-side dedup prevents duplicate UI toasts
10. ✅ Reconnection on disconnect with exponential backoff

**Mock Strategy**:
- Mock WebSocket server with `ws` library
- Mock next-auth session
- Mock database queries for due notes
- Simulate periodic timer

---

**Last Updated**: 2026-10-14  
**Status**: Spec finalizes req.txt requirements; implementation pending
