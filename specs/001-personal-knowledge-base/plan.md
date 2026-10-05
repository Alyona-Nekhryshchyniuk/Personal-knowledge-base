# Implementation Plan: Personal Knowledge Base with Review Reminders

**Branch**: `001-personal-knowledge-base` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-personal-knowledge-base/spec.md`

---

## Summary

A full-stack personal knowledge management web application with SSO authentication (Google + GitHub), note collections, flexible tagging, configurable review intervals with spaced repetition scheduling, and real-time WebSocket review reminders. The implementation uses Next.js 16 (full-stack), PostgreSQL + Prisma ORM, Material UI for frontend styling, and Jest for testing. Core technical approach emphasizes strict user data isolation, server-side review calculation in UTC, and authorization enforcement on every data operation.

---

## Technical Context

**Language/Version**: TypeScript (5.0.3 via Node.js 18+)

**Primary Dependencies**: 
- Frontend: Next.js 16.3.8, React 18.3.1, Material UI 5.14.0, Emotion, Tailwind CSS 3.4.19, React Hook Form, Zod, SWR, Axios, Sonner (toasts)
- Backend: Next.js API Routes, NextAuth/Auth.js 5.0.0-beta.23, Prisma 5.8.0, `ws` library (WebSocket)
- Testing: Jest 29.7.0, React Testing Library, Supertest (API)

**Storage**: PostgreSQL 14+ (Prisma ORM handles all SQL)

**Testing**: Jest with React Testing Library for components; Supertest for API endpoints; ts-jest for TypeScript

**Target Platform**: 
- Backend: Node.js 18+ on local dev machine or cloud (Vercel, Railway, etc. for MVP local testing only)
- Frontend: Modern browsers (Chrome, Firefox, Safari, Edge) with WebSocket support

**Project Type**: Full-stack web application (Next.js monorepo structure: frontend + backend in one app)

**Performance Goals**: 
- Notes list load: < 2 seconds (typical user 100-1000 notes)
- Search response: < 1 second
- WebSocket notification delivery: within 5 minutes of becoming due
- Page navigation: < 500ms

**Constraints**: 
- Local development only (no cloud infrastructure in MVP)
- Zero unauthorized cross-user data access (security-critical)
- UTC-based review calculations (timezone consistency across regions)
- Cascade delete on collection deletion (per constitution)
- SSO-only authentication (no email/password fallback)

**Scale/Scope**: 
- Single authenticated user per session
- Typical MVP user: 100-1000 notes, 5-20 collections, 20-50 tags
- WebSocket check interval: 5 minutes (configurable)
- Session persistence: across page refresh

---

## Constitution Check

**Gate: Must pass before Phase 0 research. Re-check after Phase 1 design.**

### Principle Alignment Review

**Principle 1 — Specification First** ✅ PASS
- Feature specification defined (spec.md) with detailed requirements, scenarios, acceptance criteria
- Plan will include domain model, API contracts, design decisions
- Test mapping will link requirements to automated tests
- Implementation will follow spec-driven approach

**Principle 2 — Actual Technology Baseline** ✅ PASS
- Using established tech stack: Next.js 16, Prisma 5, PostgreSQL, NextAuth 5, Material UI 5, Jest
- No new dependencies without justification (will justify any additions in design phase)
- Architecture fits local dev machine constraint
- Monorepo approach (frontend + backend in Next.js) is standard and well-supported

**Principle 3 — SSO-Only Authentication** ✅ PASS
- Plan includes Google OAuth and GitHub OAuth via NextAuth
- No email/password paths planned
- Local user record creation on first SSO sign-in
- Provider + provider_user_id identity model (email optional)

**Principle 4 — Strict Personal Data Isolation** ✅ PASS
- Every collection, tag, note, reminder scoped to user_id
- Authorization middleware will enforce user ownership on all API routes
- WebSocket connections authenticated via session token
- Cross-user access tests planned as part of test mapping

**Principle 5 — Domain Integrity** ✅ PASS
- Data model includes all required entities: User, Collection, Tag, Note, NoteTag
- Cascade delete configured for Collection → Note → NoteTag
- Validation rules enforced server-side (Zod + Prisma constraints)
- Business invariants (e.g., no review reminders for archived notes) enforced in service layer

**Principle 6 — Collection Deletion Policy** ✅ PASS
- Cascade delete approach selected (per constitution)
- Collection deletion will delete all associated notes and tags removal
- UI will show warning modal before deletion
- Behavior documented in API contract and README

**Principle 7 — Review Scheduling as Domain Rule** ✅ PASS
- Review calculation logic centralized in utility module (date-utils.ts)
- Calculation used by: HTTP POST /api/notes/:id/review, WebSocket notification query, filters
- Monthly calculation handles calendar month semantics (addMonths via date-fns)
- Review state filtering integrated into notes list query

**Principle 8 — Explicit UTC Date Policy** ✅ PASS
- All timestamps stored as ISO 8601 UTC strings in PostgreSQL
- Server-side "today" calculation: startOfToday() in UTC (date-fns)
- Review calculations always UTC-based
- Clients display dates in browser local time (for presentation only)
- Timezone policy documented in README and spec

**Principle 9 — API Contract First** ✅ PASS
- Separate `contracts/` directory will document all HTTP endpoints and WebSocket protocol
- Request/response schemas defined using Zod
- Authorization requirements explicit in each endpoint spec
- Error responses documented (400, 403, 404, 409, etc.)

**Principle 10 — WebSocket as First-Class Contract** ✅ PASS
- WebSocket protocol documented in contracts/websocket.md
- Server → client: notification payload structure defined
- Client → server: subscribe message type and behavior documented
- Deduplication strategy documented
- Reconnection logic specified

**Principle 11 — Validation at Boundary** ✅ PASS
- Zod schemas for all API request bodies
- Client-side validation with React Hook Form (UX)
- Server-side validation required (security)
- Error messages returned to client

**Principle 12 — Persistence and Data Integrity** ✅ PASS
- PostgreSQL + Prisma ORM (no raw SQL injection risk)
- Prisma schema includes foreign keys, unique constraints, indexes
- Migrations version controlled in prisma/migrations/
- No soft deletion (true deletion only)
- Cascade delete configured in Prisma schema

**Principle 13 — Search and Filtering** ✅ PASS
- Search: title, content, source_url (substring, case-insensitive)
- Filters: collection, tag, status, review_state
- Filter combinations use AND logic
- Empty state messaging implemented

**Principle 14 — UI Consistency and Accessibility** ✅ PASS
- Material UI provides consistent design language
- Responsive layout: sidebar collapses, collections dropdown, cards stack
- Light theme only (per requirements)
- Empty states, loading states, validation feedback planned

**Principle 15 — Testing and Traceability** ✅ PASS
- Automated tests cover all critical requirements
- SSO login (mocked), CRUD operations, authorization, review calc, WebSocket
- Test mapping will link requirements to test cases
- No live OAuth calls in tests

**Principle 16 — Testability and Determinism** ✅ PASS
- Business logic separated for testability (date-utils, review-calculation, auth)
- Tests use controlled dates (Mock or jest.useFakeTimers())
- WebSocket tests mock connection and message events
- Test database isolated per test

**Principle 17 — Error Handling and Security** ✅ PASS
- Error types: auth, authorization, validation, not-found, conflict
- OAuth secrets in environment variables (not committed)
- CORS configured for frontend origin
- SQL injection prevented by Prisma
- WebSocket auth via session token

**Principle 18 — Documentation as Deliverable** ✅ PASS
- README will document tech stack, spec-driven workflow, file locations, setup commands, env vars, OAuth setup, API overview, WebSocket protocol, review rules, timezone policy, sample data, limitations
- Specification artifacts in repository
- Test mapping included

**Principle 19 — Controlled Development Scope** ✅ PASS
- MVP focused: collections, tags, notes, review intervals, WebSocket notifications
- Out of scope: sharing, collaboration, account linking, full-text search, rich text, email reminders, mobile apps, offline, bulk operations

**Principle 20 — Local Development First** ✅ PASS
- Architecture supports local Node.js + PostgreSQL
- Docker Compose optional (not required for MVP)
- All setup commands documented
- Tests runnable locally (jest)

**Principle 21 — Sample Data Safety** ✅ PASS
- Seed script (prisma/seed.ts) creates test data for authenticated user
- Development-only seed endpoint (POST /api/dev/seed) inaccessible in production (NODE_ENV check)
- Sample data demonstrates all important states

**Principle 22 — Performance Without Premature Complexity** ✅ PASS
- Notes list paginated (default 20 per page)
- Database indexes on user_id, collection_id, next_review_date, status
- No premature caching or worker queues
- Review check interval (5 min) is reasonable for MVP

**Principle 23 — Maintainability** ✅ PASS
- Code organized by concerns: /lib/ (utilities), /pages/ (routes), /components/ (UI)
- Authorization logic centralized (auth middleware)
- Review calculation logic centralized (date-utils)
- Validation schemas reusable (zod schemas)

**Principle 24 — Specification Evolution** ✅ PASS
- Change log will document spec changes during implementation
- Rationale recorded for any requirement adjustments
- Final implementation notes created

**Principle 25 — Definition of Done** ✅ PASS
- Full chain: Spec → Implementation → Tests → Documentation
- Security-critical behavior (authorization, review calc) automated tested
- Domain rules (cascade delete, archive exclusion) tested

### Gate Result: ✅ **PASS** — No violations; design can proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-personal-knowledge-base/
├── spec.md                  # Product specification (approved)
├── plan.md                  # This file (/speckit-plan output)
├── research.md              # Phase 0 output: research findings, design decisions
├── data-model.md            # Phase 1 output: entity definitions, relationships
├── quickstart.md            # Phase 1 output: validation guide
├── contracts/               # Phase 1 output: API contracts
│   ├── http-api.md          # HTTP endpoints (collections, tags, notes)
│   └── websocket.md         # WebSocket protocol (notifications)
├── checklists/
│   └── requirements.md      # Quality checklist (passed)
└── tasks.md                 # Phase 2 output (/speckit-tasks): actionable tasks
```

### Source Code (repository root)

```text
# Next.js Monorepo Structure: Frontend + Backend

app/
├── (auth)/
│   ├── page.tsx             # Login page (Google, GitHub buttons)
│   └── callback/[provider]/ # OAuth callback handler
├── (dashboard)/
│   ├── layout.tsx           # Main dashboard layout (sidebar + main)
│   ├── page.tsx             # Notes list view
│   ├── collections/
│   │   └── page.tsx         # Collection management
│   ├── tags/
│   │   └── page.tsx         # Tag management
│   └── notes/
│       ├── [id]/
│       │   └── page.tsx     # Note detail view
│       └── new/
│           └── page.tsx     # Note create/edit page (or modal on main)
├── api/
│   ├── auth/
│   │   ├── [...nextauth].ts # NextAuth configuration
│   │   └── callback/        # OAuth callbacks
│   ├── collections/
│   │   ├── route.ts         # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts     # PATCH (rename), DELETE (cascade)
│   ├── tags/
│   │   ├── route.ts         # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts     # PATCH (rename), DELETE
│   ├── notes/
│   │   ├── route.ts         # GET (list, search, filter), POST (create)
│   │   └── [id]/
│   │       ├── route.ts     # GET (detail), PATCH (edit), DELETE
│   │       ├── archive/     # POST (set archived)
│   │       ├── restore/     # POST (set active)
│   │       ├── review/      # POST (mark reviewed, recalc date)
│   │       └── move/        # PATCH (change collection)
│   ├── ws/
│   │   └── route.ts         # WebSocket upgrade handler
│   └── dev/
│       └── seed/
│           └── route.ts     # POST (create sample data, dev-only)
components/
├── common/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── NotificationPanel.tsx
│   └── ProfileMenu.tsx
├── notes/
│   ├── NoteCard.tsx
│   ├── NoteList.tsx
│   ├── NoteDetail.tsx
│   ├── NoteForm.tsx         # Create/Edit form
│   └── ReviewBadge.tsx
├── collections/
│   ├── CollectionList.tsx
│   ├── CollectionForm.tsx
│   └── DeleteCollectionModal.tsx
└── tags/
    ├── TagList.tsx
    ├── TagForm.tsx
    └── TagSelector.tsx

lib/
├── auth.ts                  # NextAuth configuration + session helpers
├── db.ts                    # Prisma client singleton
├── dates.ts                 # Review calculation logic (centralized)
├── validation.ts            # Zod schemas (reusable)
├── auth-middleware.ts       # Authorization checks for API routes
└── websocket.ts             # WebSocket manager (connection, reconnect)

prisma/
├── schema.prisma            # Database schema (User, Collection, Tag, Note, NoteTag)
├── migrations/              # Auto-generated by Prisma Migrate
│   └── [timestamp]_init/
│       └── migration.sql
└── seed.ts                  # Seed script for sample data

tests/
├── unit/
│   ├── dates.test.ts        # Review date calculation edge cases
│   ├── validation.test.ts   # Zod schema validation
│   └── auth-middleware.test.ts
├── integration/
│   ├── auth.test.ts         # SSO login, session, logout
│   ├── collections.test.ts  # Collection CRUD, cascade delete
│   ├── notes.test.ts        # Note CRUD, review, archive
│   ├── tags.test.ts         # Tag CRUD, assignment
│   └── websocket.test.ts    # WebSocket connection, notifications, message handling
└── e2e/
    └── happy-path.test.ts   # Full user workflow: login → create collection → create note → receive reminder

jest.config.js
tsconfig.json
next.config.js
package.json
.env.example
README.md
CLAUDE.md
```

**Structure Decision**: Next.js monorepo (frontend + backend co-located) is standard for full-stack web applications. This structure:
- Simplifies session management (same-origin auth)
- Enables code sharing (validation schemas, types)
- Reduces deployment complexity (single app)
- Supports API routes at `/api/` and pages at `/app/`
- Aligns with technology baseline (Next.js 16)

---

## Complexity Tracking

No constitutional violations requiring justification.

---

## Phase 0: Research & Clarifications

### Unknowns to Resolve

None identified in specification. All requirements are specific and unambiguous. Specification already includes:
- Authentication approach (SSO: Google + GitHub)
- Data model (User, Collection, Tag, Note, NoteTag)
- Review calculation logic (UTC-based, interval-based)
- Authorization model (per-user scoping)
- WebSocket protocol (subscribe message, notification payload)
- Timezone policy (UTC)
- Collection deletion (cascade)
- Search and filter semantics

### Design Decisions to Document

1. **WebSocket Deduplication Approach**
   - **Options**: (a) Server-side notification log, (b) Client-side hash tracking
   - **Chosen**: Client-side hash tracking (simpler, no DB queries)
   - **Rationale**: Reduces server load; client already tracks rendered notifications

2. **Review Check Interval**
   - **Options**: (a) 1 minute, (b) 5 minutes, (c) 10 minutes, (d) configurable
   - **Chosen**: 5 minutes, configurable via WS_CHECK_INTERVAL env var
   - **Rationale**: Balances responsiveness and server load; configurable for future optimization

3. **Session Persistence**
   - **Options**: (a) NextAuth default, (b) Custom JWT, (c) Database sessions
   - **Chosen**: NextAuth default (session + cookies)
   - **Rationale**: Next.js standard; handles secure storage; survives page refresh automatically

4. **Database Query Optimization**
   - **Options**: (a) N+1 queries, (b) Eager load, (c) Selective fields
   - **Chosen**: Eager load with Prisma relations, selective fields for large lists
   - **Rationale**: Performance target (< 2 sec notes list) requires optimized queries

---

## Phase 1: Design & Contracts

### Output Artifacts

The following files will be generated by this planning phase:

1. **data-model.md** — Entity definitions, relationships, constraints, validation rules
2. **contracts/http-api.md** — HTTP endpoint specifications with request/response schemas
3. **contracts/websocket.md** — WebSocket protocol with message payloads and behavior
4. **quickstart.md** — Validation guide with setup, run, and test steps

---

## Next Steps

1. ✅ **Phase 0**: Generate `research.md` (if unknowns exist; none identified, skip)
2. **Phase 1**: Generate design artifacts:
   - `data-model.md` (entity definitions, relationships)
   - `contracts/http-api.md` (HTTP endpoints, request/response schemas)
   - `contracts/websocket.md` (WebSocket protocol)
   - `quickstart.md` (validation guide)
3. **Phase 2** (next command): `/speckit-tasks` → Generate `tasks.md` with actionable development tasks

---

**Plan Version**: 1.0.0  
**Status**: READY FOR PHASE 1 DESIGN  
**Created**: 2026-10-01
