# Quickstart Validation Guide

**Version**: 1.0.0  
**Created**: 2026-10-01  
**Purpose**: Runnable validation scenarios demonstrating end-to-end feature functionality

---

## Overview

This guide provides step-by-step instructions to validate that the Personal Knowledge Base with Review Reminders MVP works as specified. Each scenario exercises core user workflows and verifies key system behaviors.

---

## Prerequisites

- **PostgreSQL**: Running locally or via Docker Compose
- **Node.js**: 18+ installed
- **npm**: 9+ installed
- **Environment Variables**: `.env.local` configured with:
  - `DATABASE_URL=postgresql://user:password@localhost:5432/pkb_dev`
  - `NEXTAUTH_SECRET=<dev-secret>`
  - `NEXTAUTH_URL=http://localhost:3000`
  - `GOOGLE_CLIENT_ID=<oauth-client-id>`
  - `GOOGLE_CLIENT_SECRET=<oauth-secret>`
  - `GITHUB_CLIENT_ID=<oauth-client-id>`
  - `GITHUB_CLIENT_SECRET=<oauth-secret>`

---

## Setup

### 1. Database Setup

```bash
# Create database
npm run db:migrate

# Seed sample data (optional, for manual testing)
npm run db:seed
```

### 2. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

### 3. Run Tests (Automated Validation)

```bash
npm run test
```

Tests validate all acceptance criteria automatically.

---

## Manual Validation Scenarios

Run these scenarios manually to verify UI/UX and user workflows work as expected.

### Scenario 1: Authentication — Google Sign-In

**Objective**: Verify Google OAuth sign-in creates user and persists session

**Steps**:

1. Open `http://localhost:3000` in browser
2. Click "Continue with Google" button
3. Authorize app in Google OAuth dialog
4. Verify redirect to dashboard (blank collections/notes view)
5. Refresh page (F5)
6. Verify still logged in (user profile visible in top-right)
7. Click logout in profile menu
8. Verify redirect to login screen
9. Refresh page
10. Verify login screen shown (not dashboard)

**Expected Result**: ✅ User session persists across refresh; logout clears session

**Verification**:
- User record created in database: `SELECT * FROM "User" WHERE provider='google'`
- Session cookie present: DevTools → Application → Cookies

---

### Scenario 2: Collections — Create, Rename, Delete

**Objective**: Verify collection CRUD with unique name validation and cascade delete

**Steps**:

1. Log in (use test account or Google sign-in)
2. In sidebar, click "New Collection" button
3. Enter name "Research"
4. Click "Create"
5. Verify "Research" appears in sidebar
6. Click "Edit" on "Research" collection
7. Rename to "Academic Research"
8. Click "Save"
9. Verify sidebar updated
10. Click "Delete" on "Academic Research"
11. Warning modal shows: "This will delete the collection and all [0] notes it contains"
12. Click "Confirm Delete"
13. Verify collection removed from sidebar

**Expected Result**: ✅ Collection CRUD works; unique name validation active

**Verification**:
- Database: `SELECT * FROM "Collection" WHERE "userId"='<user-id>'`

---

### Scenario 3: Notes — Create with Review Interval

**Objective**: Verify note creation with review scheduling calculates next_review_date correctly

**Steps**:

1. Create "Learning" collection (see Scenario 2)
2. Click "New Note" in main area
3. Fill form:
   - Title: "React Hooks"
   - Content: "Use custom hooks for reusable logic..."
   - Collection: "Learning"
   - Tags: Create and select "react", "important"
   - Source URL: `https://react.dev/reference/hooks`
   - Review Interval: "weekly"
4. Click "Create"
5. Verify note appears in notes list
6. Click note to open detail view
7. Verify all fields populated correctly
8. Verify next_review_date shown (today + 7 days)

**Expected Result**: ✅ Note created with correct next_review_date calculation

**Verification**:
- Database: `SELECT "nextReviewDate" FROM "Note" WHERE title='React Hooks'`
- Should be: today + 7 days in UTC date format

---

### Scenario 4: Review Reminder — Mark as Reviewed

**Objective**: Verify review action recalculates next_review_date

**Steps**:

1. In note detail view, verify next_review_date (e.g., "2026-10-08")
2. Click "Mark as Reviewed" button
3. Verify last_reviewed_date set to today
4. Verify next_review_date recalculated (should now be today + 7 days from now)
5. Example: if marked on Oct 2, next date should be Oct 9

**Expected Result**: ✅ Dates calculated correctly; last_reviewed_date updated

**Verification**:
- Database: Check that `lastReviewedDate = today` and `nextReviewDate = today + interval`

---

### Scenario 5: Search & Filter

**Objective**: Verify search by title/content and filters by collection/status/review state

**Steps**:

1. Create 3+ notes in different collections with different statuses and review states
2. In main notes view, type "React" in search box
3. Verify only notes with "React" in title/content shown
4. Clear search box
5. Click filter "Collection: Learning"
6. Verify only Learning collection notes shown
7. Click filter "Status: Archived" (if any archived notes exist)
8. Verify archived notes shown
9. Click filter "Review: Due Today"
10. Verify only notes with nextReviewDate <= today shown

**Expected Result**: ✅ Search and filters work independently and combined

**Verification**:
- API: `GET /api/notes?search=React&collection=<id>&reviewState=due`
- Returns only matching notes

---

### Scenario 6: Archive & Restore

**Objective**: Verify archived notes exclude from reminders but can be restored

**Steps**:

1. Create note with review_interval="daily"
2. Note appears in main notes list
3. Click "Archive" button on note
4. Verify note disappears from main list
5. Filter "Status: Archived" to show archived notes
6. Click "Restore" on archived note
7. Verify note reappears in active list
8. Verify next_review_date preserved (not recalculated)

**Expected Result**: ✅ Archived notes hidden; restore maintains original dates

**Verification**:
- Archived notes not returned in: `GET /api/notes?status=active`
- Archived notes returned in: `GET /api/notes?status=archived`

---

### Scenario 7: WebSocket Notifications — Initial Batch

**Objective**: Verify WebSocket connection sends initial notification batch

**Steps**:

1. Create note with nextReviewDate = today and review_interval="daily"
2. Open browser DevTools → Network → WS
3. Log out and log in again (fresh WebSocket connection)
4. Verify WebSocket connection to `ws://localhost:3000/api/ws`
5. In WS frames, verify `connection_established` message received
6. Verify `review_reminder` message received with notification for today's due note
7. Notification payload includes: noteId, title, collection, nextReviewDate, dueToday=true

**Expected Result**: ✅ WebSocket sends initial batch on connection

**Verification**:
- DevTools WS frames show message types and payloads
- Notifications include correct note data

---

### Scenario 8: WebSocket Periodic Checks

**Objective**: Verify server sends notifications for newly due notes

**Steps**:

1. Create note with nextReviewDate = tomorrow and review_interval="daily"
2. Verify no notification for tomorrow's date in initial batch
3. Wait 5+ minutes (or set `WS_CHECK_INTERVAL` shorter for testing)
4. Verify no new notification sent (date not due yet)
5. Create new note with nextReviewDate = today and review_interval="daily"
6. After ~5 minutes (or check interval), verify new notification sent in WS frames

**Expected Result**: ✅ Server checks periodically and sends notifications for newly due notes

**Verification**:
- DevTools WS frames show new `review_reminder` message
- Notification includes new note's ID

---

### Scenario 9: WebSocket Reconnection

**Objective**: Verify graceful reconnection after network loss

**Steps**:

1. Log in and view notes (WebSocket connected)
2. In DevTools → Network, find WS connection and throttle (simulate poor network)
3. Disconnect network in DevTools or unplug network cable
4. Wait 5 seconds
5. Restore network
6. Verify "Reconnecting..." message appears in UI
7. Verify WebSocket reconnects
8. Verify fresh notification batch sent after reconnection
9. Verify notifications display in UI

**Expected Result**: ✅ App handles disconnection gracefully and reconnects

**Verification**:
- UI shows "Reconnecting..." message temporarily
- WebSocket reconnects and resumes notifications

---

### Scenario 10: Authorization — Cross-User Data Isolation

**Objective**: Verify users cannot access each other's data

**Steps**:

1. Log in as User A (e.g., Google OAuth)
2. Create collection "Private"
3. Create note in "Private" collection
4. Note note ID: `note-id-a`
5. Log out
6. Log in as User B (different Google account or GitHub)
7. In browser DevTools → Console, try:
   ```javascript
   fetch('/api/notes/note-id-a')
   ```
8. Verify 403 Forbidden error (or 404 Not Found)
9. Verify User B cannot see User A's notes in list

**Expected Result**: ✅ Users cannot access each other's data; authorization enforced

**Verification**:
- API returns 403 Forbidden or 404 Not Found for cross-user access
- Database confirms note belongs to User A: `SELECT "userId" FROM "Note" WHERE id='note-id-a'`

---

## Automated Test Validation

Run the automated test suite to validate all requirements:

```bash
npm run test
```

**Test Coverage**:
- ✅ SSO login (mocked OAuth)
- ✅ User creation on first sign-in
- ✅ Collection CRUD + cascade delete
- ✅ Tag CRUD + assignment/removal
- ✅ Note CRUD + archive/restore + review
- ✅ Review date calculation (daily, weekly, monthly, custom)
- ✅ Search and filters
- ✅ WebSocket connection and notifications
- ✅ Cross-user authorization
- ✅ Archived note exclusion from notifications
- ✅ Validation errors (empty title, invalid URL, etc.)

**Test Files**:
- `tests/unit/dates.test.ts` — Review calculation logic
- `tests/unit/validation.test.ts` — Input validation
- `tests/integration/auth.test.ts` — SSO and session
- `tests/integration/collections.test.ts` — Collection operations
- `tests/integration/notes.test.ts` — Note operations
- `tests/integration/tags.test.ts` — Tag operations
- `tests/integration/websocket.test.ts` — WebSocket protocol
- `tests/e2e/happy-path.test.ts` — Full user workflow

---

## Acceptance Criteria Checklist

Use this checklist to verify all requirements are met:

### Authentication
- [ ] User can sign in with Google
- [ ] User can sign in with GitHub
- [ ] User record created automatically on first sign-in
- [ ] Session persists across page refresh
- [ ] User can log out
- [ ] Logout invalidates session

### Collections
- [ ] Create collection
- [ ] Rename collection
- [ ] Delete collection (cascades notes)
- [ ] Collection names unique per user
- [ ] Deletion warning shows note count

### Tags
- [ ] Create tag
- [ ] Rename tag
- [ ] Delete tag (does not delete notes)
- [ ] Tag names unique per user
- [ ] Assign multiple tags to note
- [ ] Remove tags from note

### Notes
- [ ] Create note (all fields)
- [ ] Edit note (any field)
- [ ] Archive note (preserved, no reminders)
- [ ] Restore archived note
- [ ] Delete note (permanent)
- [ ] Move note between collections
- [ ] Title and content validation (non-empty)
- [ ] Source URL validation (valid format)

### Review Scheduling
- [ ] Create note with review_interval
- [ ] Calculate next_review_date correctly
- [ ] Custom days validation (> 0)
- [ ] Mark note as reviewed
- [ ] Recalculate next_review_date (daily, weekly, monthly, custom)
- [ ] Archived notes do not generate reminders
- [ ] Notes with review_interval='none' do not generate reminders

### Search & Filter
- [ ] Search by title
- [ ] Search by content
- [ ] Search by source URL
- [ ] Filter by collection
- [ ] Filter by tag (single & multiple)
- [ ] Filter by status (active, archived)
- [ ] Filter by review state (due, overdue, next7days, none)
- [ ] Empty search results show empty state

### WebSocket Notifications
- [ ] Connection established on login
- [ ] Initial notification batch sent
- [ ] Periodic checks (5 min interval)
- [ ] New notes due → notification sent
- [ ] Archived notes → no notification
- [ ] Unscheduled notes → no notification
- [ ] Client subscribe message works
- [ ] Notifications display in UI (toast/panel)
- [ ] Reconnection logic works

### Authorization & Privacy
- [ ] User cannot access other users' collections
- [ ] User cannot access other users' tags
- [ ] User cannot access other users' notes
- [ ] User cannot access other users' reminders
- [ ] Unauthorized access returns 403 Forbidden or 404 Not Found

### UI/UX
- [ ] Auth screen has Google & GitHub buttons
- [ ] Dashboard layout: sidebar + main area
- [ ] Search input visible and functional
- [ ] Filter controls visible and functional
- [ ] User profile area visible with logout
- [ ] Notes list shows title, collection, tags, review state
- [ ] Note detail view shows all fields + "Mark as Reviewed" action
- [ ] Note create/edit form works
- [ ] Collection management UI works
- [ ] Tag management UI works
- [ ] Real-time notifications visible (toast or panel)
- [ ] Responsive on narrow screens (sidebar collapses, cards stack)
- [ ] Consistent spacing and typography
- [ ] Visible hover and focus states
- [ ] Empty states clear (no collections, no notes, no search results)
- [ ] Loading state visible
- [ ] Client-side validation feedback visible
- [ ] Error messages displayed to user

### Local Development
- [ ] All commands documented in README
- [ ] Backend starts with `npm run dev`
- [ ] Tests run with `npm run test`
- [ ] Database migrations run with `npm run db:migrate`
- [ ] Sample data created with `npm run db:seed`
- [ ] Environment variables in `.env.example`

---

## Troubleshooting

### Database Connection Failed
- Verify PostgreSQL running: `psql -U postgres -d pkb_dev`
- Check `DATABASE_URL` in `.env.local`
- Run migrations: `npm run db:migrate`

### OAuth Sign-In Fails
- Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` in `.env.local`
- Check OAuth app configurations in Google/GitHub developer consoles
- Verify redirect URLs match: `http://localhost:3000/api/auth/callback/google`

### WebSocket Connection Fails
- Check browser DevTools console for errors
- Verify session cookie present (DevTools → Application → Cookies)
- Check server logs for auth errors
- Try hard refresh (Ctrl+Shift+R) to clear cache

### Tests Fail
- Run with verbose output: `npm run test -- --verbose`
- Check database state: `npm run db:reset` (wipes db for clean test)
- Review test logs in terminal output

---

## Performance Baseline

These baselines validate performance targets:

**Notes List Load**:
- Measure: Time from click "Dashboard" to notes list rendered
- Target: < 2 seconds
- Test with 500 notes

**Search Response**:
- Measure: Time from typing query to results displayed
- Target: < 1 second
- Test with query "react" across 500 notes

**WebSocket Notification Delivery**:
- Measure: Time from note becoming due to notification received
- Target: within 5-minute check interval
- Test by creating note with nextReviewDate=today and observing notification

---

## Next Steps

1. **Run Manual Scenarios**: Execute Scenarios 1-10 to verify core workflows
2. **Run Automated Tests**: Execute test suite to validate all requirements
3. **Check Acceptance Criteria**: Use checklist to track completion
4. **Performance Validation**: Measure against baselines
5. **Document Results**: Record any issues found and fixes applied
6. **Spec Evolution**: Update spec if implementation reveals necessary changes

---

**Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-01 | Initial quickstart guide |

---

**See Also**:
- [Data Model](data-model.md) — Entity definitions and relationships
- [HTTP API Contract](contracts/http-api.md) — Endpoint specifications
- [WebSocket Protocol](contracts/websocket.md) — Real-time messaging
