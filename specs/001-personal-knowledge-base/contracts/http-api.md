# HTTP API Contract

**Version**: 1.0.0  
**Created**: 2026-10-01  
**Purpose**: Define all HTTP endpoints, request/response schemas, and authorization requirements

---

## API Overview

Base URL: `http://localhost:3000/api` (local dev)

All endpoints are JSON-based. Authentication via session cookies (NextAuth default).

---

## Authentication Endpoints

### POST /auth/signin

Redirect user to OAuth provider (Google or GitHub).

**Method**: POST  
**Auth Required**: No  
**Body**:
```json
{
  "provider": "google" | "github"
}
```

**Response**: 302 Redirect to OAuth provider

**Error**:
- 400 Bad Request if provider not recognized

**Behavior**:
- Redirects to Google or GitHub OAuth authorization page
- User authorizes the app
- OAuth provider redirects back to `/api/auth/callback/:provider`

---

### GET /auth/callback/:provider

OAuth callback handler. Provider redirects here after user authorizes.

**Method**: GET  
**Auth Required**: No  
**Query Params**:
- `code`: Authorization code from provider
- `state`: State parameter for CSRF protection

**Response**: 302 Redirect to dashboard (`/`)

**Behavior**:
- NextAuth handles OAuth flow
- Creates local User record on first sign-in
- Sets session cookie
- Redirects to dashboard

**Error**:
- 400 Bad Request if code or state invalid
- 500 Internal Server Error if user creation fails

---

### POST /auth/signout

Invalidate session and log out user.

**Method**: POST  
**Auth Required**: Yes (session cookie)  
**Body**: Empty or no body

**Response**: 200 OK

**Behavior**:
- Clears session cookie
- User session invalidated

---

### GET /auth/session

Get current authenticated user session.

**Method**: GET  
**Auth Required**: No (but returns null if not authenticated)  
**Body**: None

**Response**: 200 OK
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "display_name": "User Name",
    "avatar_url": "https://..."
  },
  "expires": "2026-10-02T00:00:00Z"
}
```

Or if not authenticated:
```json
null
```

---

## Collections Endpoints

### GET /collections

List all collections for authenticated user.

**Method**: GET  
**Auth Required**: Yes  
**Query Params**: None  
**Body**: None

**Response**: 200 OK
```json
{
  "collections": [
    {
      "id": "collection-uuid",
      "name": "Learning",
      "noteCount": 5,
      "createdAt": "2026-10-01T10:00:00Z"
    },
    ...
  ]
}
```

**Behavior**:
- Returns all collections owned by authenticated user
- Sorted by createdAt ascending

**Error**:
- 401 Unauthorized if not authenticated

---

### POST /collections

Create a new collection.

**Method**: POST  
**Auth Required**: Yes  
**Body**:
```json
{
  "name": "Project Alpha"
}
```

**Response**: 201 Created
```json
{
  "id": "collection-uuid",
  "name": "Project Alpha",
  "createdAt": "2026-10-01T10:00:00Z"
}
```

**Validation**:
- name: non-empty, max 255 characters
- name: must be unique for user (409 if duplicate)

**Error**:
- 400 Bad Request if name empty or missing
- 409 Conflict if collection name already exists for user
- 401 Unauthorized if not authenticated

---

### PATCH /collections/:id

Rename a collection.

**Method**: PATCH  
**Auth Required**: Yes  
**Params**: `id` = collection UUID  
**Body**:
```json
{
  "name": "New Name"
}
```

**Response**: 200 OK
```json
{
  "id": "collection-uuid",
  "name": "New Name",
  "updatedAt": "2026-10-01T10:01:00Z"
}
```

**Validation**:
- name: non-empty, max 255 characters
- name: must be unique for user
- Collection must be owned by authenticated user

**Error**:
- 400 Bad Request if name invalid
- 403 Forbidden if collection not owned by user
- 404 Not Found if collection doesn't exist
- 409 Conflict if new name already exists for user
- 401 Unauthorized if not authenticated

---

### DELETE /collections/:id

Delete a collection and cascade all notes.

**Method**: DELETE  
**Auth Required**: Yes  
**Params**: `id` = collection UUID  
**Body**: None

**Response**: 204 No Content

**Behavior**:
- Deletes collection
- Deletes all notes in collection
- Removes all NoteTag records for those notes
- Tags themselves are NOT deleted

**Validation**:
- Collection must be owned by authenticated user

**Error**:
- 403 Forbidden if collection not owned by user
- 404 Not Found if collection doesn't exist
- 401 Unauthorized if not authenticated

---

## Tags Endpoints

### GET /tags

List all tags for authenticated user.

**Method**: GET  
**Auth Required**: Yes  
**Query Params**: None  
**Body**: None

**Response**: 200 OK
```json
{
  "tags": [
    {
      "id": "tag-uuid",
      "name": "important",
      "noteCount": 3,
      "createdAt": "2026-10-01T10:00:00Z"
    },
    ...
  ]
}
```

**Behavior**:
- Returns all tags owned by authenticated user
- Sorted by name ascending

**Error**:
- 401 Unauthorized if not authenticated

---

### POST /tags

Create a new tag.

**Method**: POST  
**Auth Required**: Yes  
**Body**:
```json
{
  "name": "review-soon"
}
```

**Response**: 201 Created
```json
{
  "id": "tag-uuid",
  "name": "review-soon",
  "createdAt": "2026-10-01T10:00:00Z"
}
```

**Validation**:
- name: non-empty, max 100 characters
- name: must be unique for user

**Error**:
- 400 Bad Request if name invalid
- 409 Conflict if tag name already exists for user
- 401 Unauthorized if not authenticated

---

### PATCH /tags/:id

Rename a tag.

**Method**: PATCH  
**Auth Required**: Yes  
**Params**: `id` = tag UUID  
**Body**:
```json
{
  "name": "new-name"
}
```

**Response**: 200 OK
```json
{
  "id": "tag-uuid",
  "name": "new-name",
  "updatedAt": "2026-10-01T10:01:00Z"
}
```

**Validation**:
- name: non-empty, max 100 characters
- name: must be unique for user
- Tag must be owned by authenticated user

**Error**:
- 400 Bad Request if name invalid
- 403 Forbidden if tag not owned by user
- 404 Not Found if tag doesn't exist
- 409 Conflict if new name already exists for user
- 401 Unauthorized if not authenticated

**Side Effects**:
- All notes tagged with old name now have new name

---

### DELETE /tags/:id

Delete a tag from all notes.

**Method**: DELETE  
**Auth Required**: Yes  
**Params**: `id` = tag UUID  
**Body**: None

**Response**: 204 No Content

**Behavior**:
- Deletes tag
- Removes tag from all associated notes
- Notes are NOT deleted

**Validation**:
- Tag must be owned by authenticated user

**Error**:
- 403 Forbidden if tag not owned by user
- 404 Not Found if tag doesn't exist
- 401 Unauthorized if not authenticated

---

## Notes Endpoints

### GET /notes

List notes for authenticated user with search and filters.

**Method**: GET  
**Auth Required**: Yes  
**Query Params**:
- `search` (optional): Substring to match in title, content, or URL
- `collection` (optional): Collection UUID to filter by
- `tags` (optional): Comma-separated tag UUIDs (AND logic)
- `status` (optional): 'active' or 'archived'
- `reviewState` (optional): 'due', 'overdue', 'next7days', 'none', 'all' (default: 'all')
- `page` (optional): Page number (default: 1), 20 per page
- `sortBy` (optional): 'created', 'updated', 'reviewDate' (default: 'updated')
- `sortOrder` (optional): 'asc' or 'desc' (default: 'desc')

**Body**: None

**Response**: 200 OK
```json
{
  "notes": [
    {
      "id": "note-uuid",
      "title": "React Hooks",
      "collection": "Development",
      "tags": ["react", "hooks"],
      "status": "active",
      "reviewInterval": "weekly",
      "nextReviewDate": "2026-10-08",
      "lastReviewedDate": "2026-10-01",
      "createdAt": "2026-10-01T10:00:00Z",
      "updatedAt": "2026-10-01T11:00:00Z"
    },
    ...
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

**Behavior**:
- Returns notes owned by authenticated user
- Search matches case-insensitive substrings in title, content, source_url
- Filters combined with AND logic
- reviewState filter:
  - 'due': next_review_date <= today AND status='active' AND review_interval != 'none'
  - 'overdue': next_review_date < today AND status='active' AND review_interval != 'none'
  - 'next7days': next_review_date between today+1 and today+7 AND status='active' AND review_interval != 'none'
  - 'none': review_interval = 'none'
  - 'all': no review filter
- Paginated: 20 per page

**Error**:
- 401 Unauthorized if not authenticated

---

### POST /notes

Create a new note.

**Method**: POST  
**Auth Required**: Yes  
**Body**:
```json
{
  "title": "React Hooks Best Practices",
  "content": "Use custom hooks for reusable logic...",
  "collectionId": "collection-uuid",
  "tags": ["tag-uuid-1", "tag-uuid-2"],
  "sourceUrl": "https://react.dev/reference/hooks",
  "reviewInterval": "weekly",
  "customDays": null
}
```

**Response**: 201 Created
```json
{
  "id": "note-uuid",
  "title": "React Hooks Best Practices",
  "content": "Use custom hooks for reusable logic...",
  "collection": "Development",
  "tags": ["react", "hooks"],
  "sourceUrl": "https://react.dev/reference/hooks",
  "status": "active",
  "reviewInterval": "weekly",
  "customDays": null,
  "nextReviewDate": "2026-10-08",
  "lastReviewedDate": null,
  "createdAt": "2026-10-01T10:00:00Z",
  "updatedAt": "2026-10-01T10:00:00Z"
}
```

**Validation**:
- title: non-empty, max 500 characters
- content: non-empty
- collectionId: must exist and be owned by user
- tags: must exist and be owned by user
- sourceUrl: valid URL format if provided
- reviewInterval: one of 'none', 'daily', 'weekly', 'monthly', 'custom'
- customDays: required if reviewInterval='custom', must be >= 1

**Calculation**:
- If reviewInterval != 'none': nextReviewDate = today + interval (UTC)
- lastReviewedDate = null
- status = 'active'

**Error**:
- 400 Bad Request if validation fails
- 404 Not Found if collection or tags don't exist
- 403 Forbidden if collection/tags not owned by user
- 401 Unauthorized if not authenticated

---

### GET /notes/:id

Get detailed view of a single note.

**Method**: GET  
**Auth Required**: Yes  
**Params**: `id` = note UUID  
**Body**: None

**Response**: 200 OK
```json
{
  "id": "note-uuid",
  "title": "React Hooks Best Practices",
  "content": "Use custom hooks for reusable logic...",
  "collectionId": "collection-uuid",
  "collection": "Development",
  "tags": [
    {
      "id": "tag-uuid",
      "name": "react"
    },
    ...
  ],
  "sourceUrl": "https://react.dev/reference/hooks",
  "status": "active",
  "reviewInterval": "weekly",
  "customDays": null,
  "nextReviewDate": "2026-10-08",
  "lastReviewedDate": "2026-10-01",
  "createdAt": "2026-10-01T10:00:00Z",
  "updatedAt": "2026-10-01T10:00:00Z"
}
```

**Authorization**:
- Note must be owned by authenticated user

**Error**:
- 404 Not Found if note doesn't exist
- 403 Forbidden if note not owned by user
- 401 Unauthorized if not authenticated

---

### PATCH /notes/:id

Update note fields.

**Method**: PATCH  
**Auth Required**: Yes  
**Params**: `id` = note UUID  
**Body**:
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "collectionId": "new-collection-uuid",
  "tags": ["tag-uuid-1", "tag-uuid-3"],
  "sourceUrl": "https://example.com",
  "reviewInterval": "daily",
  "customDays": null
}
```

(All fields optional; only provided fields are updated)

**Response**: 200 OK
```json
{
  "id": "note-uuid",
  "title": "Updated Title",
  ...
  "updatedAt": "2026-10-01T10:01:00Z"
}
```

**Validation**:
- Same as POST /notes
- If reviewInterval changes: recalculate nextReviewDate from today

**Side Effects**:
- If tags change: update NoteTag relationships
- If collection changes: move note to new collection
- If reviewInterval changes: recalculate nextReviewDate
- Updated_at always set to now

**Authorization**:
- Note must be owned by authenticated user
- New collection/tags must be owned by user

**Error**:
- 400 Bad Request if validation fails
- 404 Not Found if note, collection, or tags don't exist
- 403 Forbidden if not owned by user
- 401 Unauthorized if not authenticated

---

### POST /notes/:id/archive

Archive a note (exclude from reminders, but preserve).

**Method**: POST  
**Auth Required**: Yes  
**Params**: `id` = note UUID  
**Body**: Empty

**Response**: 200 OK
```json
{
  "id": "note-uuid",
  "status": "archived",
  "updatedAt": "2026-10-01T10:01:00Z"
}
```

**Behavior**:
- Sets status = 'archived'
- Note no longer appears in review notifications
- Note can be restored

**Authorization**:
- Note must be owned by authenticated user

**Error**:
- 404 Not Found if note doesn't exist
- 403 Forbidden if note not owned by user
- 401 Unauthorized if not authenticated

---

### POST /notes/:id/restore

Restore an archived note to active.

**Method**: POST  
**Auth Required**: Yes  
**Params**: `id` = note UUID  
**Body**: Empty

**Response**: 200 OK
```json
{
  "id": "note-uuid",
  "status": "active",
  "updatedAt": "2026-10-01T10:01:00Z"
}
```

**Behavior**:
- Sets status = 'active'
- If reviewInterval != 'none': note becomes eligible for reminders again
- If nextReviewDate <= today: eligible immediately

**Authorization**:
- Note must be owned by authenticated user

**Error**:
- 404 Not Found if note doesn't exist
- 403 Forbidden if note not owned by user
- 401 Unauthorized if not authenticated

---

### POST /notes/:id/review

Mark a note as reviewed and recalculate next review date.

**Method**: POST  
**Auth Required**: Yes  
**Params**: `id` = note UUID  
**Body**: Empty

**Response**: 200 OK
```json
{
  "id": "note-uuid",
  "lastReviewedDate": "2026-10-01",
  "nextReviewDate": "2026-10-08",
  "updatedAt": "2026-10-01T10:01:00Z"
}
```

**Behavior**:
- Sets lastReviewedDate = today (UTC)
- Recalculates nextReviewDate:
  - daily: today + 1 day
  - weekly: today + 7 days
  - monthly: today + 1 calendar month
  - custom: today + customDays days
  - none: no change (not eligible for review)
- Sets updatedAt = now

**Calculation**:
- All dates in UTC
- "today" is midnight UTC to 23:59:59 UTC
- Month calculation handles edge cases (Feb 28 + 1 month = Mar 28)

**Authorization**:
- Note must be owned by authenticated user
- Note must have reviewInterval != 'none' to be reviewable

**Error**:
- 404 Not Found if note doesn't exist
- 403 Forbidden if note not owned by user
- 400 Bad Request if note has reviewInterval='none'
- 401 Unauthorized if not authenticated

---

### DELETE /notes/:id

Delete a note permanently.

**Method**: DELETE  
**Auth Required**: Yes  
**Params**: `id` = note UUID  
**Body**: None

**Response**: 204 No Content

**Behavior**:
- Deletes note
- Removes all NoteTag records
- Cannot be recovered

**Authorization**:
- Note must be owned by authenticated user

**Error**:
- 404 Not Found if note doesn't exist
- 403 Forbidden if note not owned by user
- 401 Unauthorized if not authenticated

---

## Development/Test Endpoints

### POST /dev/seed

Create sample data for authenticated user (development only).

**Method**: POST  
**Auth Required**: Yes (must be authenticated to get user context)  
**Body**: Optional

```json
{
  "override": false
}
```

**Response**: 201 Created
```json
{
  "created": {
    "collections": 3,
    "tags": 5,
    "notes": 10
  }
}
```

**Behavior**:
- Only accessible if NODE_ENV = 'development'
- Returns 403 in production
- Creates sample collections, tags, notes for authenticated user
- If `override: true`, clears existing data first (dangerous)

**Error**:
- 403 Forbidden if NODE_ENV != 'development'
- 401 Unauthorized if not authenticated

---

## Error Response Format

All errors return JSON with consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'name' is required",
    "details": [
      {
        "field": "name",
        "issue": "required"
      }
    ]
  }
}
```

**Common Error Codes**:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_ERROR` (500)

---

## Authorization & Security

All endpoints (except `/auth/signin`, `/auth/callback`, `/auth/session`) require:
- Valid session cookie (NextAuth)
- User ID extracted from session
- Query/update scoped to user_id

Every operation checks:
- User owns the resource
- Resource exists
- Input is valid

Client-supplied user_id never overrides session user_id.

---

## Pagination

List endpoints use pagination:
- Default page size: 20
- Max page size: 100
- Response includes `total`, `page`, `pageSize`
- Example: `/notes?page=2&pageSize=50`

---

## Sorting

List endpoints support sorting:
- `sortBy`: 'created', 'updated', 'reviewDate', 'name' (default: endpoint-dependent)
- `sortOrder`: 'asc' or 'desc' (default: 'desc' for dates, 'asc' for names)
- Example: `/notes?sortBy=nextReviewDate&sortOrder=asc`

---

## Rate Limiting

Not implemented for MVP. Add in future if needed.

---

## Response Codes

- `200 OK` — Successful GET or PATCH
- `201 Created` — Successful POST
- `204 No Content` — Successful DELETE or POST with no body
- `400 Bad Request` — Validation error
- `401 Unauthorized` — Not authenticated
- `403 Forbidden` — Authenticated but not authorized
- `404 Not Found` — Resource doesn't exist
- `409 Conflict` — Duplicate name or constraint violation
- `500 Internal Server Error` — Server error

---

**Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-01 | Initial HTTP API contract |

---

**Next**: WebSocket protocol contract
