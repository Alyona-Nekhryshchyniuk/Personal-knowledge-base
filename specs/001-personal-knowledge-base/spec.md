# Personal Knowledge Base with Review Reminders — Product Specification

**Feature Name**: Personal Knowledge Base with Review Reminders  
**Status**: Initial Specification  
**Created**: 2026-10-01  
**Last Updated**: 2026-10-01

---

## Executive Summary

A full-stack web application that enables users to collect, organize, and intelligently review personal knowledge through notes, collections, and tags. Users authenticate exclusively via SSO (Google or GitHub) and maintain a private workspace where they manage notes with configurable review schedules and real-time review reminders delivered via WebSocket.

**Core User Value Proposition**: Capture knowledge once, organize it with flexible grouping (collections and tags), and receive timely reminders to review important material based on user-defined schedules.

---

## Business Context

### Problem Statement

Knowledge workers accumulate information from many sources—research, articles, learning materials, ideas, summaries—but struggle to organize it effectively and maintain an active practice of reviewing important notes. Without a system that combines search, flexible organization, and timely reminders, important knowledge fades and value is lost.

### Business Goals

1. Deliver a working MVP that demonstrates end-to-end spec-driven product implementation
2. Prove the feasibility of personal knowledge management with intelligent review scheduling
3. Provide users with a tool to capture, organize, and actively maintain their knowledge repository
4. Establish a clean, testable architecture using spec-driven development practices

### Success Metrics

* **User Adoption**: A user can onboard via SSO and create their first collection within 2 minutes
* **Knowledge Capture**: Users can create and tag notes with no friction (forms validate and provide instant feedback)
* **Active Review**: Users receive review reminders for 80% of notes with active review intervals
* **Data Privacy**: Zero unauthorized cross-user data access (verified by automated tests)
* **System Reliability**: All core workflows tested with 95%+ test pass rate
* **Documentation**: README sufficient for another developer to run the app without external help

---

## User Personas & Scenarios

### Persona 1: The Researcher

**Description**: A graduate student collecting research notes, articles, and insights from reading across multiple topics.

**Goals**:
* Quickly capture notes from research sessions
* Organize notes by research project (collections)
* Tag notes by topic, methodology, or source type
* Review notes periodically to reinforce learning and find connections

**Key Scenario**: Alice reads an academic paper, creates a note with the title, key points (content), and source URL. She assigns it to her "Research" collection and tags it "neural-networks" and "machine-learning". The next day, the app reminds her that the note is due for weekly review. She clicks "Mark as Reviewed" and the app schedules the next review for 7 days later.

### Persona 2: The Developer

**Description**: A software engineer accumulating code snippets, architecture patterns, and technical decisions from projects.

**Goals**:
* Archive obsolete technical notes without losing them entirely
* Quickly search notes by title or content when solving problems
* Move notes between collections as projects evolve
* Keep important patterns fresh through periodic review

**Key Scenario**: Bob creates a note with a useful design pattern from a past project. He archives it (not currently needed) but the app doesn't send review notifications. Later, when starting a new project, he remembers the pattern, searches for it by keyword, finds it, and restores it to active status. He then sets the review interval to "monthly" and receives the first reminder the next day.

### Persona 3: The Learner

**Description**: A student or professional learning new skills through courses, tutorials, and self-study.

**Goals**:
* Organize learning materials by course or topic
* Use review reminders to space out practice and reinforce memory
* Filter notes by review state to focus on due/overdue items
* See all unreviewed notes at a glance

**Key Scenario**: Carol takes an online course and creates notes for each module. She assigns them to the "Course" collection, tags by topic, and sets review intervals to "daily" for challenging concepts and "weekly" for reinforcement. She logs in each morning, sees notes due for today's review in the notification panel, and marks them as reviewed. The app recalculates next review dates, keeping her in an active learning rhythm.

---

## User Stories & Acceptance Scenarios

### Story 1: Authentication and Workspace Access

**As a** new user  
**I want to** sign in using my Google or GitHub account  
**So that** I can access my private knowledge workspace without managing passwords

**Acceptance Scenarios**:

1. **First-Time Google Sign-In**
   - User clicks "Continue with Google"
   - Browser redirects to Google OAuth provider
   - User authorizes the app
   - Backend creates a local user record with provider=google, provider_user_id, email, display_name, avatar_url
   - Browser redirects to dashboard
   - User's collection/note data is empty (no existing workspace)
   - **Verification**: POST /api/users shows user exists with correct provider and profile fields

2. **First-Time GitHub Sign-In**
   - User clicks "Continue with GitHub"
   - Browser redirects to GitHub OAuth provider
   - User authorizes the app
   - Backend creates a local user record even if GitHub doesn't provide email
   - User navigates to dashboard
   - Workspace is empty
   - **Verification**: POST /api/users shows user with provider=github, provider_user_id (email may be null)

3. **Returning User Persistence**
   - User signs in, then refreshes the page
   - Session persists (user remains logged in)
   - Dashboard loads with user's existing collections and notes
   - **Verification**: GET /api/auth/session returns authenticated user after page refresh

4. **Logout**
   - User clicks logout button in top-right profile area
   - Session is invalidated
   - Browser redirects to login screen
   - Subsequent page refresh shows login screen (not dashboard)
   - **Verification**: GET /api/auth/session returns unauthenticated after logout

---

### Story 2: Collection Management

**As a** user  
**I want to** create, rename, and delete collections  
**So that** I can group my notes by topic, project, or purpose

**Acceptance Scenarios**:

1. **Create Collection**
   - User opens collection management (sidebar + create button)
   - Enters name "Research"
   - Clicks "Save"
   - Collection appears in left sidebar
   - User can create a note inside the collection immediately
   - **Validation**: Name must be non-empty and unique per user
   - **Verification**: GET /api/collections returns new collection with correct name

2. **Rename Collection**
   - User clicks "Edit" on "Research" collection
   - Changes name to "Academic Research"
   - Saves changes
   - Sidebar updates immediately
   - Existing notes remain in the collection
   - **Validation**: New name must be unique per user, non-empty
   - **Verification**: GET /api/collections shows renamed collection

3. **Delete Collection — Cascade Behavior**
   - User has "Archive" collection with 3 notes
   - User clicks "Delete" on "Archive" collection
   - UI shows warning: "This will delete the collection and all [3] notes it contains. This action cannot be undone."
   - User confirms deletion
   - Collection and all notes are deleted from database
   - Sidebar updates (collection removed)
   - User cannot recover deleted notes
   - **Verification**: DELETE /api/collections/:id removes collection and cascades to notes

4. **Prevent Duplicate Collection Names**
   - User creates "Learning" collection
   - User tries to create another "Learning" collection in the same workspace
   - Backend returns error: "Collection name 'Learning' already exists in your workspace"
   - No duplicate is created
   - **Verification**: POST /api/collections with duplicate name returns 409 Conflict

---

### Story 3: Note Creation and Management

**As a** user  
**I want to** create, edit, archive, and delete notes  
**So that** I can build and maintain my knowledge base

**Acceptance Scenarios**:

1. **Create Note**
   - User clicks "New Note" button
   - Modal opens with form: Title, Content, Collection (dropdown), Tags (multi-select), Source URL (optional), Review Interval (dropdown: none, daily, weekly, monthly, custom)
   - User enters:
     - Title: "React Hooks Best Practices"
     - Content: "Use custom hooks for reusable logic. Avoid deep nesting..."
     - Collection: "Development"
     - Tags: [development, react]
     - Source URL: https://react.dev/reference/hooks
     - Review Interval: weekly
   - User clicks "Create"
   - Modal closes, note appears in main notes area
   - **Validation**: Title and Content must be non-empty; URL must be valid format if provided
   - **Verification**: GET /api/notes returns new note with all fields

2. **Edit Note**
   - User clicks on an existing note to open detail view
   - User clicks "Edit" button
   - Modal opens pre-filled with current note data
   - User changes Title and Content
   - User clicks "Save"
   - Detail view updates
   - Main list reflects updated title
   - **Verification**: PATCH /api/notes/:id updates fields correctly

3. **Archive Note**
   - User views a note detail
   - User clicks "Archive" button
   - Note status changes to Archived
   - Note is removed from main list (unless filter shows archived)
   - Note does NOT appear in review reminders
   - Archived notes can be restored
   - **Verification**: POST /api/notes/:id/archive sets status=Archived; note excludes from review notifications

4. **Restore Archived Note**
   - User filters to show "Archived" notes
   - User clicks "Restore" on an archived note
   - Status changes back to Active
   - Note reappears in main list
   - If note has a review interval, it becomes eligible for review reminders
   - **Verification**: POST /api/notes/:id/restore sets status=Active

5. **Delete Note**
   - User opens a note detail
   - User clicks "Delete"
   - Confirmation modal: "Delete this note? This cannot be undone."
   - User confirms
   - Note is permanently deleted
   - Main list updates
   - **Verification**: DELETE /api/notes/:id removes note from database

6. **Move Note Between Collections**
   - User opens a note detail in "Learning" collection
   - User clicks "Move to Collection" and selects "Development" from dropdown
   - Note is moved to "Development" collection
   - Detail view updates to show new collection
   - Main list updates (note may disappear if view is filtered by old collection)
   - **Verification**: PATCH /api/notes/:id with collection_id changes ownership

---

### Story 4: Tags

**As a** user  
**I want to** create, rename, and delete tags; assign and remove tags from notes  
**So that** I can label notes with flexible, searchable dimensions orthogonal to collections

**Acceptance Scenarios**:

1. **Create Tag**
   - User opens tag management panel
   - User enters tag name "important"
   - Clicks "Create"
   - Tag appears in tag list
   - User can now assign the tag to notes
   - **Validation**: Tag name must be non-empty and unique per user
   - **Verification**: GET /api/tags returns new tag

2. **Rename Tag**
   - User clicks "Edit" on tag "important"
   - Changes name to "high-priority"
   - Saves
   - Tag name updates throughout app
   - All notes previously tagged "important" are now tagged "high-priority"
   - **Validation**: New name must be unique per user
   - **Verification**: PATCH /api/tags/:id updates tag; all associated notes reflect change

3. **Delete Tag**
   - User deletes tag "obsolete"
   - Tag is removed
   - All notes previously tagged "obsolete" still exist, but tag is removed from them
   - No notes are deleted
   - **Verification**: DELETE /api/tags/:id removes tag but preserves notes; NoteTag join records deleted

4. **Assign Tags to Note**
   - User creates a note and selects tags from multi-select: [react, hooks, advanced]
   - Note is created with all three tags
   - User can later edit the note and add more tags or remove tags
   - **Verification**: Note.tags includes selected tag IDs; GET /api/notes/:id returns tags array

5. **Filter Notes by Tag**
   - User clicks filter "Tag: react"
   - Notes list updates to show only notes tagged "react"
   - User can combine filters: "Tag: react AND Collection: Development"
   - Results update in real-time
   - **Verification**: GET /api/notes?tags=<tagId> filters correctly

---

### Story 5: Review Reminders and Review Scheduling

**As a** user  
**I want to** configure review intervals for notes and receive reminders to review them at the right time  
**So that** I can actively maintain my knowledge through spaced repetition

**Acceptance Scenarios**:

1. **Set Review Interval on Note Creation**
   - User creates a note with Review Interval = "weekly"
   - next_review_date is set to today + 7 days (UTC)
   - last_reviewed_date is null
   - **Verification**: Note stored with review_interval=weekly, next_review_date calculated correctly

2. **Custom Review Interval**
   - User creates a note with Review Interval = "custom" and Custom Days = 14
   - next_review_date is set to today + 14 days
   - **Validation**: Custom days must be > 0
   - **Verification**: Note stored with review_interval=custom, custom_days=14, next_review_date calculated

3. **Mark Note as Reviewed**
   - User views a note with next_review_date = today
   - User clicks "Mark as Reviewed"
   - last_reviewed_date is set to today (UTC)
   - next_review_date is recalculated:
     - If daily: today + 1
     - If weekly: today + 7
     - If monthly: today + 1 calendar month
     - If custom: today + custom_days
   - Review state indicator in list updates (no longer "Due Today")
   - **Verification**: POST /api/notes/:id/review updates dates; next calculation is correct

4. **No Review Schedule Behavior**
   - User creates note with Review Interval = "none"
   - Note never appears in review reminders
   - next_review_date remains null
   - Filter "Review State: Due Today" does not include this note
   - **Verification**: Notes with review_interval=none excluded from review queries

5. **Archived Notes Don't Generate Reminders**
   - User creates active note with Review Interval = "daily" and next_review_date = today
   - Note appears in review notifications
   - User archives the note
   - Notifications stop (no more reminders for this note)
   - User restores note
   - Reminders resume
   - **Verification**: Archived notes excluded from review notification query

---

### Story 6: Search and Filtering

**As a** user  
**I want to** search and filter notes by various criteria  
**So that** I can quickly find information and focus on high-priority items

**Acceptance Scenarios**:

1. **Search by Title**
   - User enters "React" in search box
   - Notes list updates to show only notes with "React" in title (case-insensitive)
   - Example: "React Hooks Best Practices" matches; "hooks best practices" does not
   - Empty search clears the filter
   - **Verification**: GET /api/notes?search=React filters by title (case-insensitive)

2. **Search by Content**
   - User enters "custom hooks" in search box
   - Notes list shows notes containing "custom hooks" in the content body
   - Example: Content "Use custom hooks for reusable logic" matches
   - **Verification**: GET /api/notes?search=custom+hooks searches content field

3. **Search by Source URL**
   - User enters "react.dev" in search box
   - Notes list shows notes with "react.dev" in the source URL
   - **Verification**: GET /api/notes?search=react.dev searches source_url field

4. **Filter by Collection**
   - User clicks filter "Collection: Development"
   - Notes list shows only notes in Development collection
   - User can combine with search
   - **Verification**: GET /api/notes?collection=<collectionId> filters correctly

5. **Filter by Tag**
   - User clicks filter "Tag: important"
   - Notes list shows only notes with "important" tag
   - User can select multiple tags (AND logic if combined)
   - **Verification**: GET /api/notes?tags=<tagId1>,<tagId2> filters correctly

6. **Filter by Status**
   - User clicks filter "Status: Active"
   - Only active notes appear (archived notes hidden)
   - User clicks filter "Status: Archived"
   - Only archived notes appear
   - **Verification**: GET /api/notes?status=active|archived filters correctly

7. **Filter by Review State**
   - User clicks filter "Review: Due Today"
   - Shows notes with next_review_date=today AND status=Active AND review_interval!=none
   - User clicks "Review: Overdue"
   - Shows notes with next_review_date < today AND status=Active AND review_interval!=none
   - User clicks "Review: Next 7 Days"
   - Shows notes with next_review_date between today+1 and today+7 AND status=Active AND review_interval!=none
   - User clicks "Review: No Schedule"
   - Shows notes with review_interval=none
   - **Verification**: Review state filters calculate dates correctly (UTC-based)

8. **Empty Search Results**
   - User searches for "xyz123" (no matches)
   - Notes list shows empty state: "No notes match your search. Try adjusting your filters or search terms."
   - **Verification**: UI displays clear empty state message

---

### Story 7: Real-Time Review Reminders via WebSocket

**As a** user  
**I want to** receive real-time notifications when notes are due or overdue for review  
**So that** I stay engaged with my review schedule without checking manually

**Acceptance Scenarios**:

1. **WebSocket Connection and Initial Notification**
   - User logs into dashboard
   - Browser opens WebSocket connection to wss://localhost:3000/api/ws
   - Connection authenticates using session token
   - Server sends initial batch of notifications:
     - All notes with next_review_date <= today AND status=Active AND review_interval!=none
     - Each notification includes: notificationId, note ID, title, collection name, next_review_date, overdue status
   - Notifications appear in UI notification panel
   - **Verification**: WebSocket auth succeeds; initial batch sent; UI receives and displays

2. **Periodic Review Check**
   - WebSocket connection remains open
   - Server checks for new due/overdue notes every 5 minutes
   - If new notes are now due, server sends notification
   - If previously sent note is no longer due (user marked as reviewed), notification is removed
   - **Verification**: New notifications appear; old ones are cleared; interval is 5 min (configurable)

3. **Archived Notes Excluded**
   - User has note A: Active, due today → notification appears
   - User archives note A
   - Notification is immediately removed (server re-checks on archive action)
   - No notification is sent for archived notes
   - **Verification**: Archived notes never sent in notifications

4. **Unscheduled Notes Excluded**
   - User has note B: Review Interval = none
   - Note B never appears in notifications
   - **Verification**: Notes with review_interval=none excluded from notification query

5. **Client → Server Message: Subscribe**
   - User opens dashboard
   - Client sends WebSocket message: `{ "type": "subscribe", "payload": {} }`
   - Server receives message and responds with fresh notification batch
   - (This allows client to refresh notifications on demand)
   - **Verification**: Client sends subscribe message; server responds with notification list

6. **Duplicate Prevention**
   - User marks note X as reviewed
   - Server recalculates next_review_date (now in future)
   - Server detects notification already sent for note X in current session
   - Server does not re-send same notification
   - (Implementation detail: server tracks sent notification hashes or client-side deduplication)
   - **Verification**: Same notification not repeated without user action

7. **Notification Panel UI**
   - Notifications appear as toasts or in a persistent notification panel
   - Each notification shows: note title, collection, next_review_date, due/overdue badge
   - User can click a notification to view the note detail
   - User can dismiss a notification
   - **Verification**: UI displays useful information; interactions work

8. **WebSocket Disconnection and Reconnection**
   - User's network drops (WebSocket closes)
   - UI shows "Reconnecting..." message
   - Browser attempts to reconnect
   - On reconnection, server sends fresh notification batch
   - Notifications resume
   - **Verification**: Graceful reconnection; notifications restored

---

## Functional Requirements

### FR-1: Authentication via SSO

* The application MUST support Google OAuth 2.0 and GitHub OAuth
* On first successful authentication, the backend MUST create a user record automatically
* User profile MUST include: provider, provider_user_id, email (if provided), display_name, avatar_url
* GitHub may not provide email; identity MUST rely on provider + provider_user_id, not email alone
* Session MUST persist across browser refresh
* Logout MUST invalidate the session
* Google and GitHub accounts are separate (no account linking required)

### FR-2: Collections

* User can create, rename, and delete collections
* Collection name MUST be unique per user
* Deleting a collection MUST cascade-delete all notes in that collection (per constitution)
* Collection deletion MUST show a warning modal confirming the action
* User can have unlimited collections
* Collections appear in left sidebar

### FR-3: Tags

* User can create, rename, and delete tags
* Tag name MUST be unique per user
* Deleting a tag MUST remove it from associated notes but NOT delete the notes
* User can assign multiple tags to a note
* User can remove tags from notes
* Tags appear as selectable multi-choice in note edit form

### FR-4: Notes

* A note belongs to exactly one user
* A note belongs to exactly one collection
* A note may have zero or more tags
* Note fields: title, content, collection_id, tags[], source_url (optional), status (Active/Archived), review_interval, custom_days (if review_interval=custom), next_review_date, last_reviewed_date, created_at, updated_at

**Note Operations**:
* Create: All fields except created_at, updated_at, last_reviewed_date
* Edit: All user-modifiable fields (title, content, collection_id, tags, source_url, review_interval, custom_days)
* Archive: Set status=Archived (note excluded from review reminders)
* Restore: Set status=Active (note becomes eligible for reminders if review_interval!=none)
* Delete: Permanent removal
* Move: Change collection_id
* Mark as Reviewed: Set last_reviewed_date=today, recalculate next_review_date

**Validation**:
* Title and content MUST be non-empty
* source_url MUST be valid URL format if provided
* custom_days MUST be > 0 when review_interval=custom
* Review interval must be one of: none, daily, weekly, monthly, or custom

### FR-5: Review Intervals and Scheduling

* Review interval values: none, daily, weekly, monthly, custom (N days)
* A note is **due** when: next_review_date <= today AND status=Active AND review_interval!=none
* A note is **overdue** when: next_review_date < today AND status=Active AND review_interval!=none
* When marking a note as reviewed:
  - last_reviewed_date = today (UTC)
  - next_review_date recalculated:
    - daily → today + 1 day
    - weekly → today + 7 days
    - monthly → today + 1 calendar month (handles Feb 30 edge case)
    - custom → today + custom_days days
* Archived notes MUST NOT generate reminders
* Notes with review_interval=none MUST NOT generate reminders
* "Today" is defined as midnight UTC to 23:59:59 UTC

### FR-6: Search

* Search by title (case-insensitive substring match)
* Search by content (case-insensitive substring match)
* Search by source_url (case-insensitive substring match)
* Search combines with filters (AND logic)
* Empty search results show clear empty state

### FR-7: Filters

* Filter by collection
* Filter by tag (single or multiple; AND logic if multiple)
* Filter by status (Active, Archived)
* Filter by review state: Due Today, Overdue, Next 7 Days, No Schedule, All
* Filters are cumulative (AND logic)
* Clear filters button to reset all

### FR-8: WebSocket Notifications

**Server → Client**:
* Server sends notifications for notes due today or overdue
* On connection: Send initial batch of all currently due/overdue notes
* Periodically (every 5 minutes): Check for newly due notes and send
* Notification payload: { type, note_id, title, collection_name, next_review_date, overdue_status }
* Archive or restore a note: Server re-checks and updates notifications immediately

**Client → Server**:
* Client sends: { type: "subscribe", payload: {} }
* Server responds with fresh notification batch
* Message affects server behavior (forces re-check and refresh)

**Deduplication**:
* Server tracks sent notifications; does not re-send same notification without change
* (Or client-side deduplication: track hashes, compare incoming notifications)

**UI**:
* Notifications appear as toasts or in persistent notification panel
* Each notification clickable to view note detail
* Dismiss capability
* Reconnection logic: graceful reconnect + refresh notifications

### FR-9: Authorization

* Every HTTP operation MUST verify user ownership of collections, tags, notes
* A client-supplied user_id MUST NEVER determine resource ownership; rely on session
* WebSocket connections MUST authenticate and authorize
* A user MUST NEVER receive another user's data or notifications
* Unauthorized access MUST return 403 Forbidden

### FR-10: Validation and Error Handling

* Invalid inputs MUST return 400 Bad Request with clear error message
* Missing required fields MUST return 400 Bad Request
* Duplicate names MUST return 409 Conflict
* Unauthorized access MUST return 403 Forbidden
* Not found MUST return 404 Not Found
* UI MUST display client-side validation feedback (red borders, error text)
* UI MUST display server error messages to user

### FR-11: Data Persistence

* All data stored in PostgreSQL
* Prisma ORM used for all database operations
* All timestamps stored as UTC ISO 8601 strings
* Cascade delete for collections → notes, notes → note_tags
* Foreign keys enforced at database level
* Indexes on user_id, collection_id, tags, review_date for performance

---

## Non-Functional Requirements

### NFR-1: Timezone Handling

* Server uses UTC for all date calculations
* "Today" is defined as midnight UTC to 23:59:59 UTC
* Clients display dates in browser local time (for presentation only)
* Server-side review eligibility never changes based on client timezone

### NFR-2: Performance

* Notes list should load in < 2 seconds for typical user (100-1000 notes)
* Search should return results in < 1 second
* WebSocket notifications should be delivered within 5 minutes of becoming due
* Database queries should be indexed for user_id, collection_id, and common filters

### NFR-3: Responsive Design

* Sidebar collapses into hamburger menu on screens < 768px
* Collections move into dropdown on mobile
* Notes cards stack vertically on mobile
* All controls remain usable on screens as small as 320px

### NFR-4: UI Quality

* Consistent spacing and typography across screens
* Visible hover states for interactive elements
* Visible focus states for keyboard navigation
* Clear empty states for no collections, no notes, no tags, no search results, no reminders
* At least one loading state visible on main screen
* Client-side validation feedback for forms (red borders, error messages)
* Light theme only (no dark mode required)

### NFR-5: Accessibility

* Semantic HTML
* ARIA labels where appropriate
* Keyboard navigation support
* Focus management for modals
* Color contrast meets WCAG AA standard

### NFR-6: Security

* OAuth secrets stored in environment variables (not committed to repo)
* CORS configured for frontend origin only
* Session tokens signed and validated
* WebSocket connections authenticated via session token
* Database connection string stored in environment variables
* Input validation on all API endpoints
* SQL injection prevented via parameterized queries (Prisma)

### NFR-7: Local Development

* Application runnable on local machine with documented commands
* PostgreSQL can be run via Docker Compose or local installation
* Seed data available for testing
* Environment variables documented in .env.example
* All tests runnable locally
* No external service calls in tests (mocked)

---

## Key Entities and Data Model

### Entity: User

* id (UUID)
* provider (enum: google, github)
* provider_user_id (string, unique per provider)
* email (string, nullable)
* display_name (string)
* avatar_url (string, nullable)
* created_at (timestamp UTC)
* **Unique constraint**: (provider, provider_user_id)

### Entity: Collection

* id (UUID)
* user_id (UUID, foreign key → User)
* name (string)
* created_at (timestamp UTC)
* updated_at (timestamp UTC)
* **Unique constraint**: (user_id, name)
* **Index**: user_id

### Entity: Tag

* id (UUID)
* user_id (UUID, foreign key → User)
* name (string)
* created_at (timestamp UTC)
* updated_at (timestamp UTC)
* **Unique constraint**: (user_id, name)
* **Index**: user_id

### Entity: Note

* id (UUID)
* user_id (UUID, foreign key → User)
* collection_id (UUID, foreign key → Collection)
* title (string)
* content (string)
* source_url (string, nullable)
* status (enum: Active, Archived)
* review_interval (enum: none, daily, weekly, monthly, custom)
* custom_days (integer, nullable, >= 1 if review_interval=custom)
* next_review_date (date, nullable)
* last_reviewed_date (date, nullable)
* created_at (timestamp UTC)
* updated_at (timestamp UTC)
* **Foreign key constraint**: user_id + collection_id enforced (user owns collection)
* **Index**: (user_id, collection_id), (user_id, next_review_date), (user_id, status)

### Entity: NoteTag

* id (UUID)
* note_id (UUID, foreign key → Note)
* tag_id (UUID, foreign key → Tag)
* **Unique constraint**: (note_id, tag_id)
* **Foreign key constraint**: Both note and tag must belong to same user
* **Cascade delete**: Deleting a tag removes all NoteTag records; deleting a note removes all NoteTag records

### Entity: NotificationLog (optional, if server-side deduplication needed)

* id (UUID)
* user_id (UUID)
* note_id (UUID)
* notification_hash (string)
* sent_at (timestamp UTC)
* **Purpose**: Track which notifications were sent to avoid duplicates

---

## Acceptance Criteria

### AC-1: Authentication

- [ ] User can sign in with Google OAuth
- [ ] User can sign in with GitHub OAuth
- [ ] Local user record is created automatically on first sign-in
- [ ] User profile includes provider, provider_user_id, email (if provided), display_name, avatar_url
- [ ] Authentication persists across page refresh
- [ ] User can log out and session is invalidated
- [ ] OAuth tests use mocks (no live network calls)

### AC-2: Collections

- [ ] User can create a collection
- [ ] User can rename a collection
- [ ] User can delete a collection (with cascade delete of notes)
- [ ] Collection names are unique per user
- [ ] Deletion shows warning modal with note count
- [ ] Collections appear in left sidebar

### AC-3: Tags

- [ ] User can create a tag
- [ ] User can rename a tag
- [ ] User can delete a tag (notes remain, tag removed)
- [ ] Tag names are unique per user
- [ ] User can assign tags to notes
- [ ] User can remove tags from notes
- [ ] Multiple tags can be assigned to one note

### AC-4: Notes

- [ ] User can create a note with title, content, collection, tags, source URL (optional), review interval
- [ ] User can edit any note field
- [ ] User can archive a note (status=Archived, no review reminders)
- [ ] User can restore an archived note
- [ ] User can delete a note
- [ ] User can move a note to another collection
- [ ] Title and content validation (non-empty)
- [ ] Source URL validation (valid format if provided)
- [ ] Custom review days validation (> 0)

### AC-5: Review Scheduling

- [ ] User can set review interval: none, daily, weekly, monthly, custom
- [ ] next_review_date is calculated correctly on note creation
- [ ] User can mark note as reviewed
- [ ] next_review_date is recalculated correctly after review
- [ ] last_reviewed_date is set to today after review
- [ ] Archived notes do not generate review reminders
- [ ] Notes with review_interval=none do not generate review reminders
- [ ] Monthly calculation uses calendar month semantics (handles edge cases)

### AC-6: Search and Filters

- [ ] User can search by title
- [ ] User can search by content
- [ ] User can search by source URL
- [ ] User can filter by collection
- [ ] User can filter by tag(s)
- [ ] User can filter by status (Active, Archived)
- [ ] User can filter by review state (Due Today, Overdue, Next 7 Days, No Schedule)
- [ ] Filters combine with AND logic
- [ ] Empty search result shows clear empty state

### AC-7: WebSocket and Real-Time Notifications

- [ ] WebSocket connection authenticates via session token
- [ ] Server sends initial notification batch on connection
- [ ] Server sends new notifications for notes that become due every 5 minutes
- [ ] Archived notes never appear in notifications
- [ ] Unscheduled notes never appear in notifications
- [ ] Client can send subscribe message that triggers server refresh
- [ ] Notifications appear in UI (toast or panel)
- [ ] Notification includes note title, collection, next_review_date, due/overdue status
- [ ] Duplicate notifications are prevented
- [ ] Reconnection logic works gracefully

### AC-8: Authorization and Data Privacy

- [ ] User cannot access another user's collections
- [ ] User cannot access another user's tags
- [ ] User cannot access another user's notes
- [ ] User cannot access another user's review reminders
- [ ] User cannot access another user's WebSocket notifications
- [ ] Unauthorized access returns 403 Forbidden
- [ ] Client-supplied user_id never overrides session identity

### AC-9: UI/UX

- [ ] Authentication screen has "Continue with Google" and "Continue with GitHub" buttons
- [ ] Dashboard layout includes left sidebar (collections) and main area (notes)
- [ ] Search input and filter controls visible
- [ ] User profile area visible with logout option
- [ ] Notes view shows title, collection, tags, review state, next_review_date, archived status
- [ ] Note create/edit UI (modal or drawer) works with form validation
- [ ] Collection management UI accessible
- [ ] Tag management UI accessible
- [ ] Note detail view shows all fields + "Mark as Reviewed" action
- [ ] Real-time notifications visible
- [ ] Responsive on narrow screens (sidebar collapses, collections dropdown, cards stack)
- [ ] Consistent spacing and typography
- [ ] Visible hover and focus states
- [ ] Clear empty states (collections, notes, tags, search results, reminders)
- [ ] At least one loading state visible
- [ ] Client-side validation feedback for forms
- [ ] Basic error handling visible in UI
- [ ] Light theme only

### AC-10: Backend API

- [ ] HTTP API provides endpoints for all UI flows
- [ ] All protected endpoints require authentication
- [ ] User-owned resources are scoped to authenticated user
- [ ] Request validation returns 400 Bad Request for invalid inputs
- [ ] Duplicate names return 409 Conflict
- [ ] Authorization checked for every user-owned resource operation
- [ ] WebSocket endpoint authenticates and authorizes
- [ ] Error responses include clear, useful messages

### AC-11: Data Persistence

- [ ] All data persisted in PostgreSQL
- [ ] Prisma used as ORM
- [ ] Migrations version controlled
- [ ] Foreign keys enforce referential integrity
- [ ] Unique constraints prevent duplicates
- [ ] Indexes exist for common queries
- [ ] Cascade delete works correctly (collection → notes, notes → tags)
- [ ] All timestamps stored as UTC

### AC-12: Testing

- [ ] SSO login tested (mocked OAuth responses)
- [ ] User creation tested
- [ ] Collection CRUD tested
- [ ] Note CRUD tested
- [ ] Tag CRUD tested
- [ ] Review date calculation tested
- [ ] Cross-user authorization tested
- [ ] Archived note behavior tested
- [ ] WebSocket connection and notifications tested
- [ ] WebSocket client → server message tested
- [ ] All tests pass locally
- [ ] Tests do not depend on live OAuth or external services

### AC-13: Documentation

- [ ] README includes project overview
- [ ] README documents tech stack
- [ ] README documents spec-driven workflow
- [ ] README lists specification file locations
- [ ] README explains how specs guided implementation
- [ ] README includes local setup commands (backend, frontend, database, tests)
- [ ] README documents required environment variables
- [ ] README documents OAuth credential setup
- [ ] README includes API overview
- [ ] README documents WebSocket protocol
- [ ] README documents review reminder rules
- [ ] README documents collection deletion behavior
- [ ] README documents timezone handling
- [ ] README documents sample data instructions
- [ ] README lists known limitations
- [ ] Specification artifacts in repository with requirements → tests mapping
- [ ] Another developer can run the app from README without guessing

---

## Assumptions

1. **Timezone**: All dates stored and calculated in UTC; "today" is midnight UTC to 23:59:59 UTC
2. **Collection Deletion**: Cascade delete all notes when a collection is deleted (per project constitution)
3. **Search Matching**: Basic case-insensitive substring matching (not full-text search or fuzzy)
4. **Review Calculation**: Month-based calculation handles edge cases (Feb 30 → Mar 2, etc.)
5. **Email Reliability**: GitHub may not provide email; identity based on provider + provider_user_id
6. **WebSocket Interval**: 5 minutes default for periodic review checks (configurable via environment)
7. **Account Linking**: Not implemented; same person signing in with Google and GitHub are separate accounts
8. **Notification Deduplication**: Handled either server-side (tracking sent notifications) or client-side (hash comparison)
9. **Session Persistence**: next-auth default session handling; session survives page refresh
10. **Database**: PostgreSQL assumed; Prisma ORM abstracts SQL details
11. **Soft Deletion**: Not used; hard deletion only (per constitution)
12. **Pagination**: Notes list paginated (default 20 per page) to avoid large response bodies
13. **Performance Target**: Notes list loads in < 2 seconds for typical user; search < 1 second
14. **UI Framework**: Material UI 5 with Emotion styling (per technology baseline)
15. **Testing Framework**: Jest with React Testing Library (per technology baseline)

---

## Known Constraints & Limitations

1. **No Account Linking**: Google and GitHub sign-ins are separate accounts. A user who signs in with both will have two separate accounts in the database.
2. **No Collaboration**: No sharing, team workspaces, or public links. All workspaces are personal and private.
3. **No Full-Text Search**: Search is basic substring matching, not indexed full-text search.
4. **No Rich Text**: Notes support plain text or Markdown-style content, not WYSIWYG editing.
5. **No Offline Mode**: Application requires active internet connection. No offline-first sync.
6. **No Email Reminders**: Only WebSocket-based in-app notifications. No email digests.
7. **No Bulk Operations**: No batch import/export or bulk edit. Operations are note-by-note.
8. **No Mobile Apps**: Web-only; responsive but not native mobile applications.
9. **No Cloud Deployment in MVP**: Local development and testing only. Cloud deployment is outside scope.
10. **No Multi-Workspace**: Each user has one workspace. No switch between workspaces.
11. **Single Deletion Approach**: Collections use cascade delete; no "move to uncategorized" option.

---

## Success Criteria

### Technical Success

* All automated tests pass (95%+ pass rate)
* All core user workflows tested
* Cross-user authorization enforced and verified
* WebSocket notifications delivered correctly
* Review calculations accurate (including edge cases)
* Performance targets met (< 2 sec for notes list, < 1 sec for search)
* Zero unauthorized cross-user data access

### User Success

* New user can onboard and create first collection in < 2 minutes
* Notes can be created with validation feedback in real-time
* Review reminders arrive on schedule and are useful
* Archived notes behavior is clear and prevents accidental review
* Search and filters produce expected results
* UI is responsive on mobile and desktop

### Documentation Success

* README sufficient for another developer to run without external help
* Specification artifacts clearly document requirements and design
* Test mapping shows traceability between requirements and tests
* Change log documents spec evolution with rationale

---

## Out of Scope (Explicitly)

* Collaboration or sharing of any kind
* Account linking between Google and GitHub
* Full-text search or search ranking
* Rich-text editing or WYSIWYG
* Email reminders or digest notifications
* Native mobile applications
* Offline-first synchronization
* Bulk import/export
* Multi-workspace support
* Cloud deployment
* Dark mode
* Custom branding or themes
* Analytics or usage tracking
* API rate limiting or quotas
* Two-factor authentication
* Password recovery flows (SSO only)
* Admin panels or user management
* Payment or licensing

---

## Next Steps

1. **Review & Approval**: Stakeholder review of this specification
2. **Clarification (if needed)**: Address any [NEEDS CLARIFICATION] markers through `/speckit-clarify`
3. **Domain Model**: Create detailed domain model specification
4. **API Contract**: Design API endpoints and WebSocket protocol
5. **Implementation Plan**: Break down into implementation phases
6. **Test Mapping**: Map acceptance criteria to automated tests
7. **Implementation**: Build frontend, backend, database, tests
8. **Spec Evolution**: Document any changes discovered during implementation

---

**Specification Status**: READY FOR REVIEW  
**Version**: 1.0.0  
**Created**: 2026-10-01  
**Owner**: Product Team / Claude Code
