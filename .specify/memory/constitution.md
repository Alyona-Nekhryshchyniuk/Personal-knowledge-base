# Personal Knowledge Base with Review Reminders — Project Constitution

<!-- 
Sync Impact Report (temporary review scaffold)
Version: 1.0.0 (initial) 
Ratified: 2026-10-01
Last Amended: 2026-10-01
Principles: 25 core governance principles
Sections: Project Purpose, Core Principles, Constitutional Priority, Governance
Status: ACTIVE
-->

## Project Purpose

This project is a full-stack personal knowledge management web application built with Next.js.

Users authenticate exclusively through Google or GitHub SSO and maintain a private personal workspace containing notes, collections, tags, and review schedules. The system provides search and filtering and delivers review reminders through authenticated WebSocket connections.

The project MUST be developed using a spec-driven development workflow. Specifications are the authoritative description of product behavior, domain rules, API contracts, acceptance criteria, and implementation decisions.

---

## Core Principles

### Principle 1 — Specification First

All meaningful product behavior MUST be defined through specification artifacts before implementation.

The repository MUST maintain specifications covering:

* Product requirements and business rules
* Domain model
* HTTP and WebSocket API contracts
* Acceptance criteria
* Implementation decisions/plan
* Test mapping
* Specification changes and evolution
* Final implementation notes

The specification MUST be detailed enough for another developer to understand the expected behavior without inspecting the implementation. Implementation MUST NOT silently introduce behavior that contradicts the approved specification. When implementation reveals that a requirement is ambiguous, incomplete, or technically incorrect, the specification MUST be updated and the change MUST be documented. The specification-to-implementation-to-test relationship MUST remain traceable.

---

### Principle 2 — Actual Technology Baseline

The project MUST use the existing dependency baseline unless a documented specification change justifies replacing or adding a technology.

**Current baseline:**

* Next.js 16.x
* React 18.x
* TypeScript
* Prisma 5.x
* PostgreSQL
* NextAuth/Auth.js 5.x
* Material UI 5.x
* Emotion
* Tailwind CSS 3.x
* React Hook Form
* Zod
* SWR
* Axios
* Native browser WebSocket API
* `ws`
* Jest
* React Testing Library
* TypeScript ESLint
* Prisma Migrate

The implementation SHOULD prefer existing dependencies before introducing new packages. New dependencies MUST have a clear technical or product justification. The project MUST remain runnable on a local developer machine.

---

### Principle 3 — SSO-Only Authentication

Authentication MUST be SSO-only. Supported identity providers: Google OAuth/OpenID Connect, GitHub OAuth.

The application MUST NOT implement email/password authentication, password storage, local password reset, or anonymous authenticated sessions.

On the first successful SSO authentication, the application MUST create a local user record. The canonical external identity MUST be based on `provider + provider_user_id`. Email MUST NOT be the sole identity key because GitHub may not provide an email address.

The local user profile SHOULD persist: provider, provider user ID, email when available, display name, and optional avatar URL.

Google and GitHub accounts do not need to be linked. If the same person authenticates through both providers, they MAY exist as separate local accounts. Authentication MUST survive normal page refreshes. Logout MUST invalidate the authenticated application session. OAuth tests MUST use mocks/stubs and MUST NOT depend on live Google or GitHub network requests.

---

### Principle 4 — Strict Personal Data Isolation

Every user's workspace is private. The system MUST NOT implement collaboration, sharing, invitations, public links, shared collections, shared notes, team workspaces, or team roles.

Every collection, tag, and note MUST belong to exactly one user. Every protected HTTP operation MUST authorize the authenticated user before accessing or modifying user-owned resources. WebSocket connections MUST also be authenticated and authorized.

A client-supplied `user_id` MUST NEVER determine resource ownership. Resource IDs MUST NOT allow a user to access another user's resources. Cross-user authorization MUST be covered by automated tests. Database relationships MUST preserve ownership and referential integrity.

---

### Principle 5 — Domain Integrity

The primary domain entities are: User, Collection, Tag, Note, NoteTag, and notification-related persistence where required.

**Core domain rules:**

* A Note belongs to exactly one User
* A Note belongs to exactly one Collection
* A Note may have zero or more Tags
* A Collection name is unique per User
* A Tag name is unique per User
* Deleting a Tag does not delete Notes
* Deleting a Collection follows the explicitly specified collection deletion policy
* A Note title MUST be non-empty
* A Note body/content MUST be non-empty
* A source URL, when present, MUST be valid
* A custom review interval MUST be greater than zero
* Archived Notes MUST NOT generate review reminders
* Notes with no review schedule MUST NOT generate review reminders

Business invariants MUST be enforced server-side. Database constraints SHOULD enforce invariants where appropriate.

---

### Principle 6 — Collection Deletion Policy

The application uses cascade deletion for collections. When a Collection is deleted: the Collection is deleted, all Notes belonging to that Collection are deleted, associated NoteTag relationships are deleted, and Tags themselves are NOT deleted.

The UI MUST clearly warn the user that deleting a collection also deletes its notes. The deletion behavior MUST be documented in the specification and README. Cascade behavior MUST be covered by automated tests.

---

### Principle 7 — Review Scheduling as a Domain Rule

Review scheduling is a core domain capability and MUST be implemented consistently across API, persistence, UI, and WebSocket behavior.

**Supported intervals:** None, Daily, Weekly, Monthly, Custom number of days.

**A note is due when:** status is Active, review interval is not None, and next review date is today.

**A note is overdue when:** status is Active, review interval is not None, and next review date is before today.

**A note is NOT reviewable when:** it is Archived, its review interval is None, or it has no next review date.

**When marked as reviewed:**

* `last_reviewed_date` becomes today
* `next_review_date` is recalculated from today

**Calculation rules:**

* Daily → today + 1 calendar day
* Weekly → today + 7 calendar days
* Monthly → today + 1 calendar month
* Custom N → today + N calendar days

Monthly calculation MUST use calendar-month semantics. Review calculation logic SHOULD be centralized.

---

### Principle 8 — Explicit UTC Date Policy

The application uses UTC as the canonical server-side timezone. Persisted timestamps MUST use a consistent UTC representation. The application's definition of "today" for review calculations MUST be based on the UTC calendar date (UTC midnight begins a new application day; due/overdue calculations use the current UTC date; review calculations use the current UTC date).

The client MAY display dates using the browser's local timezone for presentation, but client timezone MUST NOT change server-side review eligibility or scheduling. Date handling MUST be centralized and tested, including calendar-month edge cases. The timezone policy MUST be documented in the specification and README.

---

### Principle 9 — API Contract First

The HTTP API MUST provide all behavior required by the UI. API contracts MUST explicitly define authentication behavior, authorization requirements, request validation, response structures, error behavior, resource ownership rules, query/filter behavior, and review behavior.

Protected endpoints MUST require authentication. User-owned resources MUST always be scoped to the authenticated user. The server MUST validate all external input regardless of client-side validation. The API MUST return predictable HTTP status codes and structured, useful errors. API changes that affect documented behavior MUST result in a specification update.

---

### Principle 10 — WebSocket as a First-Class Contract

The application MUST provide authenticated two-way WebSocket communication for review reminders. WebSocket behavior MUST be documented as part of the API contract.

**When a connection is established:** the server authenticates the connection, authorizes it for the authenticated user, and sends an initial batch of eligible due/overdue review notifications.

**While connected:** the server periodically checks review eligibility (default check interval: 5 minutes, configurable), only the authenticated user's notifications may be delivered.

**Server MUST NOT send notifications for:** Archived notes, notes with no review schedule, notes belonging to another user.

**Notifications MUST contain:** notification type, note ID, note title, collection name, next review date, due/overdue state.

The client MUST send a meaningful message to the server. The selected client-to-server protocol MUST have observable server-side behavior and MUST be documented. Duplicate notification behavior MUST be deterministic and documented.

---

### Principle 11 — Validation at the Boundary

All externally supplied data MUST be validated before entering domain operations. Zod SHOULD be used for API and form validation.

Client-side validation improves user experience but MUST NOT replace server-side validation.

**At minimum:**

* Note title cannot be empty
* Note content cannot be empty
* Source URL must be valid when supplied
* Custom review days must be greater than zero
* Collection names must satisfy uniqueness rules
* Tag names must satisfy uniqueness rules
* Resource identifiers must be validated

Invalid requests MUST produce clear errors. Validation rules MUST be represented consistently between specification, implementation, and tests.

---

### Principle 12 — Persistence and Data Integrity

PostgreSQL is the authoritative persistent data store. Prisma MUST be used as the ORM. Prisma migrations MUST be version controlled.

The database MUST enforce appropriate foreign keys, unique constraints, required fields, and referential relationships.

Soft deletion MUST NOT be used for the core entities unless a future specification explicitly introduces it. The system uses true deletion for collections, tags, and notes. Timestamps such as creation and update timestamps MUST be maintained consistently. Appropriate indexes SHOULD exist for common ownership, collection, and note-query patterns.

---

### Principle 13 — Search and Filtering

The notes view MUST support searching by: title, content/body, source URL.

**Filtering MUST support:**

* Collection
* Tag
* Active/Archived status
* Due today
* Overdue
* Next 7 days
* No review schedule
* All review states

Full-text search infrastructure is not required. Basic case-insensitive string matching is sufficient. Search and filter behavior MUST respect user ownership. An empty search result MUST produce an explicit UI empty state.

---

### Principle 14 — UI Consistency and Accessibility

The UI MUST be responsive, interactive, and consistent.

**The primary dashboard MUST provide:** Navigation/collection area, main notes area, search, filters, user profile information, logout, review notifications.

**The application MUST support:** Note creation, note editing, note detail, collection management, tag management, review actions.

**The UI MUST provide explicit states for:** Loading, empty collections, empty notes, empty tags, no search results, no review reminders, validation errors, general operation errors.

Interactive controls MUST have visible hover and keyboard focus states. Forms MUST provide useful client-side validation feedback. The application uses a light theme. Narrow screens MUST remain usable (navigation/sidebar can collapse, collections can move into compact selection UI, note cards can stack vertically).

---

### Principle 15 — Testing and Traceability

Automated tests MUST verify critical business behavior, security boundaries, and acceptance criteria.

**Required coverage includes:**

* Mocked SSO authentication
* Local user creation after first authentication
* Authentication/session persistence behavior
* Collection CRUD and deletion behavior
* Note CRUD and archive/restore operations
* Tag assignment/removal
* Review calculation and next_review_date update
* Marking a note as reviewed
* Cross-user authorization
* Archived-note reminder exclusion
* Unscheduled-note reminder exclusion
* Due and overdue notifications
* WebSocket authorization
* Meaningful client-to-server WebSocket behavior
* Important validation failures
* Critical UI states

Tests MUST NOT depend on live OAuth providers. Date-related tests MUST use controlled dates/times. The repository MUST maintain a mapping between acceptance criteria and automated tests or explicitly documented manual validation. A feature is not complete merely because its implementation exists; its required verification must also exist.

---

### Principle 16 — Testability and Determinism

Business logic MUST be structured so that it can be tested without relying on real external services.

**Tests SHOULD avoid:**

* Real OAuth network calls
* Real external APIs
* Uncontrolled system time
* Arbitrary network timing
* Shared mutable test state

Review-date calculations MUST support deterministic testing. WebSocket tests MUST provide deterministic control over connection, message, notification, and acknowledgement behavior. Integration tests MUST isolate test data between users.

---

### Principle 17 — Error Handling and Security

Expected failures MUST be handled explicitly. The system MUST distinguish: authentication failures, authorization failures, validation failures, missing resources, persistence failures, WebSocket failures.

Sensitive implementation details MUST NOT be exposed to clients. Secrets MUST be provided through environment variables. OAuth secrets MUST never be exposed to browser code. The application MUST NOT commit secrets to source control. Client-supplied ownership information MUST never override server-derived session identity. WebSocket authentication MUST use the application's authenticated session/security mechanism.

---

### Principle 18 — Documentation as a Deliverable

The README MUST be sufficient for another developer to run and understand the application without guessing.

**It MUST document:**

* Project purpose
* Technology stack
* Spec-driven workflow
* Specification locations
* How specifications guided implementation
* Local database setup
* Backend/API startup
* Frontend startup
* Test commands
* Required environment variables
* Google and GitHub OAuth setup
* API overview
* WebSocket protocol
* Review reminder rules
* Collection deletion behavior
* Timezone policy
* Sample-data setup
* Known limitations
* Requirements-to-test mapping
* Differences between initial and final specifications

Specification artifacts MUST remain inside the repository.

---

### Principle 19 — Controlled Development Scope

The MVP MUST remain focused on personal knowledge management.

**Explicitly out of scope:**

* Collaboration
* Sharing
* Invitations
* Public links
* Shared collections/notes
* Team roles/workspaces
* Account linking between Google and GitHub
* Full-text search
* Rich-text/WYSIWYG editing
* Email reminders
* Native mobile applications
* Offline-first synchronization
* Bulk import/export
* Bulk note editing
* Multiple workspaces per user
* Mandatory cloud deployment

Out-of-scope functionality MUST NOT be introduced without a specification change.

---

### Principle 20 — Local Development First

The application MUST run locally on a developer machine.

**The repository MUST provide documented commands for:**

* Installing dependencies
* Starting the database
* Running database migrations
* Seeding sample data
* Starting the application
* Running tests
* Running type checks
* Running linting

Docker/containerization MAY be provided but is not mandatory. Cloud deployment is outside the MVP requirement. Development setup MUST NOT require access to production infrastructure.

---

### Principle 21 — Sample Data Safety

Sample data MUST be safe for local development and testing. Seeded application data MUST NOT accidentally become visible to unrelated users. Development/test seed mechanisms MUST be clearly separated from production behavior. If a development-only seed endpoint exists, it MUST be inaccessible in production.

**Sample data SHOULD demonstrate:**

* Multiple collections
* Tagged notes
* Active notes
* Archived notes
* Notes with no review schedule
* Notes due today
* Overdue notes
* Future review dates

---

### Principle 22 — Performance Without Premature Complexity

The application SHOULD remain responsive for normal MVP-scale usage.

**The implementation SHOULD:**

* Paginate large note collections
* Index common ownership and filtering fields
* Avoid loading full note bodies when only summaries are required
* Send summary information rather than complete note content through WebSocket notifications
* Avoid unnecessary repeated database queries
* Avoid premature infrastructure complexity

Performance optimizations MUST NOT weaken authorization or domain correctness.

---

### Principle 23 — Maintainability

Code MUST favor clarity and explicit domain behavior over unnecessary abstraction.

Business logic SHOULD be separated from presentation concerns. Authorization logic SHOULD be centralized enough to prevent inconsistent ownership checks. Review-date calculations SHOULD have a single authoritative implementation. Validation schemas SHOULD be reusable where appropriate. Duplicated business rules SHOULD be avoided. Architecture SHOULD remain proportional to the MVP requirements. A new abstraction, framework, or dependency SHOULD have a concrete justification.

---

### Principle 24 — Specification Evolution

The initial specification is not immutable. When implementation reveals a necessary change:

1. The affected requirement or design decision MUST be identified
2. The specification MUST be updated
3. The reason for the change MUST be documented
4. Affected acceptance criteria MUST be reviewed
5. Affected tests MUST be updated or added
6. The final implementation notes MUST reflect the resulting behavior

The repository MUST preserve at least one documented example of specification evolution. The final implementation MUST accurately represent the final specification rather than an obsolete initial draft.

---

### Principle 25 — Definition of Done

A requirement is complete only when the relevant parts of the following chain are satisfied:

**Specification → Domain/API behavior → Implementation → Tests → Documentation**

For a user-facing requirement, completion normally requires:

* Specification coverage
* Backend behavior
* Authorization
* Persistence where applicable
* UI behavior
* Validation
* Automated tests
* Documentation where behavior or configuration requires it

For security-sensitive behavior, automated verification is required. For important domain rules, automated verification is required. The final repository MUST contain sufficient evidence that the application was developed according to the spec-driven workflow.

---

## Constitutional Priority

When principles conflict, the following priority applies:

1. **User data privacy and security**
2. **Explicit product/domain requirements**
3. **Approved specifications and acceptance criteria**
4. **Data integrity**
5. **Correct authentication and authorization**
6. **Automated verification and testability**
7. **Maintainability**
8. **User experience and visual consistency**
9. **Implementation convenience**

Convenience MUST NOT override security, data isolation, domain invariants, or explicit product requirements.

Any intentional deviation from these principles MUST be documented as a specification change.

---

## Governance

**Amendment Procedure:**

1. Material changes to principles MUST be proposed as specification amendments
2. Changes MUST be documented with rationale
3. Version number increments semantically:
   - MAJOR: Backward incompatible principle removals or redefinitions
   - MINOR: New principles or materially expanded guidance
   - PATCH: Clarifications, wording fixes, non-semantic refinements
4. All PRs MUST verify compliance with active constitution principles

**Compliance Review:**

* Specifications are checked against constitution principles before finalization
* Implementation decisions MUST justify any deviation from baseline principles
* Test mappings MUST reference applicable domain rules and acceptance criteria
* Final repository state MUST contain traceable evidence of spec-driven workflow

**Version Control:**

* This constitution is authoritative for all development work
* Changes to principles require explicit amendment documentation
* Prior versions MAY be preserved for historical reference but do not override active version

---

**Constitution Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
