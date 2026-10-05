# Data Model: Personal Knowledge Base with Review Reminders

**Version**: 1.0.0  
**Created**: 2026-10-01  
**Purpose**: Define entities, relationships, constraints, and validation rules for the knowledge base system

---

## Entity Definitions

### User

**Purpose**: Represents an authenticated user with SSO identity and profile information

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| id | UUID | PRIMARY KEY | Generated on user creation |
| provider | ENUM | NOT NULL | Values: `google`, `github` |
| provider_user_id | STRING | NOT NULL | External identifier from OAuth provider |
| email | STRING | NULLABLE | May be null if GitHub user hasn't made email public |
| display_name | STRING | NOT NULL | User's display name from OAuth provider |
| avatar_url | STRING | NULLABLE | User's profile picture URL from OAuth provider |
| created_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |
| updated_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |

**Unique Constraints**:
- `UNIQUE(provider, provider_user_id)` — Composite key ensures one user per provider identity

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE on `(provider, provider_user_id)`

**Relationships**:
- Has many Collections (1:N)
- Has many Tags (1:N)
- Has many Notes (1:N)

**Validation Rules**:
- provider: must be 'google' or 'github'
- provider_user_id: non-empty string
- email: valid email format if provided
- display_name: non-empty string
- avatar_url: valid URL if provided

**State Transitions**:
- Created on first SSO sign-in
- Updated when user logs in (refresh profile data)
- Deleted when user requests account deletion (out of scope for MVP)

---

### Collection

**Purpose**: Groups related notes for organizational structure

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| id | UUID | PRIMARY KEY | Generated on collection creation |
| user_id | UUID | NOT NULL, FOREIGN KEY | References User.id |
| name | STRING | NOT NULL | User-provided collection name |
| created_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |
| updated_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |

**Unique Constraints**:
- `UNIQUE(user_id, name)` — Collection names unique per user

**Foreign Keys**:
- `user_id` → User.id (deletion: CASCADE not allowed; user deletion is out of scope)

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`
- UNIQUE on `(user_id, name)`

**Relationships**:
- Belongs to User (N:1)
- Has many Notes (1:N, cascade delete)

**Validation Rules**:
- name: non-empty string, max 255 characters
- user_id: must exist in User table
- Uniqueness: no two collections with same name for same user

**State Transitions**:
- Created: user creates collection
- Updated: user renames collection (updates name and updated_at)
- Deleted: user deletes collection (cascades all notes)

**Cascade Delete Behavior**:
- Deleting a Collection deletes all associated Notes
- Deleting a Collection removes all NoteTag records for those Notes
- Tags themselves are NOT deleted (they may be used in other notes)

---

### Tag

**Purpose**: Flexible labels for organizing and filtering notes

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| id | UUID | PRIMARY KEY | Generated on tag creation |
| user_id | UUID | NOT NULL, FOREIGN KEY | References User.id |
| name | STRING | NOT NULL | User-provided tag name |
| created_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |
| updated_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |

**Unique Constraints**:
- `UNIQUE(user_id, name)` — Tag names unique per user

**Foreign Keys**:
- `user_id` → User.id

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`
- UNIQUE on `(user_id, name)`

**Relationships**:
- Belongs to User (N:1)
- Has many Notes through NoteTag (N:N)

**Validation Rules**:
- name: non-empty string, max 100 characters
- user_id: must exist in User table
- Uniqueness: no two tags with same name for same user

**State Transitions**:
- Created: user creates tag
- Updated: user renames tag (updates name and updated_at)
- Deleted: user deletes tag (removes NoteTag records but not Notes)

---

### Note

**Purpose**: Core entity representing a knowledge unit with review scheduling

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| id | UUID | PRIMARY KEY | Generated on note creation |
| user_id | UUID | NOT NULL, FOREIGN KEY | References User.id (for authorization) |
| collection_id | UUID | NOT NULL, FOREIGN KEY | References Collection.id (note must belong to user's collection) |
| title | STRING | NOT NULL | User-provided note title, max 500 characters |
| content | STRING (TEXT) | NOT NULL | User-provided note body/content, no max length |
| source_url | STRING | NULLABLE | Optional URL reference, max 2000 characters |
| status | ENUM | NOT NULL, DEFAULT 'Active' | Values: `Active`, `Archived` |
| review_interval | ENUM | NOT NULL, DEFAULT 'none' | Values: `none`, `daily`, `weekly`, `monthly`, `custom` |
| custom_days | INTEGER | NULLABLE | If review_interval=custom, must be >= 1 |
| next_review_date | DATE | NULLABLE | UTC date (YYYY-MM-DD format) or null if review_interval=none |
| last_reviewed_date | DATE | NULLABLE | UTC date (YYYY-MM-DD format) or null if never reviewed |
| created_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |
| updated_at | TIMESTAMP (UTC) | NOT NULL | ISO 8601 UTC string |

**Foreign Keys**:
- `user_id` → User.id
- `collection_id` → Collection.id (AND collection must belong to same user)

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`
- FOREIGN KEY on `collection_id`
- INDEX on `(user_id, next_review_date)` — for review queries
- INDEX on `(user_id, status)` — for active/archived filters
- INDEX on `(user_id, collection_id)` — for collection listing
- INDEX on `(user_id, updated_at)` — for sorting by recent

**Relationships**:
- Belongs to User (N:1)
- Belongs to Collection (N:1)
- Has many Tags through NoteTag (N:N)

**Validation Rules**:
- title: non-empty string, max 500 characters
- content: non-empty string
- source_url: valid URL format if provided
- status: must be 'Active' or 'Archived'
- review_interval: must be one of `none`, `daily`, `weekly`, `monthly`, `custom`
- custom_days: if review_interval=custom, must be integer >= 1
- next_review_date: null if review_interval=none; calculated date if other intervals
- user_id: must exist in User table; user must own collection
- collection_id: must exist in Collection table; collection must belong to user

**Authorization Rule**:
- User can only view/edit/delete notes owned by them (checked via user_id)
- Note's collection_id must belong to the same user

**State Transitions**:
- Created: user creates note with specified review_interval
  - If review_interval != none: next_review_date = today + interval
  - If review_interval = none: next_review_date = null
  - last_reviewed_date = null
  - status = Active

- Updated: user edits any field (title, content, source_url, review_interval, collection, tags)
  - If review_interval changes: recalculate next_review_date from today
  - updated_at = now

- Archived: user clicks "Archive"
  - status = Archived
  - Does NOT affect next_review_date or last_reviewed_date (preserved if restored)
  - Excluded from review notifications

- Restored: user restores archived note
  - status = Active
  - If review_interval != none: eligible for review notifications again
  - If next_review_date <= today: eligible immediately

- Reviewed: user marks note as reviewed
  - last_reviewed_date = today (UTC)
  - next_review_date = calculated based on review_interval:
    - daily: today + 1 day
    - weekly: today + 7 days
    - monthly: today + 1 calendar month
    - custom: today + custom_days days
  - updated_at = now

- Moved: user moves note to different collection
  - collection_id = new collection (must belong to same user)
  - updated_at = now

- Deleted: user deletes note
  - Note removed from database
  - All associated NoteTag records removed

**Cascade Delete Behavior**:
- When user deletes: removed
- When collection deletes: cascade removed with collection
- When tag deletes: only NoteTag record removed, note remains

---

### NoteTag

**Purpose**: Join table for many-to-many relationship between Notes and Tags

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| id | UUID | PRIMARY KEY | Generated on creation |
| note_id | UUID | NOT NULL, FOREIGN KEY | References Note.id |
| tag_id | UUID | NOT NULL, FOREIGN KEY | References Tag.id |

**Unique Constraints**:
- `UNIQUE(note_id, tag_id)` — Same tag cannot be assigned twice to same note

**Foreign Keys**:
- `note_id` → Note.id (deletion: CASCADE)
- `tag_id` → Tag.id (deletion: CASCADE)

**Indexes**:
- PRIMARY KEY on `id`
- FOREIGN KEY on `note_id`
- FOREIGN KEY on `tag_id`
- UNIQUE on `(note_id, tag_id)`

**Relationships**:
- Belongs to Note (N:1)
- Belongs to Tag (N:1)

**Validation Rules**:
- note_id: must exist in Note table
- tag_id: must exist in Tag table
- Both note and tag must belong to the same user (enforced via check constraint or app logic)
- Uniqueness: same tag cannot be assigned to same note twice

**State Transitions**:
- Created: user assigns tag to note
- Deleted: user removes tag from note (or tag/note deleted)

**Cross-User Safety**:
- A user cannot assign another user's tags to their notes
- Database constraint or app logic enforces: Note.user_id = Tag.user_id for every NoteTag

---

### NotificationLog (Optional)

**Purpose**: Track sent notifications for deduplication (optional server-side implementation)

| Field | Type | Constraint | Notes |
|-------|------|------------|-------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | NOT NULL, FOREIGN KEY | References User.id |
| note_id | UUID | NOT NULL, FOREIGN KEY | References Note.id |
| notification_hash | STRING | NOT NULL | Hash of notification content |
| sent_at | TIMESTAMP (UTC) | NOT NULL | When notification was sent |

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `(user_id, note_id, sent_at)` — for cleanup queries

**Relationships**:
- Belongs to User (N:1)
- Belongs to Note (N:1)

**Note**: This entity is optional. If client-side deduplication is used, this table is not needed. Decision: Use client-side deduplication (simpler, no server queries).

---

## Entity Relationship Diagram

```
┌──────────────────────────────────┐
│           User                   │
├──────────────────────────────────┤
│ id (PK, UUID)                    │
│ provider (google|github)         │
│ provider_user_id (UNIQUE)        │
│ email (NULLABLE)                 │
│ display_name                     │
│ avatar_url (NULLABLE)            │
│ created_at, updated_at           │
└──────────────────────────────────┘
         │
         │ 1:N
         ├─────────────────────────┬─────────────────────────┬─────────────────┐
         │                         │                         │                 │
         ▼                         ▼                         ▼                 ▼
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │ Collection   │      │    Tag       │      │    Note      │      │     (User)   │
  ├──────────────┤      ├──────────────┤      ├──────────────┤      │ has many via │
  │ id (PK)      │      │ id (PK)      │      │ id (PK)      │      │ Note.user_id │
  │ user_id (FK) │      │ user_id (FK) │      │ user_id (FK) │      └──────────────┘
  │ name         │      │ name         │      │ collection_  │
  │ ...          │      │ ...          │      │   id (FK)    │
  └──────────────┘      └──────────────┘      │ title        │
         │                     ▲               │ content      │
         │ 1:N                 │ N:N           │ source_url   │
         │              ┌──────────────┐       │ status       │
         │              │  NoteTag     │       │ review_...   │
         │              ├──────────────┤       │ next_review_ │
         │              │ note_id (FK) │       │   date       │
         └─────────────▶│ tag_id (FK)  │◀──────│ last_review_ │
           1:N          └──────────────┘ N:1   │   date       │
                                              │ created_at   │
                                              │ updated_at   │
                                              └──────────────┘
                                                     │ N:1
                                                     │
                                                     └──► Collection (N:1)
```

---

## Business Rules & Validation

### Authorization Rules

1. **User Ownership**: Every query for collections, tags, notes must filter by `user_id = authenticated_user.id`
2. **No Cross-User Access**: Attempting to access another user's resources returns 403 Forbidden
3. **Collection Ownership**: User can only access collections they own
4. **Tag Ownership**: User can only assign tags they own to notes
5. **Note Ownership**: User can only view/edit/delete notes they own

### Review Calculation Rules

1. **Due Condition**: `next_review_date <= today AND status = Active AND review_interval != none`
2. **Overdue Condition**: `next_review_date < today AND status = Active AND review_interval != none`
3. **Interval Calculation** (from today, UTC):
   - Daily: `today + 1 day`
   - Weekly: `today + 7 days`
   - Monthly: `today + 1 calendar month` (addMonths semantics: Feb 30 → Mar 2)
   - Custom N: `today + N days`
4. **Edge Cases**:
   - February dates: Feb 28 + 1 month = Mar 28 (Feb 30 doesn't exist)
   - Leap years: handled by calendar month semantics
   - Timezone: all calculations in UTC; clients display in local time

### State & Transition Rules

1. **Archived Notes**: Do not generate review notifications; review dates are preserved (can be restored)
2. **Unscheduled Notes** (review_interval = none): Do not generate review notifications
3. **Collection Deletion**: Cascade delete all notes (per constitution)
4. **Tag Deletion**: Remove tag from notes; notes are not deleted
5. **Note Deletion**: Permanent; cannot be recovered
6. **Collection Name Uniqueness**: Per user (enforced by UNIQUE constraint)
7. **Tag Name Uniqueness**: Per user (enforced by UNIQUE constraint)

### Timestamp Rules

1. **All timestamps stored as UTC ISO 8601 strings** (YYYY-MM-DDTHH:MM:SSZ)
2. **Server calculates "today"** as midnight UTC to 23:59:59 UTC
3. **Client displays dates in browser local time** (user experience only)
4. **Review calculations use UTC dates** (YYYY-MM-DD format, no time component)
5. **created_at and updated_at** set by server on creation/modification

---

## Indexes for Performance

### User
- PRIMARY KEY on `id`
- UNIQUE on `(provider, provider_user_id)`

### Collection
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`
- UNIQUE on `(user_id, name)`

### Tag
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`
- UNIQUE on `(user_id, name)`

### Note
- PRIMARY KEY on `id`
- FOREIGN KEY on `user_id`
- FOREIGN KEY on `collection_id`
- INDEX on `(user_id, next_review_date)` — Review queries
- INDEX on `(user_id, status)` — Active/Archived filters
- INDEX on `(user_id, collection_id)` — Collection listing
- INDEX on `(user_id, updated_at)` — Sorting by recent

### NoteTag
- PRIMARY KEY on `id`
- FOREIGN KEY on `note_id`
- FOREIGN KEY on `tag_id`
- UNIQUE on `(note_id, tag_id)` — Prevents duplicate tags on same note

---

## Constraints & Enforcement

### Database-Level Constraints

- Foreign keys enforced by database
- Unique constraints enforced by database
- NOT NULL enforced by database
- CHECK constraints (where supported):
  - review_interval in ('none', 'daily', 'weekly', 'monthly', 'custom')
  - status in ('Active', 'Archived')
  - custom_days >= 1 IF review_interval = 'custom'

### Application-Level Validation

- Zod schemas validate all inputs
- Authorization middleware checks user_id ownership
- Business logic enforces review calculation rules
- Date math validated and tested

---

## Prisma Schema Reference

This data model translates to the following Prisma schema structure:

```prisma
model User {
  id              String  @id @default(cuid())
  provider        String  // "google" | "github"
  providerUserId  String
  email           String?
  displayName     String
  avatarUrl       String?
  collections     Collection[]
  tags            Tag[]
  notes           Note[]
  createdAt       DateTime @default(now()) @db.Timestamp(3)
  updatedAt       DateTime @updatedAt @db.Timestamp(3)
  @@unique([provider, providerUserId])
}

model Collection {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String
  notes     Note[]
  createdAt DateTime @default(now()) @db.Timestamp(3)
  updatedAt DateTime @updatedAt @db.Timestamp(3)
  @@unique([userId, name])
  @@index([userId])
}

model Tag {
  id        String     @id @default(cuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  name      String
  notes     NoteTag[]
  createdAt DateTime   @default(now()) @db.Timestamp(3)
  updatedAt DateTime   @updatedAt @db.Timestamp(3)
  @@unique([userId, name])
  @@index([userId])
}

model Note {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  collectionId    String
  collection      Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  title           String
  content         String    @db.Text
  sourceUrl       String?
  status          String    // "Active" | "Archived"
  reviewInterval  String    // "none" | "daily" | "weekly" | "monthly" | "custom"
  customDays      Int?
  nextReviewDate  DateTime? @db.Date
  lastReviewedDate DateTime? @db.Date
  tags            NoteTag[]
  createdAt       DateTime  @default(now()) @db.Timestamp(3)
  updatedAt       DateTime  @updatedAt @db.Timestamp(3)
  @@index([userId, nextReviewDate])
  @@index([userId, status])
  @@index([userId, collectionId])
  @@index([userId, updatedAt])
}

model NoteTag {
  id     String @id @default(cuid())
  noteId String
  note   Note   @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tagId  String
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@unique([noteId, tagId])
  @@index([noteId])
  @@index([tagId])
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-01 | Initial data model definition |

---

**Next**: Contract specifications for HTTP API and WebSocket protocol
