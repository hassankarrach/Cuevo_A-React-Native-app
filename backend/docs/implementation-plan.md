# Cuevo Backend Implementation Plan

## Integration scope confirmed on 2026-11-24

The existing frontend plan in `doc/PROJECT_PLAN.md` selects **Music Track Vote**
and **Music Playlist Editor** as the two V.2 services. **Music Control Delegation**
(F-11) is deferred; it is not a prerequisite for the selected service scope.
See that plan for the V.2/V.7 service-count ambiguity requiring evaluator clarification.
`doc/PLAYBACK_DECISION.md` records host-only audio playback, with server-authoritative
queue/playback state and participant suggestions/votes. Host controls do not implement
the separate device/friend delegation service.

This merge accepts F-01 foundation only. Mobile screens, local state, fetch calls
and authentication flows remain unchanged. The proposed contracts below remain
proposals until coordinated against the frontend. Historical findings below describe
the backend author's isolated branch before it was merged with the frontend.

## 1. Brief findings

### Project context

- **Specified:** the project is named *Music Room* in `en.subject.pdf`; Version 6 describes a mobile, connected, collaborative music application.
- **Agreed:** the repository project is **Cuevo**. The React Native frontend uses Expo and is developed separately. The team has two people and owns the backend. This plan uses Cuevo in repository-facing text.
- **Specified:** the backend is the authoritative source of truth for service data (`en.subject.pdf`, section V.3, PDF page 10).
- **Specified:** the mobile application is a remote control for the backend and must support a configurable backend address (`en.subject.pdf`, section V.5, PDF page 10).
- **Specified:** Android or iOS is acceptable for the mobile client. The frontend message says Expo/React Native on iOS currently; this does not itself establish backend platform support (`message.txt`, line 3).
- **Specified:** at least two of Music Track Vote, Music Control Delegation, and Music Playlist Editor must be implemented (`en.subject.pdf`, section V.2, PDF page 8).
- **Specified:** the bonus topics are evaluated only after all mandatory requirements work and work correctly (`en.subject.pdf`, Chapter VI, PDF page 13).

### Reviewed sources

| Source | Result |
|---|---|
| `en.subject.pdf` | Read from PDF text. Key requirements are located in Chapters III-VII and PDF pages 5-14. |
| `message.txt` | Read. It defines four proposed frontend/backend phases and a detailed Phase 1 frontend contract to coordinate. |
| `README.md` | Read. It describes Cuevo UI progress and local Expo setup, but contains no existing backend implementation or backend API contract. |
| `backend/README.md` | Exists but is empty. |
| Repository state | `backend` branch is checked out. `git ls-files` is empty; the backend directory is otherwise untracked scaffold, and no application code, migrations, dependencies, or tests are present. |

**Naming:** use *Cuevo* for repository documentation and state that the official subject calls the product *Music Room*.

**Limitations:** this branch has no frontend source or backend source contract to inspect. The PDF and team message are therefore the primary evidence. The plan does not claim that the frontend endpoints, identifier formats, or profile UI payloads exist beyond `message.txt`.

## 2. Open decisions register

| ID | Decision | Position(s) | Impact | Severity | Suggested owner/action |
|---|---|---|---|---|---|
| OD-1 | Which two service functions satisfy V.2 | The subject requires at least two; it does not select which pair. The README and message describe playlist, room/voting, and delegation UI broadly. | Choosing fewer than all three can leave UI or evaluation gaps. | High | Backend/frontend agree whether to implement all three or explicitly select two before service feature sequencing. |
| OD-2 | Session/token contract | `message.txt` requests sessions, renewal and revocation; `en.subject.pdf` requires authentication but does not define token format. The proposed stack says JWT-based authentication, while storage and expiry rules are not given. | Affects mobile storage, logout, session theft controls and renew/revoke APIs. | High blocker for Phase 1 | Backend proposes; frontend confirms storage and renewal behaviour. |
| OD-3 | Verification/reset code contract | `message.txt` requires server validation but does not state code format, expiry or resend cooldown. | Blocks endpoint examples and test thresholds. | High blocker for Phase 1 | Backend proposes; frontend approves before implementation. |
| OD-4 | Profile/identifier/photo contract | `message.txt` asks for coordination on user/profile relationship, identifier format and photo upload. | Blocks profile API and photo implementation. | High | Backend and frontend agree a minimal profile schema and identifier format. |
| OD-5 | Profile/friendship ownership | `message.txt` says the frontend developer will contribute the profiles and friendships backend feature with backend review. | Duplicate models/APIs or ownership ambiguity may result. | Medium | Create shared conventions, then assign one implementation owner. |
| OD-6 | Google identity exchange | The subject requires social registration/linking; `message.txt` requires server identity verification but not a native SDK flow or provider audience. | Blocks provider linking and test fixtures. | High before provider work | Backend and frontend select a credential/token exchange and configure provider identifiers locally. |
| OD-7 | Event location/time and license rules | The subject gives a 4-6 PM example and requires location/time voting policy, but no exact radius, timezone or schedule contract is stated. | Cannot safely define policy fields or authorization. | High for room voting | Frontend/backend agree timezone, location source, radius and schedule shape. |
| OD-8 | Licenses and paid subscriptions | The subject requires license concepts for track voting, delegation and playlist editing. Subscription UI is bonus and no pricing or entitlement catalogue is given. | Entitlement logic cannot be finalized. | High for licensing; deferred for bonus | Define separate feature entitlements and invite/location policy inputs. Keep subscription products and payment provider unresolved. |
| OD-9 | Music catalog source | The subject does not define a provider or track identifier. `message.txt` asks for song catalog/search. | Blocks catalog/search implementation. | Medium | Decide whether the catalog is seeded, imported or provider-backed before catalog APIs. |
| OD-10 | Real-time transport details | WebSockets are proposed and the subject requires concurrent editing, but event names, ordering and reconnection semantics are unresolved. | Race and stale-state behaviour may differ across clients. | High for collaboration | Agree versioning, event envelope, room/playlist authorization and reconnection policy. |
| OD-11 | Music playback authority | The subject has live queues and delegation, while host-only playback is mentioned in README as an existing UI decision. | It is unclear whether playback state is server-authoritative or client-controlled. | High for rooms/delegation | Verify and document the host-only playback decision before implementation. |
| OD-12 | Offline synchronization conflict policy | The subject leaves this bonus open and warns of stale data and concurrency conflicts. | Offline semantics could change data loss risk. | Medium; defer until mandatory completion | Define sync version/vector and conflict winner only if offline work is approved. |

## 3. Architecture and stack rationale

### Proposed stack

| Choice | Responsibility | Assessment |
|---|---|---|
| FastAPI | REST API, OpenAPI, WebSocket endpoints and dependency injection | **Recommended.** Suitable for Python APIs and asynchronous WebSocket support. It needs team confirmation based on experience. |
| PostgreSQL | Authoritative relational data | **Recommended** for users, profiles, memberships, playlists, rooms, queues and transactional entitlement checks. |
| SQLAlchemy | ORM and persistence abstractions | **Recommended** if the team accepts the ORM and migration workflow; alternatives should not be added solely for variety. |
| Alembic | Schema migrations and upgrade history | **Required** with SQLAlchemy for reproducible PostgreSQL changes. |
| WebSockets | Realtime playlist/room updates | **Recommended** for the stated collaboration requirements; the implementation must be tested against reconnection and stale-state cases. |
| JWT authentication | Mobile authentication | **Recommended as a proposal, not a settled contract.** Access/refresh or opaque refresh-session details must be agreed with the frontend. |
| Pytest | Unit and integration testing | **Recommended** and suitable for FastAPI/SQLAlchemy projects. |

No Redis, message broker, cache, background-job system, extra database, microservice or orchestration platform is proposed for the mandatory baseline. If a later load test demonstrates a need, introduce only the smallest justified component.

### Logical architecture

The proposed boundaries are:

1. **API layer:** versioned HTTP routes and WebSocket handlers; request validation and stable error responses.
2. **Domain/services:** account lifecycle, authorization, visibility, entitlements, playlist operations, room queues and vote ranking.
3. **Persistence/repositories:** SQLAlchemy models and explicit database transactions for state changes and concurrency-sensitive updates.
4. **Infrastructure:** PostgreSQL, email delivery adapter, provider identity verification and configuration.

Backend-authoritative state should include accounts, credentials, verification/recovery state, identities, profiles, memberships, invitations, playlists, tracks, rooms, queues, votes, licenses/entitlements and audit events. Mobile state is disposable UI state and must not be treated as permission or ranking authority.

### Proposed API conventions

The following are proposals only, pending `OD-2`, `OD-3`, `OD-4`, and frontend review:

- Base path: `/api/v1`.
- JSON request/response bodies and RFC 3339 UTC timestamps.
- UUID public identifiers unless the team agrees on another stable format.
- Stable machine-readable error code plus HTTP status, human-readable message and optional field details.
- Cursor or offset pagination documented once and reused consistently.
- Bearer access token for protected HTTP endpoints.
- Explicit revoke/logout behavior and a separately agreed refresh/session contract.

Do not implement a final contract until shared conventions are documented and confirmed. OpenAPI must describe every shipped route with examples.

## 4. Requirements-to-feature traceability

| Requirement | Source | Feature(s) |
|---|---|---|
| Account registration via email/password or social account | PDF V.1, pages 7; message.txt lines 26-38 | F-03, F-04, F-05 |
| Email verification and forgot/change password | PDF V.1, page 7; message.txt lines 26-38 | F-04 |
| Link Facebook/Google account to existing account | PDF V.1, page 7; V.5, page 10 | F-05 |
| Public/friend/private profile information and music preferences | PDF V.1, page 7 | F-06 |
| At least two collaborative music functions | PDF V.2, page 8 | F-08-F-11, selection in OD-1 |
| Public/private event visibility and invited-only private access | PDF V.2.1, page 8 | F-09 |
| Voting, track ordering and vote concurrency | PDF V.2.1, page 8 | F-09 |
| Location/time and invited/license voting rules | PDF V.2.1, pages 8 | F-09, F-12 |
| Device-specific music-control delegation and friend control | PDF V.2.2, page 9 | F-11 |
| Public/private playlist and invited editing | PDF V.2.3, page 9 | F-08 |
| Realtime collaborative playlist with concurrency protection | PDF V.2.3, page 9 | F-08 |
| Backend authoritative data storage | PDF V.3, page 10 | F-01, F-02, F-07-F-12 |
| REST/JSON API with reference documentation | PDF V.4, page 10 | F-02, F-13 |
| Configurable backend address and remote-control client assumptions | PDF V.5, page 10 | F-01, F-13 |
| Access isolation, malicious-behaviour protections and logging | PDF V.6, page 11 | F-03-F-05, F-12 |
| Mobile action logs containing platform, device and app version | PDF V.6, page 11 | F-12 |
| Load/support measurement with server characteristics | PDF V.7, page 11 | F-14 |
| Team workflows, quality and one-off tests | PDF V.8, page 11 | F-13-F-14 |
| Secrets in `.env`, not git | PDF V.8, page 11 | F-01 |
| Multi-platform bonus | PDF VI.1, page 12 | B-01 |
| IoT reflection or mechanism | PDF VI.2, page 12 | B-02 |
| Free/paid subscription logic | PDF VI.3, page 12 | B-03 |
| Offline and synchronization bonus | PDF VI.4, pages 12-13 | B-04 |

## 5. Mandatory feature implementation plan

## F-01 — Backend foundation and environment

**Prompt**

You are a backend coding agent implementing the first runnable Cuevo backend increment.

### Role and objective

Create a minimal, reproducible FastAPI backend with environment loading, PostgreSQL configuration, SQLAlchemy, Alembic and a health endpoint. Do not implement product domain features in this feature.

### Project context

- The repository is on the `backend` branch and has a separate `backend/` directory.
- The backend is the source of truth for service data.
- The frontend is React Native/Expo and needs a configurable API base URL.
- The specification calls the product *Music Room*; repository-facing documentation must call it Cuevo and explain the naming.
- PostgreSQL, SQLAlchemy, Alembic and FastAPI are proposed only; inspect existing conventions before choosing final files.

### Prerequisites

- None. This feature establishes the foundation.

### Scope

Implement application startup, configuration, PostgreSQL connectivity, migration infrastructure and health/readiness behavior. Do not implement accounts, playlists or rooms.

### Requirements

- Create or use a conventional FastAPI application entry point under `backend/`.
- Load configuration from environment variables and provide `backend/.env.example` with safe placeholders. Never commit real credentials or secrets.
- Add PostgreSQL and SQLAlchemy dependencies with a clean-clone installation mechanism already expected by the repository, such as a requirements file or Makefile.
- Configure Alembic without creating speculative domain migrations.
- Add `GET /health` or another clearly documented health endpoint that reports process/API readiness and does not expose secrets.
- Include startup instructions for Linux/macOS and for the development database.
- Document a safe local-development database setup.

### Interfaces/contracts

No product endpoint is known yet. The health response shape must be proposed in code and OpenAPI.

### Security and correctness

- Fail closed for missing required configuration.
- Never log database passwords or provider secrets.
- Use separate development/test database configuration.
- Keep migration metadata and application startup reproducible.

### Tests

- Test application startup and configuration validation.
- Test the health endpoint.
- Test database configuration in an isolated test database or supported test setup.
- Test a no-secret configuration by proving placeholder values are documented and not committed.

### Acceptance criteria

- A clean clone can install dependencies using the documented command.
- Migrations initialize and upgrade successfully in a disposable PostgreSQL database.
- The API starts and the health endpoint succeeds.
- `.env.example` contains no credentials and required variables are documented.
- All required tests pass.

### Documentation

Update `backend/README.md` and relevant backend docs for setup and environment variables. Update the global `README.md` only with project-wide setup/navigation changes, as needed.

### Execution constraints

Inspect existing files before creating the project structure. Preserve unrelated user changes. Use no secrets, avoid speculative features and report changed files and exact test commands/results.

## F-02 — API conventions and shared error handling

**Prompt**

You are implementing shared API behavior for the Cuevo backend.

### Role and objective

Establish the versioned REST contract, validation behavior, stable errors, pagination, identifiers, timestamps and OpenAPI documentation conventions.

### Project context

- F-01 must provide an application, environment configuration and database startup.
- The mobile app is separate and needs stable, machine-readable response behavior.
- The proposed API path convention is `/api/v1`, but frontend confirmation is required before this becomes final.

### Prerequisites

- F-01.
- No unresolved API change should be hidden by F-02; record unresolved choices in the plan.

### Scope

Implement shared request/response infrastructure only. Do not implement authentication or domain resources.

### Requirements

- Create a versioned router convention based on the proposed `/api/v1` base path.
- Use JSON for request and response bodies.
- Define RFC 3339 UTC date handling and document timezone behavior.
- Propose UUID public identifiers or stop and record an open decision if the team has an identifier format.
- Implement consistent validation and stable error responses with HTTP status, machine-readable code, message and optional field details.
- Implement or document pagination consistently; do not mix cursor and offset conventions across product routes.
- Configure CORS only for agreed development origins.
- Publish route documentation and examples through FastAPI/OpenAPI.

### Interfaces/contracts

Define an error envelope and a validation-error shape; do not invent domain endpoint payloads.

### Security and correctness

- Never leak internal exception details.
- Normalize invalid JSON and malformed identifier responses.
- Add request-size limits and centralized exception handlers.
- Preserve stable public codes even if implementation details change.

### Tests

- Test successful JSON handling.
- Test malformed JSON and validation errors.
- Test unknown routes and unexpected server errors.
- Test each pagination or identifier convention introduced.

### Acceptance criteria

- All shared responses follow one documented contract.
- OpenAPI is reachable and includes stable error/validation examples.
- Invalid input uses documented status codes and machine-readable codes.
- Relevant tests pass.

### Documentation

Update `backend/README.md` and backend API documentation. Update the global `README.md` only if project-wide navigation/setup changes.

### Execution constraints

Follow F-01 conventions, avoid account-specific implementation and report exact test commands/results.

## F-03 — Authentication foundation and sessions

**Prompt**

You are implementing the Cuevo account authentication foundation.

### Role and objective

Implement secure password accounts, login, authenticated-user lookup, session renewal/revocation, logout and password hashing using the approved authentication contract.

### Project context

- The frontend flow requires sign-up, login, current-user lookup, session renewal and logout.
- The proposed stack is FastAPI, PostgreSQL, SQLAlchemy and JWT, but OD-2 and OD-3 remain open.
- The spec requires authenticated isolation and protection against brute-force/session theft.

### Prerequisites

- F-01 and F-02.
- The team must resolve session/refresh token format and expiry before final route names or mobile storage are documented.

### Scope

Implement email/password account access and session lifecycle. Do not implement verification or recovery in this feature, provider sign-in in F-05, or profile domain data beyond the minimum authenticated-user relationship.

### Requirements

- Implement secure account registration data and password hashing.
- Implement login and invalid-credential responses with a stable public error code.
- Implement authenticated-user lookup.
- Implement session renewal and logout/revocation using the frontend-confirmed contract.
- Store only the minimum server-side session or refresh state required for revocation and expiry.
- Add authentication dependency and authorization primitives for later features.
- Add explicit duplicate-email handling.
- Rate-limit authentication endpoints; document limits and behavior under rate limiting.

### Interfaces/contracts

Do not finalize endpoint names or the token envelope before OD-2 is resolved. Proposed route families are registration, login, `/me`, session renewal and logout. Document exact names and examples in OpenAPI.

### Security and correctness

- Hash passwords with an established password-hashing library; never store reversible password data.
- Treat email identity consistently, including a documented normalization rule.
- Protect against timing leaks where practical.
- Revoke a session on logout and define behavior for expired/revoked sessions.
- Include platform/device/app-version audit context if available with every authenticated mobile action.
- Prevent one user from accessing another user's data.

### Tests

- Registration success and duplicate email.
- Login success and invalid credentials.
- Authenticated `/me` success.
- Missing, malformed, expired and revoked session behavior.
- Session renewal success and failure.
- Logout revocation.
- Password hashing verification.
- Authentication endpoint rate-limit behavior.
- Authorization isolation across two test users.

### Acceptance criteria

- The frontend can complete register/login/current-user/logout flows against documented endpoints.
- Session renewal and revocation are observable and tested.
- Invalid credentials do not reveal account/password details.
- Stable error codes are documented.
- Required tests pass.

### Documentation

Update `backend/README.md` and backend authentication/API documentation with the session contract, client storage expectations and sample requests/responses. Update the global `README.md` as needed.

### Execution constraints

Do not commit credentials or secret keys. Preserve the team-confirmed API conventions and report exact test commands/results.

## F-04 — Email verification and password recovery

**Prompt**

You are implementing email verification and password recovery for Cuevo.

### Role and objective

Implement server-checked verification, resend, forgot-password, reset-code and change-password flows with a local-development email option.

### Project context

- F-03 establishes account/session primitives.
- `message.txt` explicitly requires verify email, resend, forgot/reset and change-password flows.
- Code format, expiry, resend cooldown and validation rules are open decisions.

### Prerequisites

- F-02 and F-03.
- OD-3 must be resolved before finalizing public endpoint behavior.

### Scope

Implement verification and recovery codes and delivery integration. Do not implement Google sign-in or profile data.

### Requirements

- Verify email ownership on server.
- Support resend with cooldown and documented duplicate/resend behavior.
- Support forgot-password reset and reset-code confirmation.
- Support authenticated password changes.
- Store code values securely, such as hashes, with expiry and one-time use semantics.
- Return stable `expired_code`, `invalid_code`, `duplicate_email`, `invalid_credentials` and equivalent frontend-translatable codes agreed with F-03.
- Rate-limit verification and code endpoints.
- Provide a local-development email option that does not require external delivery, such as console output or a documented local mail capture tool.

### Interfaces/contracts

Do not choose code length, alphabet, expiry or resend cooldown without team agreement. Once agreed, document exact route names, request fields, responses and examples in OpenAPI.

### Security and correctness

- Hash or otherwise protect code values at rest.
- Prevent enumeration where possible and document where enumeration remains observable.
- Invalidate superseded/used codes as agreed.
- Invalidate affected sessions when passwords change or reset, except as explicitly decided.
- Ensure password changes require current authentication or a valid verified recovery state.

### Tests

- Successful verification and resend.
- Invalid and expired verification codes.
- Successful reset and password change.
- Invalid and expired reset codes.
- Duplicate email behavior.
- Resend cooldown.
- Code replay prevention.
- Session invalidation on password reset/change where required.

### Acceptance criteria

- The frontend can verify, resend, recover and change passwords against the running backend.
- Codes are hashed/protected, expire and cannot be replayed.
- Local email delivery is reproducible.
- Stable errors are documented and tested.
- Required tests pass.

### Documentation

Update setup, email configuration, endpoint examples and recovery/session behavior in backend docs and `backend/README.md`. Update the global `README.md` only as needed.

### Execution constraints

Use `.env.example` placeholders; no real credentials. Do not commit mail-provider output or test credentials. Report exact test commands/results.

## F-05 — Google identity verification and account linking

**Prompt**

You are implementing Google sign-in integration for Cuevo.

### Role and objective

Implement server-side Google identity verification and explicit linking to an authenticated Cuevo account.

### Project context

- The subject requires social registration/linking and OAuth support in the mobile app.
- `message.txt` reserves native client integration for the frontend but requires backend token verification.
- Facebook or Google is accepted by the subject; the team message explicitly discusses Google sign-in and a linked-accounts UI.

### Prerequisites

- F-03 for account/session behavior.
- OD-6 resolved: native token type, provider audience/configuration and exchange contract.

### Scope

Implement Google identity verification and linking. Do not add a Facebook implementation unless separately agreed.

### Requirements

- Verify provider identity on the backend against the configured provider.
- Create or find an account only according to the explicitly agreed linking policy.
- Require authentication for linking a provider to an existing account.
- Prevent linking the same provider identity to two Cuevo accounts.
- Use provider configuration only through environment variables.
- Document provider setup and a reproducible test strategy.

### Interfaces/contracts

Define client/server token exchange only after OD-6. Do not design provider payloads from assumed SDK internals.

### Security and correctness

- Validate issuer, audience and provider-specific signature claims.
- Store provider subject identifiers rather than relying only on mutable email values.
- Avoid account takeover through an unverified email.
- Never log tokens or credentials.

### Tests

- Successful sign-in/link.
- Invalid/expired provider token.
- Wrong audience or issuer.
- Duplicate provider identity.
- Linking to another user's account is rejected.
- Explicit linking requires authentication.

### Acceptance criteria

- Backend accepts and verifies the approved Google credential and creates or returns the expected Cuevo session.
- Linking is authenticated and unambiguous.
- Configuration is documented with safe placeholders.
- Required tests pass.

### Documentation

Update backend authentication/provider setup docs and `backend/README.md`; update the global `README.md` only as needed.

### Execution constraints

No provider secrets in source control. Inspect existing auth conventions and report exact test commands/results.

## F-06 — Profile and friendship integration contract

**Prompt**

You are implementing the backend foundation for Cuevo public, friend-only and private profile data.

### Role and objective

Create the profile data model and API contract needed by the mobile profile flow while respecting the team’s stated frontend ownership of the profiles/friendships feature.

### Project context

- F-03 provides authenticated account identity.
- `message.txt` says the frontend developer contributes the profiles/friendships backend feature with backend review.
- `message.txt` lists display name/photo plus username, bio, location and preferred genres.

### Prerequisites

- F-03.
- OD-4 resolved for identifier and photo contract.
- OD-5 resolved for ownership and feature scope.

### Scope

Implement only profile data and visibility behavior agreed with the frontend owner. If friendship implementation remains the frontend developer’s responsibility, establish shared conventions and test interfaces, but do not duplicate ownership in the backend plan.

### Requirements

- Link profile state to its account without ambiguity.
- Implement public, friend-only and private profile field visibility according to the agreed ownership model.
- Support reading/updating the fields agreed in `message.txt`.
- Define photo upload or reference handling without assuming object storage.
- Define validation rules and stable profile error codes.
- Avoid returning private/friend-only fields to unauthorized viewers.

### Interfaces/contracts

Do not invent the friendship model or photo-storage provider until OD-4/OD-5 are resolved. Document exact routes and schemas in OpenAPI.

### Security and correctness

- Authorization must be based on server friendship membership if friendships are implemented.
- Prevent profile updates by non-owners.
- Validate text and image metadata.
- No private fields should appear in list/search responses unless explicitly authorized.

### Tests

- Owner updates profile.
- Non-owner cannot update.
- Public field visibility.
- Friend-only visibility.
- Private visibility.
- Invalid or missing profile fields.

### Acceptance criteria

- An authenticated user can complete the profile setup flow with the agreed contract.
- Visibility rules are enforced server-side.
- Identifier/photo behavior is documented and tested.
- Required tests pass.

### Documentation

Update backend profile/friendship ownership docs and API reference. Update `backend/README.md` and global `README.md` only as needed.

### Execution constraints

Coordinate rather than duplicating the frontend-owned implementation. Report exact test commands/results.

## F-07 — Shared music catalog and track model

**Prompt**

You are establishing the Cuevo music catalog used by playlists and rooms.

### Role and objective

Implement a small, authoritative catalog/search representation sufficient for track suggestions and playlist operations.

### Project context

- The subject does not specify a catalog provider or track identifier.
- `message.txt` proposes song catalog/search in the playlists phase.

### Prerequisites

- F-02.
- OD-9 resolved: seed/import/provider approach.

### Scope

Implement a catalog boundary and search/list operations. Do not implement voting or playlist editing.

### Requirements

- Define immutable track identity and the minimum metadata required to display/search tracks.
- Implement search and retrieval APIs agreed with the frontend.
- Support deterministic ordering for duplicate/search results.
- Keep provider-specific identifiers isolated if an external provider is selected.
- Document data provenance and cache-free source-of-truth rules.

### Interfaces/contracts

Do not invent a provider SDK or external API. Exact catalog fields and route names depend on OD-9.

### Security and correctness

- Validate catalog identifiers and search input.
- Prevent unauthorized catalog writes unless explicitly assigned.
- Record provider data changes safely and avoid mutable provider IDs.

### Tests

- Catalog retrieval.
- Search success and no-results behavior.
- Invalid and oversized search input.
- Duplicate/identifier consistency.

### Acceptance criteria

- The frontend can retrieve and search the agreed catalog.
- Tracks are referenced consistently by playlist and room features.
- Catalog source and authority are documented.
- Required tests pass.

### Documentation

Document catalog source, routes and setup in backend docs and `backend/README.md`. Update the global `README.md` only as needed.

### Execution constraints

Do not add an external provider without OD-9. Report exact test commands/results.

## F-08 — Playlist CRUD, permissions and realtime collaboration

**Prompt**

You are implementing collaborative playlist editing for Cuevo.

### Role and objective

Create backend-authoritative playlist CRUD, public/private visibility, invitations, licensing, realtime edits and concurrency protection.

### Project context

- This feature satisfies Music Playlist Editor from PDF V.2.3.
- It can operate in parallel with room/voting once shared catalog, auth and API conventions exist.
- The subject requires concurrent move/update safety and private invited-only access.

### Prerequisites

- F-03, F-06 conventions, F-07.
- F-02 for API/event contracts.
- OD-8 resolved for license behavior and OD-10 resolved for realtime event semantics.

### Scope

Implement playlist entities, membership/invitations, public/private access, edit permissions and realtime operations. Do not implement room queues or voting ranking.

### Requirements

- Create, retrieve, update and delete playlists according to ownership rules.
- Public playlists are accessible by every authenticated user by default, unless the spec's team contract adds restrictions.
- Private playlists are accessible only to the owner and invited users.
- By default every authorized user can edit a public playlist.
- With the agreed restricted license, only invited users can edit.
- Support ordered track positions and authenticated collaborative track moves/add/remove operations.
- Use database transactions and optimistic version checks or another explicitly documented concurrency mechanism.
- Broadcast playlist mutations over WebSockets to authorized subscribers.

### Interfaces/contracts

Do not invent event names or payloads until OD-10 is resolved. Document HTTP routes and WebSocket event envelope in OpenAPI or a linked API reference.

### Security and correctness

- Enforce visibility and edit permissions on every HTTP and WebSocket operation.
- Prevent moving/deleting stale positions through versioned updates.
- Reject non-member private access.
- Make mutation authorization and ranking/idempotency explicit.

### Tests

- Playlist CRUD ownership.
- Public/private retrieval.
- Default public edit permissions.
- Restricted invited-user edit permissions.
- Unauthorized edit/retrieval.
- Concurrent track moves of the same/different tracks.
- Realtime event delivery and subscription authorization.
- Reconnect/replay or stale-version behavior.

### Acceptance criteria

- Public and private visibility work server-side.
- Concurrent mutations preserve a single deterministic ordered playlist.
- Authorized clients receive realtime mutations.
- Unauthorized clients cannot read or edit private playlists.
- Required tests pass.

### Documentation

Update backend API/WebSocket, authorization and playlist data docs. Update `backend/README.md` and global `README.md` as needed.

### Execution constraints

Follow agreed license and realtime contracts. No unrelated room/vote implementation. Report exact test commands/results.

## F-09 — Room discovery, membership, visibility and voting queue

**Prompt**

You are implementing Cuevo live Music Track Vote rooms.

### Role and objective

Create public/private rooms, discovery and invitations, memberships, track suggestions, voting policies and deterministic queue ranking.

### Project context

- This feature implements PDF V.2.1.
- The subject requires public discovery by default and private invited-only discovery/voting.
- License rules may restrict voting to invited people or a location/time policy.

### Prerequisites

- F-03, F-06 conventions, F-07.
- OD-7 and OD-8 resolved for location/time and license rules.
- OD-10 resolved for realtime event semantics.

### Scope

Implement rooms, memberships, suggestions, votes and queue ranking. Do not implement playlist collaboration or playback-device control.

### Requirements

- Create and manage public/private rooms.
- Public rooms are discoverable and default-voting users can find/vote.
- Private rooms are discoverable/votable only by invited users.
- Let authorized users suggest tracks.
- Support one or more vote rules as agreed; document repeated vote behavior.
- Rank the queue so tracks with more valid votes move earlier.
- Implement server-side invited/license/location/time eligibility.
- Protect voting and room state with transactions.
- Coordinate playback state only after OD-11 is resolved.

### Interfaces/contracts

Do not invent room codes, location radius, timezone or 4-6 PM semantics. Document exact routes and event payloads after decisions are approved.

### Security and correctness

- Recompute or transactionally update ranking when concurrent votes arrive.
- Prevent duplicate/ineligible/unauthorized votes under the agreed policy.
- Treat room location/time checks only as server-supported authorization policy; never trust client-reported eligibility as final.
- Protect private room discovery and membership.

### Tests

- Public/private discovery.
- Invitation membership.
- Track suggestion authorization.
- Public default voting.
- Invited-only licensed voting.
- Location/time eligible/ineligible policy once contract exists.
- Concurrent equal/different-track voting.
- Queue ranking and tie behavior.
- Unauthorized/private room access.

### Acceptance criteria

- Room visibility and invitations are enforced.
- Valid votes are counted once according to the agreed rule.
- Concurrent votes produce no duplicate or lost ranking update.
- Queue position is derived from backend state.
- Required tests pass.

### Documentation

Update room/voting API, policy fields and WebSocket docs. Update `backend/README.md` and global `README.md` as needed.

### Execution constraints

No final location/time or license assumptions without open-decision resolution. Report exact test commands/results.

## F-10 — Room realtime membership and playback coordination

**Prompt**

You are implementing realtime room membership and playback coordination.

### Role and objective

Deliver authorized realtime room updates and any playback-state coordination agreed by the team.

### Project context

- F-09 establishes room state.
- The subject requires live collaboration but does not define a playback-state authority.
- `OD-11` must establish host-only versus delegated playback responsibility.

### Prerequisites

- F-09.
- F-08 or shared WebSocket conventions.
- OD-10 and OD-11 resolved.

### Scope

Implement room WebSockets, membership updates and playback state only if agreed. Do not implement a separate playback engine.

### Requirements

- Authenticate WebSocket connections.
- Authorize room access for join/subscription.
- Send membership, queue and playback updates in a versioned event envelope.
- Define disconnect/reconnect and stale-state behavior.
- Make the backend authoritative for agreed room/playback state.
- Make clients display and control state only within server authorization.

### Interfaces/contracts

No invented event names or payloads. Document exact event types and replay behavior.

### Security and correctness

- Reject unauthorized room subscriptions and mutations.
- Prevent stale playback operations.
- Preserve ordering and idempotency for accepted events.
- Use explicit close/error codes.

### Tests

- Authorized/rejected WebSocket connection.
- Room membership changes.
- Reconnect and stale state.
- Concurrent accepted/rejected playback actions.
- Event ordering and replay behavior.

### Acceptance criteria

- Only room members receive or mutate authorized room state.
- Reconnection does not expose stale or unauthorized state.
- Playback authority matches OD-11.
- Required tests pass.

### Documentation

Update WebSocket lifecycle, event contracts and security docs. Update `backend/README.md` and global `README.md` as needed.

### Execution constraints

No device playback implementation unless explicitly agreed. Report exact test commands/results.

## F-11 — Device-specific music control delegation

**Prompt**

You are implementing Cuevo Music Control Delegation.

### Role and objective

Implement device-specific attached-device state and licensed control delegated to friends.

### Project context

- The subject requires one license management rule specific to each user-attached device.
- The user can give music control to different friends.

### Prerequisites

- F-03 and F-06 conventions.
- OD-8 resolved for license/entitlement semantics.
- OD-11 resolved for playback authority if linked to live rooms.

### Scope

Implement device registration, ownership, delegated friends and authorized control operations. Do not implement hardware playback or a provider SDK.

### Requirements

- Link devices to exactly one owning account according to the agreed ownership model.
- Store device identifiers and metadata safely.
- Let owners grant/revoke control to approved friends.
- Enforce device-specific license/entitlement state.
- Record or reject control actions according to authorization.

### Interfaces/contracts

Do not invent device registration protocol or hardware capabilities. Agree routes and payload fields before implementation.

### Security and correctness

- Only the owner may attach or revoke ownership.
- Prevent one account from controlling another account's unlicensed device.
- Use explicit revocation and expiry behavior.
- Log control grants and actions.

### Tests

- Device owner registration.
- Unauthorized device registration/access.
- Grant/revoke delegation.
- Delegated action success and loss of access after revocation.
- Device-specific license enforcement.

### Acceptance criteria

- Device ownership and delegations are enforceable server-side.
- Revocation takes effect immediately.
- Required tests pass.

### Documentation

Update authorization/device/license API docs and `backend/README.md`. Update global `README.md` as needed.

### Execution constraints

No hardware integration without an explicit approved contract. Report exact test commands/results.

## F-12 — Security logging, audit trails and hardening

**Prompt**

You are hardening the Cuevo backend and completing cross-feature audit logging.

### Role and objective

Implement access controls, required mobile-action logs, security headers/rate limits and a documented hazard register.

### Project context

- PDF V.6 requires users not to access others' data and requires every mobile action to generate backend logs.
- Required mobile log fields are platform, device and application version.
- PDF V.8 forbids committed credentials.

### Prerequisites

- F-03-F-11 relevant domain features.
- Stable API conventions and authentication context.

### Scope

Implement logging, security middleware and hardening. Do not replace domain authorization with logging-only controls.

### Requirements

- Add/standardize authenticated action logs with platform, device and application version.
- Ensure every mobile mutation route can emit the agreed audit metadata.
- Log authentication failures, authorization failures and privilege changes without sensitive values.
- Identify brute-force, credential replay, session theft, provider token replay, private-room leakage and WebSocket abuse protections.
- Rate-limit public and privileged endpoints according to the agreed policy.
- Configure safe proxy, CORS and security-header behavior.
- Establish sensitive-data redaction.

### Interfaces/contracts

Log schema and event names must be documented, including correlation IDs and fields that are intentionally excluded.

### Security and correctness

- Audit logs must not contain passwords, reset codes, provider tokens or session secrets.
- Apply authorization server-side for every protected route.
- Establish retention/rotation behavior without claiming production compliance.
- Check abuse protections in tests.

### Tests

- Unauthorized access for each protected domain.
- Required mobile log fields.
- Sensitive value redaction.
- Brute-force/rate-limit behavior.
- Session theft/revocation.
- Private data leakage across users.

### Acceptance criteria

- Mobile actions produce documented audit records.
- Security middleware and protections are active.
- No sensitive values appear in logs or source.
- Required tests pass.

### Documentation

Add security/threat/hardening documentation and setup notes. Update `backend/README.md` and global `README.md` as needed.

### Execution constraints

Do not claim the API is unbreakable. Report exact test commands/results.

## F-13 — Integration test suite and API examples

**Prompt**

You are completing Cuevo backend verification and integration documentation.

### Role and objective

Create focused unit, integration and API/WebSocket tests and update API examples for frontend-ready flows.

### Project context

- Mandatory backend features should be complete or a selected subset clearly identified.
- The subject requires team quality, one-off tests and API documentation.

### Prerequisites

- F-03-F-12, with incomplete features blocked and reported rather than hidden.
- OD-1 resolved for the minimum two services or all selected services.

### Scope

Implement test coverage and examples. Do not add product features outside existing acceptance criteria.

### Requirements

- Add a test database strategy and reproducible test commands.
- Cover complete happy and failure flows.
- Add API examples for registration, verification, login, renewal, recovery, logout and selected product services.
- Verify OpenAPI route/error examples match shipped behavior.
- Add a test account or reproducible account creation procedure.
- Add CI-friendly test execution if repository conventions support it.

### Tests

- Unit tests for auth, permissions, licenses and ranking/concurrency logic.
- Integration tests for database migrations and protected endpoints.
- WebSocket tests for collaboration and authorization.
- Security regression tests for IDOR, private resources and token/session failures.

### Acceptance criteria

- The documented test command passes.
- The frontend can follow reproducible setup and API examples.
- Mandatory selected flows pass end to end against the running backend.
- Test and migration commands are in documentation.
- Required tests pass.

### Documentation

Update backend API README, testing documentation and setup. Update the global `README.md` only as needed.

### Execution constraints

Do not claim full success until all required tests run. Report exact test commands/results and any environment limitation.

## F-14 — Load testing and deployment/run evidence

**Prompt**

You are defining and executing Cuevo backend ramp-up evidence.

### Role and objective

Measure the API/backend capacity for the selected mandatory services and document server characteristics and reproducible load methodology.

### Project context

- PDF V.7 requires justified and measured simultaneous-user capacity.
- PDF V.7 provides no fixed threshold.
- No performance target has been established.

### Prerequisites

- F-13 and a running mandatory backend.
- Agreed test environment with CPU, RAM and deployment/premise details.
- OD-1 resolved for the services included.

### Scope

Define and run a load test for authentication and the selected two or more services. Do not claim an architecture-wide guarantee.

### Requirements

- Record server/runner CPU, RAM, OS, database location and network topology.
- Select and document AB, Gatling, Siege, Tsung or JMeter.
- Exercise realistic authentication and service action mixes.
- Measure latency, error rate and capacity saturation.
- Include repeated-room/voting and collaboration scenarios if relevant.
- State the test duration, ramp shape, concurrent users and data volume.
- Document failure/limitations instead of extrapolating unsupported limits.

### Tests

- Smoke load test.
- Incremental concurrency test.
- Failure/error threshold check.
- Database connection and migration consistency check.
- Repeated run or reproducibility check.

### Acceptance criteria

- A documented test command/scenario exists.
- Server characteristics are recorded.
- Maximum tested concurrency is reported with latency/error evidence.
- If targets exist, state their source and whether measured results pass.
- Required tests pass or the report identifies exactly what could not run.

### Documentation

Update backend performance/run/deployment documentation and `backend/README.md`. Update the global `README.md` only as needed.

### Execution constraints

Do not fabricate capacity. Report exact test commands/results and environment.

## 6. Bonus feature implementation plan

Bonus work must not begin until all mandatory scope selected for evaluation is complete and verified.

## B-01 — Multi-platform support

**Prompt**

You are adding Cuevo backend support for a bonus responsive web client or another platform.

### Prerequisites

- F-13 and F-14 with all mandatory work verified.
- The team has approved a web platform or other client contract.

### Scope

Keep existing mobile APIs compatible and add platform-neutral contracts only as needed. Do not rewrite mandatory behavior.

### Requirements

- Verify CORS/session behavior for approved web clients.
- Ensure API responses do not depend on iOS/Android fields.
- Document responsive web setup and integration.
- Test approved platform flows.

### Acceptance criteria

- The bonus platform can use documented APIs without server-side mobile assumptions.
- Tests pass and setup is documented.

### Documentation

Update global navigation/setup and backend platform integration docs as needed.

## B-02 — IoT/nearby-event reflection or mechanism

**Prompt**

You are implementing or documenting Cuevo IoT/nearby event support only after all mandatory work is complete.

### Prerequisites

- F-13 and F-14 complete.
- Product decision for iBeacon or another mechanism.

### Scope

Implement only the approved mechanism or a clearly labeled engineering reflection if implementation was not selected.

### Requirements

- Define location/privacy consent and backend visibility rules.
- Define event discovery data and iBeacon/provider identifiers.
- Document and test applicable authorization and opt-out behavior.

### Acceptance criteria

- Approved mechanism/reflection is explicitly documented.
- Location and event visibility follow agreed privacy rules.
- Tests pass if implementation is selected.

### Documentation

Update relevant backend and privacy docs as needed.

## B-03 — Free and paid subscription/entitlement

**Prompt**

You are implementing Cuevo free/paid entitlement logic as a bonus.

### Prerequisites

- F-13 and F-14 complete.
- OD-8 and payment/product rules resolved.

### Scope

Implement server-authoritative subscription and feature entitlements. Do not assume a payment provider or subscription catalogue.

### Requirements

- Define free and paid offers and entitlement states.
- Support approved plan switching and server-side feature restrictions.
- Integrate only an approved payment provider and store no payment secrets/cards unnecessarily.
- Apply entitlements to playlist and other selected features.

### Acceptance criteria

- Entitlement changes are enforced server-side.
- Plan switching behavior is documented and tested.
- No payment credentials are committed.

### Documentation

Update backend billing/entitlement docs and setup as needed.

## B-04 — Offline synchronization

**Prompt**

You are implementing Cuevo offline synchronization only after mandatory work is complete.

### Prerequisites

- F-13 and F-14 complete.
- OD-12 resolved.
- A bounded offline feature scope is agreed.

### Scope

Implement synchronization and stale-data/conflict handling only for approved features. Do not claim generic offline support.

### Requirements

- Define data versions and conflict resolution.
- Define stale read/write behavior.
- Define reconnect replay and conflict reporting.
- Prevent lost authorization or private-data access while offline.

### Acceptance criteria

- Synchronization behavior is deterministic and tested for accepted conflict cases.
- Stale data and duplicate operations are handled.
- Reconnect behavior is documented.

### Documentation

Update offline synchronization and conflict docs as needed.

## 7. Dependency and implementation order

### Recommended mandatory order

1. F-01 Foundation
2. F-02 API conventions
3. F-03 Authentication foundation
4. F-04 Email verification/recovery
5. F-05 Google sign-in
6. F-06 Profile integration contract
7. F-07 Shared catalog
8. F-08 and F-09 can proceed in parallel after F-07
9. F-10 Realtime room coordination
10. F-11 Device control delegation (deferred; outside the selected two-service scope)
11. F-12 Security/hardening
12. F-13 Integration suite
13. F-14 Load testing

F-08 and F-09 may overlap only after they share F-02, F-03 and F-07 conventions. F-11 may overlap with room/delegation work only after licensing and playback authority are agreed.

### Frontend Phase 1 order

The message.txt Phase 1 scope should be implemented in this order:

1. F-01 foundation
2. F-02 API convention
3. F-03 core accounts/sessions
4. F-04 email flows
5. F-05 Google proposal
6. F-06 profile contract
7. F-12 auth hardening subset
8. F-13 auth integration tests and examples

Profiles/friendships ownership (F-06/OD-5) must be agreed before implementation to avoid duplicate backend work.

### Service selection (resolved for the working scope above)

The following paragraph is the original branch assessment; the integration scope above supersedes it.

OD-1 is a blocker for exact mandatory completeness: the subject requires at least two, not all three. The plan includes all three service feature sets because the README/UI and message describe broad Cuevo functionality. Before implementation, the team must mark which are required for evaluation:

- Music Track Vote: F-09/F-10
- Music Playlist Editor: F-08
- Music Control Delegation: F-11

The final mandatory minimum may be two of these. Bonus work remains gated until all selected mandatory requirements pass.
