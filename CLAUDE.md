# Personal Knowledge Base with Review Reminders

## Project Overview

A full-stack web application that helps users collect, organize, and review personal knowledge through notes, collections, and tags with intelligent review reminders. The application uses SSO authentication (Google & GitHub) and WebSocket-based real-time notifications for review reminders.

**Core Principle**: Spec-driven development workflow using OpenSpec/Spec Kit for comprehensive specification artifacts guiding implementation.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.3.8 (App Router)
- **Language**: TypeScript 6.0.3
- **UI Library**: React 18.3.1 + Material UI (MUI) 5.14.0
- **Styling**: Emotion (CSS-in-JS) + Tailwind CSS 3.4.19
- **State Management**: SWR for server state + React Hook Form for form state
- **WebSocket Client**: Native WebSocket API (ws 8.22.0) + custom hooks
- **Auth**: next-auth 5.0.0-beta.23 for SSO (Google, GitHub)
- **Forms**: React Hook Form 7.51.2 + Zod 3.22.4 for validation
- **HTTP Client**: Axios 1.6.0
- **Notifications**: Sonner 1.3.1 for toast notifications
- **Testing**: Jest 29.7.0 + React Testing Library

### Backend
- **Runtime**: Node.js 18+ + Next.js API Routes
- **Language**: TypeScript 6.0.3
- **Database**: PostgreSQL 14+ with Prisma ORM 5.8.0
- **Auth**: next-auth 5.0.0-beta.23 with OAuth providers (Google, GitHub)
- **WebSocket**: ws library 8.22.0
- **Validation**: Zod for request/response validation
- **Testing**: Jest 29.7.0 + Supertest

### Database
- **Primary**: PostgreSQL (main data store)
- **ORM**: Prisma
- **Migrations**: Prisma Migrate
- **Seed Data**: Prisma seeding script

### Infrastructure & Deployment
- **Local Development**: Docker Compose (optional)
- **Environment**: Node.js 18+
- **Package Manager**: npm or pnpm

---

## Architecture Overview

### Database Schema
Key entities:
- `User` - SSO identity + profile
- `Collection` - User's note groups
- `Tag` - User's flexible labels
- `Note` - Main content entity with review fields
- `NoteTag` - Many-to-many relationship
- `NotificationLog` - Track WebSocket notification delivery

### API Structure
- RESTful HTTP endpoints for CRUD operations on collections, tags, notes
- WebSocket endpoint for real-time review notifications
- All endpoints enforce user authorization (owner checks)

### Frontend Architecture
- Page-based routing (Next.js App Router)
- Protected routes requiring authentication
- Main dashboard with:
  - Left sidebar: Collections (collapsible on mobile)
  - Main area: Notes list/grid with search & filters
  - Notification panel: WebSocket alerts
- Modal/drawer for note creation/editing
- Separate management UIs for collections and tags

---

## Spec-Driven Development

### Specification Framework
Using a structured spec-driven approach with the following artifacts:

**Location**: `/specs` directory

1. **`specs/01-requirements.md`** - Product requirements & business rules
2. **`specs/02-domain-model.md`** - Entity definitions & relationships
3. **`specs/03-api-contract.md`** - HTTP & WebSocket API specification
4. **`specs/04-acceptance-criteria.md`** - Testable acceptance criteria
5. **`specs/05-implementation-plan.md`** - Phased implementation roadmap
6. **`specs/06-test-mapping.md`** - Requirements → Tests mapping
7. **`specs/07-change-log.md`** - Design decisions & spec evolution
8. **`specs/08-implementation-notes.md`** - Final notes on implementation

### Workflow
1. **Specify** - Write detailed requirements, domain model, API contract
2. **Plan** - Break down implementation into phases with dependencies
3. **Implement** - Follow implementation plan, reference specs for correctness
4. **Test** - Map tests to requirements in test-mapping.md
5. **Document** - Update change-log as specs evolve

### Key Design Decisions

#### Authentication
- **Choice**: next-auth with OAuth providers only (no email/password)
- **Providers**: Google OAuth 2.0 + GitHub OAuth
- **Rationale**: Reduces credential management burden, aligns with MVP scope
- **User Creation**: Automatic on first successful SSO sign-in
- **Account Linking**: Not implemented; separate Google/GitHub accounts treated as distinct

#### Collection Deletion
- **Approach**: Allow deletion and cascade-delete all notes
- **Rationale**: Simpler than orphaning notes; user intent is clearer
- **Documentation**: Required in spec and README

#### Review Interval Calculation
- **Timezone**: UTC for all date/time calculations (server-stored as ISO strings)
- **"Today" Definition**: Midnight UTC to 23:59:59 UTC
- **Rationale**: Consistent, server-side driven to avoid client TZ bugs
- **Client Display**: Convert to user's local time (browser-detected or user preference)

#### WebSocket Notifications
- **Interval**: Check for review-due notes every 5 minutes (configurable)
- **Deduplication**: Track sent notification hashes client-side; server doesn't re-send within 5-min window
- **Connection Behavior**: 
  - On connect: Send batch of all due/overdue notes
  - Periodic: Check and send new due notes
  - On client message (e.g., `subscribe`): Reset checks, send fresh batch
- **Closed Loop**: Client sends acknowledgment; server removes from queue

#### Data Privacy
- **Authorization Model**: Row-level security via user_id foreign key
- **Query Pattern**: Every SELECT/UPDATE/DELETE filters by `user_id = current_user.id`
- **Enforcement**: Middleware/authorization layer validates user ownership before ops

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (18.0.0 or higher)
- npm 9+ or pnpm
- Git

### Backend Setup
```bash
# Install dependencies
npm install

# Create .env.local with OAuth credentials:
# NEXTAUTH_SECRET=<random-secret-for-dev>
# NEXTAUTH_URL=http://localhost:3000
# GOOGLE_CLIENT_ID=<google-oauth-client-id>
# GOOGLE_CLIENT_SECRET=<google-oauth-secret>
# GITHUB_CLIENT_ID=<github-oauth-client-id>
# GITHUB_CLIENT_SECRET=<github-oauth-secret>

# Initialize database (SQLite - no external setup needed)
npm run db:migrate

# Seed sample data (optional)
npm run db:seed

# Start dev server
npm run dev
```

Backend runs on `http://localhost:3000/api`

### Frontend Setup
Frontend is co-hosted in Next.js app.

Access at `http://localhost:3000`

### Database Setup
SQLite is used for development (zero setup required). Database file is created automatically at `./dev.db` when you run `npm run db:migrate`.

**Note:** For production, PostgreSQL 14+ is recommended. Update `prisma/schema.prisma` provider to `"postgresql"` and provide a PostgreSQL connection string in `DATABASE_URL`.

### Environment Variables
See `/.env.example` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption key
- `NEXTAUTH_URL` - Base URL for redirects
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `LOG_LEVEL` - "debug" | "info" | "warn" | "error"
- `WS_CHECK_INTERVAL` - Review check interval in ms (default: 300000)

---

## Testing

### Test Command
```bash
npm run test
```

### Test Structure
- `/tests/unit/` - Pure functions (date calc, URL validation)
- `/tests/integration/` - API routes with in-memory DB
- `/tests/e2e/` - Full flow (auth → create note → review)

### Test Coverage Requirements
- ✅ SSO login (mock OAuth responses)
- ✅ User record creation on first sign-in
- ✅ Collection CRUD + deletion cascade
- ✅ Note CRUD + archive/restore
- ✅ Tag assignment/removal
- ✅ Review interval calculation & next_review_date update
- ✅ Cross-user authorization (user cannot access other's data)
- ✅ Archived notes don't trigger review notifications
- ✅ WebSocket connection auth & notification delivery
- ✅ Client → server message (e.g., subscribe) changes behavior
- ✅ UI components: empty states, loading, validation feedback

---

## API Overview

### HTTP Endpoints (RESTful)

#### Authentication
- `POST /api/auth/signin` - Redirect to OAuth provider
- `GET /api/auth/callback/[provider]` - OAuth callback handler
- `POST /api/auth/signout` - Clear session
- `GET /api/auth/session` - Get current user

#### Collections
- `GET /api/collections` - List user's collections
- `POST /api/collections` - Create collection
- `PATCH /api/collections/:id` - Rename collection
- `DELETE /api/collections/:id` - Delete (cascades notes)

#### Tags
- `GET /api/tags` - List user's tags
- `POST /api/tags` - Create tag
- `PATCH /api/tags/:id` - Rename tag
- `DELETE /api/tags/:id` - Delete (removes from notes)

#### Notes
- `GET /api/notes` - List notes (supports filters & search)
- `GET /api/notes?collection=:collectionId` - Filter by collection
- `GET /api/notes?tags=:tagId1,:tagId2` - Filter by tags
- `GET /api/notes?status=active|archived` - Filter by status
- `GET /api/notes?reviewState=due|overdue|next7days|none` - Filter by review state
- `GET /api/notes?search=:query` - Search title/content/url
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get note detail
- `PATCH /api/notes/:id` - Update note fields
- `POST /api/notes/:id/archive` - Archive note
- `POST /api/notes/:id/restore` - Restore archived note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/move` - Move to collection
- `POST /api/notes/:id/review` - Mark as reviewed (updates last_reviewed_date, recalculates next_review_date)

### WebSocket Endpoint
- **URL**: `ws://localhost:3000/api/ws`
- **Auth**: Query param `?token=<session-token>` or bearer header
- **Client → Server Message**:
  ```json
  {
    "type": "subscribe",
    "payload": { "interval": "5m" }
  }
  ```
- **Server → Client Notification**:
  ```json
  {
    "type": "review_reminder",
    "data": {
      "noteId": "uuid",
      "title": "string",
      "collection": "string",
      "nextReviewDate": "2026-10-15",
      "overdue": false,
      "daysOverdue": 0
    }
  }
  ```

---

## Review Reminder Rules

1. **Due Today**: `next_review_date == TODAY && status == Active && review_interval != none`
2. **Overdue**: `next_review_date < TODAY && status == Active && review_interval != none`
3. **No Reminder**: `status == Archived OR review_interval == none`
4. **Calculation After Review**:
   - `daily` → `next_review_date = today + 1 day`
   - `weekly` → `next_review_date = today + 7 days`
   - `monthly` → `next_review_date = today + 1 calendar month`
   - `custom N` → `next_review_date = today + N days`

---

## Collection Deletion Behavior

**Approach**: Cascade delete all notes in the collection.

**Rationale**: 
- Clearer user intent than orphaning notes
- Simpler data model
- User can archive notes before deleting collection if preservation needed

**Confirmation**: Deletion modal warns user that all notes will be deleted and requires confirmation.

---

## Timezone Handling

**Server-side**: All dates stored as ISO 8601 strings in UTC in PostgreSQL.

**"Today" Definition**: 
- Server calculates "today" as midnight-to-midnight UTC
- Review checks run every 5 minutes (server time)

**Client-side**:
- Display dates in user's browser local time
- Optional: Add user timezone preference in settings (future enhancement)
- Fallback: Show "Today", "Yesterday", "Tomorrow" relative to server's "today"

**Rationale**: Server-driven dates prevent timezone bugs across users in different zones; simpler logic.

---

## Sample Data

### Seed Script
Run `npm run db:seed` to populate dev user with:
- 3 sample collections: "Learning", "Ideas", "Links"
- 10 sample notes across collections
- Tags: "important", "review-soon", "archived-example"
- Various review intervals and due dates (some due today, some overdue, some future)

**Test Credentials** (seeded):
- Email: `dev@example.com`
- Provider: Internal test user (or use real Google/GitHub account)

### Manual Seed
Environment variables can trigger sample data creation:
- `SEED_ON_START=true` in dev mode
- Or POST to `/api/dev/seed` endpoint (dev-only, returns 401 in prod)

---

## Known Limitations

1. **No Account Linking**: Google and GitHub sign-ins create separate accounts
2. **No Collaboration**: No sharing, team roles, or guest access
3. **No Full-Text Search**: Search is basic string matching (title/content/URL)
4. **No Rich Text**: Notes are plain text or Markdown-style (no WYSIWYG editor)
5. **No Offline**: App requires active internet; no offline-first sync
6. **No Mobile App**: Web-only; responsive but not native mobile
7. **No Email Reminders**: Only in-app WebSocket notifications
8. **No Bulk Operations**: No batch import/export or bulk note editing
9. **Single Workspace**: No multi-workspace per user (future feature)

---

## Development Workflows

### Creating a New Feature
1. **Spec First**: Write acceptance criteria in `specs/04-acceptance-criteria.md`
2. **API Design**: Update `specs/03-api-contract.md` with endpoints
3. **Domain Update**: Add entities/fields to `specs/02-domain-model.md`
4. **Implementation Plan**: Add tasks to `specs/05-implementation-plan.md`
5. **Implement**: Create migrations, API routes, UI components
6. **Test**: Write tests, update `specs/06-test-mapping.md`
7. **Spec Update**: Document final behavior in `specs/07-change-log.md`

### Debugging Checklist
- [ ] Check `.env.local` for required OAuth vars
- [ ] Verify `dev.db` exists in project root (created by `npm run db:migrate`)
- [ ] Check browser DevTools for WebSocket connection status
- [ ] View server logs: `LOG_LEVEL=debug npm run dev`
- [ ] Verify session cookie (DevTools → Application → Cookies)

---

## Important Constraints

### Security
- ✅ Never trust client-supplied user_id; always verify via session
- ✅ Validate all inputs (Zod for API routes)
- ✅ Use parameterized queries (Prisma handles this)
- ✅ Enforce CORS for WebSocket connections
- ✅ Logout must invalidate session immediately

### Performance
- ✅ Index `notes.user_id`, `notes.collection_id`, `notes.updated_at` for common queries
- ✅ Paginate notes list (default 20 per page)
- ✅ Cache user profile after auth (next-auth default)
- ✅ WebSocket sends only summary data (not full note content)

### Data Integrity
- ✅ Foreign keys enforce referential integrity (Prisma + DB constraints)
- ✅ Unique constraints: collection name per user, tag name per user
- ✅ Soft deletes NOT used (true deletes only)
- ✅ Timestamps (created_at, updated_at) on all entities

---

## File Structure
```
project-root/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Landing / redirect to dashboard
│   ├── (auth)/                   # Auth pages
│   ├── (dashboard)/              # Protected routes
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Main notes view
│   │   ├── collections/
│   │   ├── tags/
│   │   └── settings/
│   └── api/                      # API routes
│       ├── auth/
│       ├── collections/
│       ├── tags/
│       ├── notes/
│       └── ws/                   # WebSocket handler
├── components/                   # React components
│   ├── common/                   # Shared (Header, Sidebar, etc.)
│   ├── notes/                    # Note-specific components
│   └── ui/                       # Shadcn/ui components
├── lib/                          # Utilities
│   ├── auth.ts                   # NextAuth config
│   ├── db.ts                     # Prisma client
│   ├── dates.ts                  # Review date logic
│   └── validation.ts             # Zod schemas
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Auto-generated
│   └── seed.ts                   # Seed script
├── tests/                        # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── specs/                        # Specification artifacts
│   ├── 01-requirements.md
│   ├── 02-domain-model.md
│   ├── 03-api-contract.md
│   ├── 04-acceptance-criteria.md
│   ├── 05-implementation-plan.md
│   ├── 06-test-mapping.md
│   ├── 07-change-log.md
│   └── 08-implementation-notes.md
├── .env.example                  # Environment template
├── .env.local                    # Local overrides (not committed)
├── docker-compose.yml            # (optional)
├── CLAUDE.md                     # This file
├── README.md                     # User-facing docs
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## Common Commands
```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Run production build
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run lint             # ESLint
npm run db:migrate       # Run migrations
npm run db:seed          # Populate seed data
npm run db:reset         # Drop & recreate schema (dev only)
npm run type-check       # TypeScript check
```

---

## References & Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs/)
- [NextAuth.js](https://next-auth.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

## Questions & Next Steps

1. **Database Host**: Should we use local PostgreSQL or containerized?
2. **OAuth Credentials**: Have you generated Google/GitHub OAuth app credentials?
3. **Spec Artifacts**: Should we create specs first (init with OpenSpec) or jump to implementation?
4. **Testing Strategy**: Unit-heavy or integration-heavy?
5. **Deployment**: Local development only, or prepare for cloud (Railway, Vercel, etc.)?

---

**Last Updated**: 2026-10-01  
**Status**: Project initialized, awaiting spec artifact creation

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
