# Cuevo Backend Implementation Plan

## 1. Findings and review scope

### Project context

- **Specified:** The official subject is *Music Room*, Version 6. It describes a mobile, connected and collaborative music application. The repository and team handoff call the product **Cuevo**. Use Cuevo in the repository and API title, and note the Music Room subject name where traceability is useful.
- **Agreed:** The frontend is React Native + Expo; the handoff selects iOS as the first mandatory target. The current global README describes a mobile UI with mock/local state, not an integrated production client.
- **Agreed:** The backend is the authoritative source for accounts, permissions, memberships, votes, ordering, revisions, entitlements and playback state. Keep backend delivery separate from mobile API wiring and screen redesign.
- **Agreed:** The two selected mandatory services are **Music Track Vote** and **Music Playlist Editor**. **Music Control Delegation** is deferred, subject to the evaluation ambiguity in the open-decision register.
- **Agreed:** Host-only playback: the host phone plays audio, optionally through a speaker; participant phones do not play synchronized audio.
- **Agreed:** The backend is a single service used by the mobile application and, if selected later, a responsive web client. Do not create a second backend.
- **Current UI (handoff-reported):** Authentication/onboarding, profiles, playlist editing, rooms, queue/voting, playback controls, notifications, Plus previews, offline playlist snapshots and simulated nearby discovery are represented in the client. The handoff explicitly says these are not proof of backend behavior.
- **Repository state reviewed:** The checked-out branch is `backend` at `94c4f03`, following foundation commit `2cb0adf`. The existing backend contains FastAPI startup, PostgreSQL configuration, SQLAlchemy, Alembic, `/health`, and six unit/API tests; no account or product-domain APIs/models are present. The current checkout has no `mobile/` directory, so client details below are grounded in the handoff, the global README, and the catalog documentation, not direct inspection of mobile source.
- **Source-state caveat:** The backend and frontend teammate handoffs and original `message.txt` live in `backend/docs/`; the song catalog summary is in `backend/data/SONG_CATALOG.md`. The backend handoff says it was prepared 2026-11-24; it supersedes [`message.txt`](./message.txt) where more specific. It states the foundation was merged into `main` as `bdf89d1`, but the checked-out branch history observed here instead shows `2cb0adf` and `94c4f03`. Do not infer branch ancestry from that handoff statement; confirm Git history before any merge-related work.
- **Existing foundation verification:** The handoff reports six tests passed on Python 3.12 and migration SQL generation passed, but live PostgreSQL/migration execution was not verified because Docker was unavailable at that time. This planning task did not rerun tests. The backend README says Python 3.11+ while the handoff recommends Python 3.12 and reports pinned dependencies did not install on Python 3.14; verify and document the supported version.

### Sources reviewed

1. [`en.subject.pdf`](../../en.subject.pdf), Version 6: Objectives; IV.1–IV.2; V.1–V.8; VI.1–VI.4; VII. Relevant page/section citations are used below.
2. [`BACKEND_TEAMMATE_HANDOFF.md`](./BACKEND_TEAMMATE_HANDOFF.md), prepared 2026-11-24: especially §§1–15. Its status labels (**Agreed**, **Current UI**, **Proposed**, **Open**) are retained.
3. [`message.txt`](./message.txt): initial frontend phases and authentication/profile ownership requests; superseded by the handoff where more specific.
4. [`README.md`](../../README.md): project purpose, current mock/local UI scope, mobile setup and documentation links.
5. [`backend/README.md`](../README.md), [`backend/pyproject.toml`](../pyproject.toml), [`backend/requirements.txt`](../requirements.txt), [`backend/requirements-dev.txt`](../requirements-dev.txt), [`backend/.env.example`](../.env.example), the current app/database/migration modules and `backend/tests/`: current foundation and setup conventions.
6. [`FRONTEND_TEAMMATE_HANDOFF.md`](./FRONTEND_TEAMMATE_HANDOFF.md) and [`SONG_CATALOG.md`](../data/SONG_CATALOG.md): frontend integration context and the summarized metadata catalog/provenance.

The requested `backend/docs/implementation-plan.md` had been deleted in the worktree before this task. The user explicitly approved recreating that exact path. No application code, dependency manifest, migration, or other source document was changed for this plan.

### Responsibility boundaries

- **Backend teammate:** infrastructure, API/authentication, email/provider verification, catalog, playlist and room services, voting/playback state, realtime, server entitlements, synchronization APIs, proximity lookup, security, logs, tests, CI and measured performance evidence.
- **Frontend developer:** mobile screens/navigation, native provider integration, client credential storage, API/realtime integration, offline client, proximity detection and later web client.
- **Ownership update (2026-11-26):** The earlier handoff exception assigning the profiles/friendships backend feature to the frontend developer is superseded. The backend teammate implements the feature and authors/owns its migration; the frontend developer owns client integration. Reuse F02 account/auth/database conventions; do not create competing profile/friend models.
- **Shared:** API/error/event contracts, policy decisions, provider and playback choices, acceptance demonstrations, and later real-client integration testing.

### Current implementation update (2026-11-25)

F02 now implements email/password registration, verification, login, opaque
access and rotating refresh sessions, logout, reset/change-password, and
resumable account onboarding state. The auth-specific policy decisions
originally listed under D-10 and D-11 were resolved for this slice and are
recorded in [`auth-lifecycle.md`](./auth-lifecycle.md); production email
delivery remains blocked pending an approved adapter. The slice passed 31
tests on Python 3.13.1 with real PostgreSQL integration and a fresh Alembic
migration check. Profile/friendship implementation and migration ownership
have moved to the backend teammate; mobile integration remains a client task.
See [`profile-and-friendship.md`](./profile-and-friendship.md) for the approved
profile/friendship and PostgreSQL avatar-storage contracts.

### Current implementation update (2026-11-27)

F07 now implements the collaborative playlist editor and its
[`playlists.md`](./playlists.md) HTTP/WebSocket contract. D-05 playlist policy
decisions and the playlist-specific portion of D-07 are recorded as resolved;
the separate voting decisions in D-07 remain open for F09. The new
`0008_playlists` migration was applied to an isolated fresh PostgreSQL
database at `0008_playlists` (head), and Alembic reported no schema drift.
Playlist/seed integration tests passed (12 passed); the complete backend suite
passed on isolated PostgreSQL (141 passed, one existing Starlette deprecation
warning).
WebSocket fan-out is process-local; multi-worker deployments need a shared
event broker before claiming cross-process delivery. The current mobile
private create default remains a frontend integration fix.

F08 now implements the room lifecycle/access contract in
[`rooms.md`](./rooms.md) and adds the `0009_rooms` migration. Approved behavior:
public visitors can read/vote without joining; Join only changes the participant
roster. An accepted private invitation grants read access, while code redemption
requires an accepted invite and never grants private access itself. Codes are
six cryptographically random characters from the approved 32-symbol alphabet,
HMAC-digested at rest, expire after 24 hours, rotate/revoke immediately, and
throttle failures per account and IP. Host is implicit, host-only end is
terminal, and room visibility is distinct from vote eligibility. Licensed
invitee-only voting is represented but not enabled absent a room-policy
entitlement; location/time policy and evidence remain deferred. The existing
development seed command adds stable create-if-absent public/private demo
rooms. Room changes publish after commit and active WebSocket access is
revalidated. Focused/full verification for this implementation is recorded in
the delivery response; multi-worker fan-out remains process-local.

## 2. Requirement inventory and traceability

“Feature” references point to the ordered prompts in §7. Classification is the subject/handoff classification, not a claim that the backend already implements it.

| ID | Source and location | Requirement | Class / owner | Planned feature(s) and acceptance evidence |
|---|---|---|---|---|
| R-01 | Subject V.1, p.7; handoff §§7, 14 | Account creation with email/password or social account; validate email for password accounts; forgotten-password flow; link a social account; persist public, friends-only and private profile information and music preferences. | Mandatory / shared | F02–F04; server-driven registration, verification, recovery, identity linking and privacy tests. Google-only approved; Facebook out of scope (D-02 resolved). |
| R-02 | Subject V.2, p.8; handoff §§2, 15 | Deliver at least two of Music Track Vote, Music Playlist Editor and Music Control Delegation. The handoff selects Track Vote + Playlist Editor and defers Delegation. | Mandatory scope / team + evaluator | F07–F10 implement the selected two. V.7's three-service load-test wording remains unresolved (D-01); do not silently add Delegation. |
| R-03 | Subject V.2.1, p.8; handoff §§9, 10 | Suggest or vote for next tracks; higher vote ranking plays earlier; public/private event visibility; default public and everyone can vote; license-enabled invited-only or location/time voting; handle competition/concurrent votes. | Mandatory / backend + shared policy | F05, F08–F10; concurrent-vote tests, deterministic ranking and access-policy tests. Room visibility, public visitor Join, invitation access and default vote eligibility are resolved; vote mechanics and location/time remain open under D-06/D-07. |
| R-04 | Subject V.2.2, p.9; handoff §§2, 14 | Music-control delegation has per-device license and lets users delegate control to friends. | One of the three named services; deferred by team | Not in selected mandatory implementation. Confirm with evaluator because V.7 refers to three services (D-01). |
| R-05 | Subject V.2.3, p.9; handoff §§8, 10 | Real-time collaborative playlists; public by default and accessible to every user; private playlists accessible only to invited users; everyone may edit by default, with an invited-only edit option under the relevant license; handle competing edits. | Mandatory / backend + shared | F07; privacy, permissions, invitation, atomic revisioned edit, concurrency and reconnect tests. Current UI's private default conflicts with the subject (D-05). |
| R-06 | Subject V.3, p.10 | Backend stores service data and is the reference/source of truth. | Mandatory / backend | F02–F11; persistence, transaction and authorization tests; client state never overrides server truth. |
| R-07 | Subject V.4, p.10; handoff §§6, 10–11 | Document API methods, inputs and outputs; justify an API style; use/justify REST and JSON or an alternative. | Mandatory / backend + shared | F01 and each feature's OpenAPI updates; documented examples, stable errors and contract review. |
| R-08 | Subject V.5, p.10; handoff §§2–4 | Mobile clients act as remote controls; server address is configurable; social authentication is supported in the mobile application. | Mandatory / shared | Backend API support in F01–F03; client wiring is explicitly a later frontend task, not part of backend prompts. |
| R-09 | Subject V.6, p.11; handoff §13 | Protect user data from cross-account access and plan for brute force/session theft; identify practical protections. | Mandatory security / backend | F02–F11; object-level authorization, abuse, replay, privacy and redaction tests plus documented threat controls. |
| R-10 | Subject V.6, p.11; handoff §13 | Each mobile action generates backend logs containing platform, device and app version. | Mandatory operational / backend + frontend | F11; authenticated, bounded action ingestion and coverage evidence; client metadata is untrusted and secrets are redacted. |
| R-11 | Subject V.7, p.11; handoff §§13, 14–15 | Measure the number of simultaneous users supported by the services and record server characteristics. | Mandatory operational / backend | F11; reproducible load plan/results with environment, concurrency, duration, dataset, throughput, latency, errors, CPU/RAM and topology. Service-count ambiguity D-01 must be recorded. |
| R-12 | Subject V.8, p.11; handoff §13 | Work iteratively, test layers, integrate continuously, keep credentials/API keys/environment values out of Git. | Mandatory quality/security / backend | F00, F01, F11 and every feature prompt; CI, isolated tests, safe env templates, exact verified commands. |
| R-13 | Subject VI.1, p.12; handoff §§2, 12 | Bonus: make the service available as a responsive web application after the mobile service/API. | Bonus / frontend-led, backend support | B04 only after all mandatory requirements pass; use same API and authorization, then approve browser-origin/auth/CSRF behavior. |
| R-14 | Subject VI.2, p.12; handoff §12 | Bonus reflection on IoT; an iBeacon-like mechanism is an example of discovering nearby public events. | Bonus / shared | B03: first document feasibility/risks; implement lookup only if team elects it. Proximity never grants access to a private room. |
| R-15 | Subject VI.3, p.12; handoff §12 | Bonus: define free/paid offers and let users switch; some functionality may be paid-only. | Bonus / shared | B01 after mandatory acceptance and D-03 decision; persisted server entitlements, no real billing without explicit provider/product approval. |
| R-16 | Subject VI.4, pp.12–13; handoff §12 | Bonus: offline experience and synchronization, including conflicts/concurrency and obsolete client data. | Bonus / shared | B02 after mandatory acceptance; versioned, authorized and idempotent sync only after cache/write/conflict policy is approved. |
| R-17 | Handoff §§4, 10, 13–15; global README | Existing UI calls for profiles/search, invitations, in-app notifications, avatar, catalog, playlist/room discovery and setup/demo procedures. | Agreed integration scope / shared | F04–F08, F11; endpoint capability and demo acceptance. Handoff-reported UI types are not final backend schemas. |
| R-18 | Handoff §§2, 9, 11 | Host phone alone plays audio; WebSockets/REST are the transport direction; event schemas and playback provider are not finalized. | Agreed direction + open implementation detail / shared | F01, F07–F10; commit-before-broadcast and reconnect/resync tests; provider and host-failure decisions remain open (D-08). |
| R-19 | Handoff §§3, 10, 12, 14 | Optional native push is distinct from OS permission and in-app notification state. | Optional, not in subject bonus list / shared | Not planned as a required feature. Add only after team explicitly chooses provider, token lifecycle and consent contract. |
| R-20 | Frontend teammate update, 2026-11-26 | Provide persistent, documented development demo accounts via a rerunnable seed command; later extend the same command with sample playlists and rooms as those features land. Never duplicate, reset or delete existing data. | Agreed development/test support / backend | F02 establishes the guarded account seed command; F07 adds sample playlists using approved catalog IDs; F08 adds sample rooms. Repeated runs preserve existing and user-modified data. |

### Mandatory vs. bonus gate

The subject states bonus work is assessed only when the mandatory part is “PERFECT,” meaning all mandatory requirements are complete and work without malfunctioning (VI.4, p.13). Therefore B01–B04 are **gated and sequenced after mandatory acceptance**, not parallel MVP work. Preparatory UI, a simulated nearby result, an entitlement field, or an offline snapshot alone does not count as a completed bonus.

## 3. Open decisions and conflicts

Resolve the blocker items before finalizing affected contracts. The plan records proposals as proposals; no unresolved rule below is treated as settled.

| ID / severity | Positions and source | Impact | Owner / next action |
|---|---|---|---|
| **D-01 — Blocker for final scope/evaluation** | Subject V.2 (p.8) requires **at least two of three** services; subject V.7 (p.11) says measure simultaneous users using **three services**. Handoff §2 selects Track Vote + Playlist Editor and explicitly defers Music Control Delegation. | Could require a third service for evaluation/load tests even though two satisfy V.2. | Team asks evaluator whether the third service must be implemented or merely considered. Keep Delegation out of the committed roadmap until answered; report the tested service count accurately. |
| **D-02 — Resolved for social-auth scope** | Subject V.1 (p.7) names Facebook or Google. Product/security owner explicitly approved Google-only and supplied iOS/server OAuth client IDs, bundle ID and reversed URL scheme. | The backend implements Google native ID-token verification; this checkout contains no iOS project/source, so native SDK wiring remains a client-side task. | Google-only is the approved provider set; Facebook remains unsupported. Do not implement browser OAuth or trust client-supplied profile/token claims. |
| **D-03 — Blocker for subscription bonus only** | Subject VI.3 (p.12) says some features, “Music Playlist Editor for instance,” may be paid-only. Handoff §§2, 12 says mandatory defaults must remain usable and not be put behind an arbitrary paywall. | A subscription gate could make the selected mandatory playlist service inaccessible on Free, conflicting with the handoff's scope and the bonus assessment gate. | Product/evaluator explicitly decides whether paid-only gating applies to any mandatory feature. Until then, do not enforce a paywall on mandatory acceptance paths. |
| **D-04 — Resolved 2026-11-26: responsibility/migration ownership** | User confirmed the previous frontend-implementation/backend-review split is no longer current. | The backend teammate owns profile/friendship implementation and authors/owns its migration; frontend owns client integration. F02 account/auth tables remain shared and are not duplicated. | Resolved by explicit user decision; recorded in the handoff and this plan. No separate reviewer assignment was made. |
| **D-05 — Resolved 2026-11-27: playlist defaults and policies** | User confirmed the Music Room V.2.3 defaults: public visibility and everyone editing. Owner-only editing is also supported as an extra policy; invited-only editing remains a licensed owner-selected policy. For private playlists, only accepted invitees gain read visibility. | The mobile create screen reportedly defaults to private and must be corrected during later client integration; private mock fixtures are not server authorization. | F07 implements public/everyone defaults, owner-only policy, accepted-invitation visibility, and an active server-side `playlist_invited_edit` entitlement check. Frontend owns correcting its default; no mobile/private-fixture changes are part of F07. |
| **D-06 — Partially resolved 2026-11-27: room access and vote eligibility** | Owner approved public visitor read/vote without Join; Join adds roster membership. Private read access requires accepted invitation; host controls invitations and ending; ended is terminal. Visibility is separate from vote eligibility; public/everyone is default. | F08 implements these choices and represents `everyone | invitees`; invitees-only remains disabled until a room-policy license exists. Location/time policy, values and trusted client evidence limitations are still open. | See [room lifecycle/access contract](./rooms.md). Do not use profile city or BLE as trusted GPS evidence. Resolve location/time values, consent/denial behavior, client evidence age/accuracy and entitlement before enabling that policy. F09 still resolves vote value/ranking/re-suggest/cutoff rules under D-07. |
| **D-07 — Partially resolved 2026-11-27: playlist concurrency** | User confirmed one occurrence per song, 1–100 character names, 0–1000 character descriptions, hard deletion, expected-revision conflict behavior and idempotent operation IDs for F07. Vote values/ranking/re-suggest rules remain open for F09. | Playlist operations must serialize; stale operations must not overwrite committed state, and retries must not duplicate mutations. | F07 locks playlist rows, validates expected revision, records operation IDs/fingerprints, commits before event broadcast and returns `409 REVISION_CONFLICT` with `currentRevision`. Reorder requires the complete stable entry-ID set. Vote semantics remain open under D-07 for F09. |
| **D-08 — High: playback provider and host failure** | Handoff §§2, 9, 14 agrees host-only audio, but provider/SDK, playable IDs, host disconnect/transfer, completion semantics and failure recovery are open. Catalog artwork metadata is not playable audio. | Cannot claim functional playback or complete end-to-end Track Vote without a provider contract and real-phone proof. | Frontend/backend jointly prototype provider playback on a real phone; agree host absence, idempotent completion/skip, resume/end/restart semantics. Keep participant audio out of scope. |
| **D-09 — Resolved (2026-11-26)** | User approved username/field limits, `private` initial privacy, profile-field visibility, friend request transitions, unfriend effects and distinct-status-only Verified badge. Owner separately approved PostgreSQL avatar bytes, a 2 MiB limit, JPEG/PNG/WebP validation, and profile-matched read privacy. | Profile, friendship and avatar schema/API decisions are settled; migration `0005_profile_avatars` implements durable avatar storage. | Implemented and documented in the profile/friendship contract. Keep avatar optional for onboarding and do not accept device-local file paths. |
| **D-10 — High: authentication policy** | [`message.txt`](./message.txt) asks to agree code format/expiry/cooldown; handoff §7 treats six digits/15 minutes/30 seconds as UI facts/proposals, not backend rules. Token lifetimes, refresh rotation/reuse, email delivery and password byte/Unicode validation remain open. | Security and frontend renewal/error UX depend on these policies. | Backend proposes numeric code, expiry, attempt limits, resend cooldown, rate limits, email adapter, JWT access lifetime and database-backed refresh rotation/reuse policy; frontend/team approve before final contract. Reset request must remain non-enumerating. |
| **D-11 — Medium: API/session transport** | Handoff §§6, 14 proposes `/api/v1`, camelCase, opaque IDs, UTC RFC 3339, cursor pagination, a common error envelope, revisions/idempotency IDs, JWT access plus rotating refresh session; not yet agreed. | Contract changes affect every route and the native client; cookie vs. bearer transport also affects later browser support. | Freeze an OpenAPI contract and error/status catalog in F01. Choose native transport now; make a separate browser cookie/CORS/CSRF decision before B04. |
| **D-12 — Resolved (2026-11-27)** | Owner approved metadata-only reuse of the static `backend/data/songs.json` Apple iTunes Search API artifact, with no automatic refresh. The source artifact is present and validates to 40 distinct provider track IDs. | Do not use the artifact's slug IDs as server IDs, serve artwork, infer playable media, call/scrape Apple, or seed production by default. | `0006_song_catalog` and F05 implement opaque UUIDv5 IDs, a provider-name/track-ID mapping unique per provider, an additive guarded development import and documented F07 fixture. Attribution is the stored source provider, URL and retrieval date; refresh is manual only.
| **D-13 — Medium: API/setup support matrix** | Backend README says Python 3.11+; handoff §1 says pins were verified on Python 3.12 and did not install on 3.14. Live DB tests were not verified in the prior setup. | Clean-clone reproducibility and migration/test evidence are not established across the stated range. | F00 validates a supported Python version and PostgreSQL migration path; update docs based on actual results and never claim an untested support range. |
| **D-14 — Medium: offline scope** | Subject VI.4 (pp.12–13) requires planning synchronization/conflict/obsolete data but lets offline behavior differ; handoff §12 reports snapshots only, with pending edits and reconciliation undecided. | Read-only cache and offline edits require different API and data-loss guarantees. | Before B02, decide cached data, allowed offline actions, logout/account-switch cleanup, write queue, revision base, idempotency retention and conflict UX. |
| **D-15 — Medium: subscriptions/payment** | Handoff §12 says Plus is shown as 99 DH in current UI, but this is not approved pricing/currency/tax/benefit policy and no payment provider or real charging is selected. | Entitlement rules can be tested without payment, but production purchase/refund cannot be designed accurately yet. | Decide offers, currency/units, periods, benefits, effective dates/downgrade and whether real billing is in scope. Never store raw card data; do not treat session-only masked summaries as payments. |
| **D-16 — Medium: nearby/IoT details** | Subject VI.2 (p.12) suggests iBeacon-like nearby discovery; handoff §12 describes a phone/Mac identifier but leaves format, rotation, owner control and native device behavior open. | A simulated result is not real proximity; a beacon must not bypass private-room authorization. | Do reflection/feasibility first. If selected, agree identifier ownership/rotation, lookup limits, room privacy, native detection and real-device test criteria. |
| **D-17 — Medium: load-test target** | Subject V.7 refers to three services; handoff §13 recommends realistic tests for the two selected services and detailed host/environment evidence. No deployment topology or target capacity is specified. | Any numeric capacity claim without a test setup would be invented. | Resolve D-01, select a documented host/topology and test duration/dataset/concurrency; report measured throughput/latency/errors and resource use, not a promised capacity. |
| **D-18 — Low / optional scope** | Handoff §§4, 10, 14 mentions OS push registration/delivery as optional; the subject does not require push notifications. | Adding provider infrastructure and device credentials expands scope unnecessarily. | Defer push unless separately approved. In-app notification state and OS permission are not push delivery. |

## 4. Architecture and stack rationale

The proposal is to continue the simple modular FastAPI/PostgreSQL backend already present. The stack is an existing implementation direction and a user proposal, not a reason to add unneeded infrastructure.

| Choice | Status and responsibility | Fit and trade-offs |
|---|---|---|
| Python + FastAPI | Existing; continue | FastAPI provides typed HTTP routes and generated OpenAPI for the React Native contract. Keep a modular monolith; do not split services for a two-person team. Confirm supported Python versions in F00. |
| PostgreSQL | Existing; continue | Durable authoritative state, constraints and transactions fit identity, privacy, membership, ordered collections, votes and revisions. Isolate test DB from dev/prod; prove migrations on fresh PostgreSQL. |
| SQLAlchemy 2 + Alembic | Existing; continue | ORM/persistence and explicit migration history. Every domain feature owns its model/migration changes with agreed migration coordination; use constraints and transactions for cross-request invariants. |
| REST + JSON | Specified direction (V.4, p.10); continue | Familiar request/response contract and FastAPI OpenAPI. Keep `/health`; proposed product prefix `/api/v1`, camelCase JSON and cursor pagination require F01 agreement. |
| WebSockets | Handoff-agreed direction; implement only for realtime needs | Playlist and room state needs live updates. Authenticate and authorize each connection/subscription, broadcast only after commit, version events, bound queues/messages, and resync by fetching an authorized snapshot. Do not add a message broker until deployment/load evidence requires multi-process fan-out. |
| JWT authentication | User-proposed; validate and specify | A signed, short-lived access token can support native API calls; JWT alone does not provide immediate revocation. Pair with server-tracked, rotating refresh sessions and defined revocation/reuse behavior. Exact claims, signing-key management, lifetimes and storage remain D-10/D-11. |
| Pytest + HTTPX | Existing; continue | Existing dependencies/tests support unit and API checks. Use isolated PostgreSQL integration tests for persistence/concurrency and WebSocket tests for event behavior; do not rely only on mocked health tests. |
| Email and social providers | Required capability; Google native ID-token flow approved | Email adapter remains local-only. The backend verifies native Google ID tokens against the configured server audience; tests mock verification. No Web Client Secret or live credential belongs in source control. |
| Password hashing, throttling, file/media storage | Required capabilities; implementation details to choose during features | Use a maintained password-hashing mechanism and rate-limit sensitive operations. Decide storage only when avatar uploads or real media/provider integrations are specified. Do not choose an external storage/payment/mail vendor prematurely. |
| Redis, task queues, microservices, second database | Not proposed now | No demonstrated need in the current repository or two-person scope. Reconsider only if measured requirements or a selected external integration demand them. |

### Logical boundaries (proposals, not final schemas)

1. **HTTP routes/controllers** validate transport input and derive identity from verified credentials; schemas map to/from public DTOs.
2. **Services/domain operations** enforce permissions and product rules; they own transactional boundaries and prevent client-provided `creatorId`, `hostId`, role, score, badge or entitlement from becoming authoritative.
3. **SQLAlchemy persistence** stores account/session/challenge/provider identities; profile/privacy/friendship; catalog/provider track references; playlists/entries/invitations/revisions; rooms/memberships/queue/votes/playback revisions; notifications; approved entitlements; and security/audit events. These are logical areas only, not a frozen schema.
4. **Realtime delivery** publishes committed changes with resource revision and operation/event IDs. Viewer-specific fields such as `myVote` and permissions are returned per authorized viewer or fetched separately; never broadcast one user's private fields to every subscriber.
5. **Authoritative state:** backend owns identity, authorization, privacy, collection ordering, votes/scores, room membership, playback state, revisions, notification read state and entitlements. Client clocks may animate playback progress; local fixture state, client role claims and offline snapshots cannot overwrite server truth.
6. **External boundaries:** catalog metadata and playable media are distinct; payment provider, email provider, social identity provider, avatar storage, push and BLE radio are not interchangeable. Integrate only the explicitly selected service, validate its responses, and document failure behavior.

## 5. Proposed implementation order and dependencies

| Order | Feature | Prerequisite / gate | Parallel work |
|---:|---|---|---|
| 0 | F00 Foundation verification | Existing foundation; no new domain work | None until Python/test/DB/migration setup is reproducible. |
| 1 | F01 API conventions and errors | F00; frontend contract review | Contract review can run with planning of F02, but routes must follow the agreed shared envelope. |
| 2 | F02 Email/password account and session lifecycle | F01; D-10 decisions | F03 waits for account/session model. |
| 3 | F03 Google social login/linking | F02; approved native client IDs and account-link policy | Backend flow implemented; native iOS SDK wiring requires the iOS app source and does not block F04. |
| 4 | F04 Profiles and friendships | F01–F02; approved D-04/D-09 contract | Backend owns the profile, friendship and approved PostgreSQL avatar migrations; frontend handles client integration. F05 can run in parallel after F01/F00. |
| 4 | F05 Catalog and song search | F01; D-12 data source | Can run in parallel with F04; no playable provider assumption. |
| 5 | F06 In-app notifications | F02; notification DTO/access contract | Implement base read/list behavior; domain-specific producers are added with F04/F07/F08. Optional push is excluded. |
| 6 | F07 Collaborative playlist service | F01–F06 as needed; resolved playlist scope under D-05/D-07 | Implemented in this checkout; final migration/live PostgreSQL verification remains required. |
| 7 | F08 Room lifecycle and access | F01–F06; D-06 and join-code decisions | Can parallelize with F07 after shared invitation/notification contracts; share no unreviewed migrations. |
| 8 | F09 Track voting and queue | F05, F08; D-01/D-06/D-07 | Depends on authoritative room membership, song IDs and approved voting policy. |
| 9 | F10 Host playback coordination | F08–F09; D-08 | Do not claim complete playback until provider behavior is jointly proven on a real phone. |
| 10 | F11 Security, action logging, CI and load evidence | All mandatory APIs; D-01/D-17 | Security tests should be added throughout; this is the cross-feature acceptance and measurement gate, not a substitute for feature tests. |
| Bonus | B01 Subscription offers/entitlements | All mandatory requirements accepted; D-03/D-15 resolved | Must not make mandatory acceptance paths inaccessible without explicit approval. |
| Bonus | B02 Offline synchronization | All mandatory requirements accepted; revision/idempotency contracts stable; D-14 | Backend sync contract can be specified before frontend offline replay work; do not implement mobile cache here. |
| Bonus | B03 IoT/proximity | All mandatory requirements accepted; feasibility and D-16 resolved | Reflection/design first; native detection is frontend/device work. |
| Bonus | B04 Responsive-web backend support | All mandatory requirements accepted; web client decision and D-11 browser auth resolved | Backend browser-origin/session support only; web UI belongs to frontend work. |

## 6. Shared execution rules for every prompt below

Each feature prompt is intended to be copied and run independently. Repeat its local context and prerequisites; do not assume the coding agent has read the planning conversation.

- Work only on the existing `backend` branch and within existing repository conventions. Inspect the current code and applicable contracts first. Do not switch branches or overwrite unrelated work.
- Implement only the named slice. Do not wire mobile fetch calls, replace mock contexts, redesign screens, create a second backend, or add unapproved product behavior.
- Do not commit credentials, provider tokens, personal data or production configuration. Use ignored local `.env` files and safe placeholders in `.env.example`.
- Add focused tests and regression tests; run the focused tests and the backend suite (`cd backend && python -m pytest`) plus relevant PostgreSQL/migration/WebSocket checks. Report exact commands and results. If a required check cannot run, say why and do not claim the feature is complete.
- Update the global [`README.md`](../../README.md), [`backend/README.md`](../README.md) and relevant files under [`backend/docs/`](./) **as needed** when setup, architecture, database, API, auth, WebSockets, testing, performance or operations change. Keep docs aligned with code; do not make unrelated documentation edits.
- Report changed files, migration effects, environment variable names (never values), exact verification results, known limits, unresolved decisions and a deterministic demo procedure.

## 7. Feature-by-feature implementation prompts

### F00 — Verify the existing backend foundation

**Copy-paste prompt**

> You are the backend engineer for Cuevo, the repository project specified as *Music Room* Version 6. Verify the existing backend foundation before adding domain features. The repository already contains FastAPI, PostgreSQL configuration, SQLAlchemy 2, Alembic, `GET /health`, and six unit/API tests. Do not rebuild it or add account/domain tables in this task.
>
> **Prerequisite and scope:** Work on the existing `backend` branch. Inspect `backend/README.md`, the current settings/database/Alembic files, Compose setup, `.env.example`, tests and Git worktree. Confirm the supported Python version rather than assuming the README's Python 3.11+ range: the handoff reports Python 3.12 verification and a dependency-install failure on Python 3.14. Verify that tests target the isolated test database and never development/production data.
>
> **Implement only necessary foundation corrections:** On a clean documented setup, install dependencies, run the existing test suite, start isolated PostgreSQL, apply the current migration on a fresh test database, and verify `/health` when PostgreSQL is ready and unavailable. Check that configuration fails safely and does not expose database credentials. Do not generate speculative domain migrations. If a prerequisite cannot run, report the exact environmental blocker and leave it unclaimed.
>
> **Tests and acceptance:** Run `cd backend && python -m pytest`; execute the documented Alembic upgrade against a fresh isolated PostgreSQL database and test health readiness/unavailability. Record the exact commands and outputs. Acceptance requires a reproducible documented setup, isolated test DB, successful migration on fresh PostgreSQL, correct health status codes, and no secret leakage. State if Docker/PostgreSQL was unavailable.
>
> **Execution constraints:** Follow the shared execution rules in the plan: no unrelated edits, no mobile integration, safe environment examples, and update the global README, backend README and backend docs as needed. Report changes, test results and unresolved environment/version questions.

### F01 — Freeze API conventions, OpenAPI and error handling

**Copy-paste prompt**

> You are the backend API-contract engineer for Cuevo/Music Room. Implement shared HTTP conventions in the existing FastAPI backend. The mobile UI is a separate React Native/Expo client; do not wire it in this task. Product route names and DTOs are proposals until recorded in OpenAPI and reviewed with the frontend teammate.
>
> **Prerequisites:** F00 has verified the existing app and test setup. Preserve `GET /health`. Before finalizing conventions, review the proposed handoff contract: product paths under `/api/v1`; JSON camelCase; opaque string IDs; UTC RFC 3339 timestamps; durations in milliseconds with an `Ms` suffix; bounded cursor pagination `{ items, nextCursor }`; stable ordering; expected resource revision and operation/idempotency ID for retryable mutations; viewer-specific `permissions`; and a consistent error envelope with safe code/message, optional field errors, request ID and safe details.
>
> **Scope:** Add shared response/error handling for FastAPI validation, authentication, authorization, not-found, conflict, rate-limit and temporary-unavailable errors. Document proposed status mapping (422, 401, 403, privacy-safe 404, 409, 429, 503) and stable codes. Preserve enough flexibility to represent resource-specific errors without leaking private resource existence. Add OpenAPI examples and document the proposed WebSocket event envelope; do not build domain routes or invent unresolved business rules.
>
> **Correctness/security:** Never return exception traces, SQL, tokens, challenge material or secrets. Ensure request IDs are generated/propagated safely and do not trust a client-supplied identity. Document which items remain proposals for frontend approval.
>
> **Tests and acceptance:** Add tests for validation/auth/not-found/conflict/throttling/unavailable mappings, response shape, request ID and secret redaction. Run focused tests and `cd backend && python -m pytest`. Acceptance requires stable documented API behavior, generated OpenAPI containing examples, preserved `/health`, and no undocumented exception behavior. Report exact commands/results and blocked checks.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and relevant backend docs as needed; do not make mobile changes or commit secrets.

### F02 — Implement email/password accounts and sessions

**Copy-paste prompt**

> You are implementing Cuevo's email/password account lifecycle in the existing FastAPI/PostgreSQL backend. The frontend is React Native/Expo and its mock flow is Welcome → Sign up → Verify email → Set up profile → Introduction → Home. The backend, not the client, must decide whether an email is verified and whether a session is valid.
>
> **Prerequisites:** F00 and F01. Use the approved account, error and token contracts. Before freezing challenge/token policy, resolve with the frontend/team the handoff's provisional six-digit numeric code, 15-minute challenge lifetime, 30-second resend delay, email/password input limits, attempt limits, password Unicode/byte-length rules, email delivery adapter, access-token lifetime, refresh rotation/reuse behavior and concurrent refresh behavior. These are not already-approved server security rules.
>
> **Scope:** Implement email/password registration; server-generated, purpose-bound email verification challenges; verify/resend; login; authenticated current-user lookup; renewal; logout/revocation; non-enumerating password-reset request and one-use reset confirmation; authenticated password change; and resumable account/onboarding state with `emailVerified` distinct from `profileCompleted`. Use a maintained password hash, protect challenge/refresh material at rest, and add database constraints for account and session invariants. Deliver a safe local email-development procedure; use a test adapter for tests and do not log active codes. Do not implement social-provider verification or profile/friendship ownership here.
>
> **Contracts:** Use F01's error envelope and the handoff's suggested route capabilities (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/me`, `/auth/email/verify`, `/auth/email/resend`, `/auth/password/reset/request`, `/auth/password/reset/confirm`, `/me/password`) unless the reviewed OpenAPI uses equivalent routes. Document request/response examples and challenge expiry/resend timestamps. Never return hashes or challenge secrets.
>
> **Security and tests:** Rate-limit authentication, resend and recovery operations; cap challenge attempts; expire, replace and consume challenges correctly; prevent reset/account enumeration; reject invalid/expired/reused codes; test duplicate email, invalid credentials, unverified login policy, expired/revoked session, refresh rotation/replay, logout and unauthorized access. Verify a refresh token cannot be reused after rotation under the approved policy. Use real PostgreSQL integration tests for transaction/uniqueness behavior.
>
> **Acceptance:** Registration → verification → login → `/me` → refresh → password reset/change → logout/revocation works from documented API examples; challenge state is server-enforced; stable errors and rate limits are documented; local email procedure and deterministic account-creation/demo procedure are reproducible.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update the global README, backend README and relevant auth/API/security docs as needed. Do not change mobile screens/storage or introduce a real email vendor without approval. Report exact tests and any policy decisions still blocking release.

### F03 — Add approved social identity and account linking

**Copy-paste prompt**

> Google is the only approved provider; Facebook and browser-based Google authentication are out of scope. The native iOS OAuth client, server audience client, bundle ID and reversed URL scheme have been approved and are recorded in the auth lifecycle guide. The server Web client is used only as the native ID-token audience.
>
> **Prerequisites:** F01/F02 account/session contracts. Provider scope, OAuth configuration, native ID-token exchange, email-collision policy, explicit link/unlink policy and session revocation behavior are approved; do not ask for those decisions again. Verify Google identity server-side and never trust client-supplied profile data.
>
> **Scope:** For each approved provider, accept the intended native client credential/token exchange and verify it server-side against the provider's issuer, audience, signature/metadata and expiry. Create/login only under an explicit collision policy. Add authenticated link/unlink operations; never silently merge accounts. Prevent unlinking the last usable login method. Keep provider IDs separate from email and internal account IDs. Do not perform native OAuth UI integration or trust a client-supplied email/profile as proof.
>
> **Security/tests:** Test valid/invalid/expired/wrong-audience tokens, provider outage, account collision, unauthenticated linking, linking an identity already owned by another account, unlinking the last login method and refresh/session revocation as agreed. Use provider test keys/fakes; no live credentials in tests or docs.
>
> **Acceptance:** Approved provider flows are documented in OpenAPI with safe examples; server identity verification and explicit link/unlink behavior pass automated tests; disabled/unapproved providers are not represented as working features.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and relevant auth docs as needed. Do not implement browser OAuth. If the checkout has no iOS source/project, do not fabricate a second app; document the native SDK setup and report that client integration is blocked by the missing source. Report providers tested and exact test commands/results.

### F04 — Implement profiles and friendships

**Copy-paste prompt**

> The backend teammate owns the profile/friendship backend slice and authors/owns its migration; the frontend developer owns client integration. Reuse the established F01/F02 account IDs, auth dependencies, database/model conventions and do not duplicate account/session/provider tables.
>
> **Approved contract:** Trim and lowercase usernames matching `[a-z0-9_]{3,30}`, globally unique and changeable with immediate release of the former name. Display name is 1–40 characters, bio 500, location 100, preferred genres are at most 20 unique values of 1–50 characters. New profile privacy is `private`; display name/username/privacy are always visible, while bio/location/genres follow `public|friends|private` and hidden fields are omitted. Crossed friend requests auto-accept; duplicate same-direction requests conflict; only the recipient accepts/declines, only the sender cancels; either friend may unfriend and a new request is required to reconnect. Verified badge requires a distinct verified-account status, not verified email.
>
> **Avatar boundary:** No object-storage provider or durable URL/access policy is approved. Defer avatar upload/replace/delete, media validation and image availability behavior; do not emit local `file://` URLs or invent an ephemeral storage contract.
>
> **Tests/security:** Test own/friend/stranger access for every privacy level, private-field omission, relationship state transitions and edge cases, cross-account mutation, and migration upgrade/downgrade only in an isolated database. Ensure profile output and any future search/count surfaces do not leak hidden profiles/fields. Avatar validation and inaccessible/deleted-image tests wait for approved storage.
>
> **Acceptance:** The implemented profile/friend contracts are in OpenAPI; only permitted fields are returned; relationship operations are deterministic and authorized; a reproducible disposable test account/profile procedure is documented. Avatar operations remain explicitly unimplemented until their storage contract is approved.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Backend teammate owns implementation and validates auth/database consistency and the migration chain. Update the global README, backend README and relevant profile/privacy docs as needed; do not modify mobile state or silently change ownership.

### F05 — Provide a stable song catalog and search API

**Copy-paste prompt**

> You are implementing Cuevo's backend song metadata/catalog and search contract for Music Track Vote and collaborative playlists. The frontend handoff reports 40 local metadata fixtures with Apple iTunes references, summarized in [`SONG_CATALOG.md`](../data/SONG_CATALOG.md). The checkout has no `mobile/` source; the owner-approved metadata-only artifact is now available at `backend/data/songs.json` (D-12). These records are not playable audio assets and do not establish a selected playback SDK.
>
> **Prerequisites:** F00/F01. The owner approved metadata-only reuse of the static `backend/data/songs.json` artifact, an additive checked-in JSON import with no automatic refresh, source-provider/URL/retrieval-date attribution, and uniqueness by normalized provider name plus exact provider track ID (D-12). Revalidate the artifact before importing. Do not fabricate songs, scrape a provider, serve unapproved artwork, or infer playback capability from metadata. F07's sample-playlist extension uses the stable IDs in [`SONG_CATALOG.md`](../data/SONG_CATALOG.md).
>
> **Scope:** Implement stable opaque internal song IDs, separate provider name/track IDs, documented metadata fields, song detail, text/genre search, bounded cursor pagination and deterministic ordering. Include relevant fields only when sourced and approved (for example title, artist, album, durationMs, genres, release date, artwork reference, provider source). Protect provider identifiers from being mistaken for internal IDs. Search privacy filtering must occur before results and counts; do not add unrelated grouped-search UI behavior.
>
> **Tests/security:** Test query validation, pagination boundaries/order, provider-ID uniqueness policy, metadata normalization, missing/retired provider records and unauthorized/private result filtering where applicable. Test migrations with the approved seed/import mechanism and prove the test fixture has documented provenance. If an approved dataset permits development fixtures, document a small deterministic fixture with stable song IDs for F07's additive demo seed; do not make those records production defaults without an explicit decision.
>
> **Acceptance:** Playlist/queue APIs can reference stable server song IDs; API docs explain metadata provenance and the explicit distinction between metadata and playable media; search output is reproducible and does not depend on fixture slugs. If F07 demo playlists are approved, their seed can resolve documented catalog IDs reproducibly.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and catalog/API docs as needed. Do not add a playback SDK/provider until D-08 is resolved; report the data source and exact test commands/results.

### F06 — Add durable in-app notifications

**Copy-paste prompt**

> You are implementing Cuevo's authenticated in-app notification API. The handoff reports a mobile list with friend-request/friend-accepted, room/playlist invitations, playlist updates and room activity, read state and destinations. It also distinguishes OS notification permission from server push delivery. Implement in-app data only unless push is separately approved.
>
> **Prerequisites:** F01/F02 account IDs, stable error/pagination contract and an agreed notification DTO. Resource-specific producers are added by the profile, playlist and room features; do not invent invitation acceptance rules here.
>
> **Scope:** Persist recipient-scoped notifications; list unread/read items with cursor pagination; expose unread count; mark one/all read; use server timestamps and authorized resource references rather than trusting display text or destination IDs. Define a safe extensible notification kind and make the recipient the only account allowed to read/update it. A notification must never grant access to the referenced profile, playlist or room; re-check resource authorization on navigation/action.
>
> **Security/tests:** Test cross-account read/mark-read rejection, pagination stability, duplicate producer delivery/idempotency policy, unavailable/deleted destination behavior, privacy-safe actor summaries and no disclosure of hidden resources. Ensure logs do not include tokens or private payloads.
>
> **Acceptance:** API can provide durable in-app unread/read state and resource references for later domain producers; OpenAPI examples use UTC server times; frontend can translate kinds without parsing hard-coded message strings. Do not claim OS push works.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and relevant API docs as needed. Defer native token registration and push-provider delivery; report tests and any producer contracts pending.

### F07 — Implement collaborative playlist editing

**Copy-paste prompt**

> You are implementing Cuevo's mandatory Music Playlist Editor backend. Music Room V.2.3 (p.9) specifies public-by-default playlists, access for every user when public, invited-only access when private, and everyone-editable by default with an invited-only licensed option. The handoff reports the current client create screen defaults to private; follow the subject for the server default and record the client mismatch for later integration. Do not expose private mock fixtures.
>
> **Prerequisites:** F01–F06 as needed, canonical accounts/friendships, song IDs, notification base and approved D-05/D-07 decisions. The approved rules are: support owner-only editing; private visibility starts only after invitation acceptance; reject duplicate songs; trim names/descriptions to 1–100/0–1000 characters; hard-delete playlists and cascade entries/invitations; allow invited-only editing only to owners with the active server-side license. F02/F04 provide the development-only additive seed command and persistent demo accounts; F05 provides approved catalog records usable by demo playlists.
>
> **Scope:** Implement create/read/list/search/update and agreed delete/archive; public/private visibility; effective owner/collaborator/everyone edit permissions; invitation send/respond/revoke; stable playlist-entry IDs; atomic add/remove/reorder; authorized snapshot with revision and updatedAt; and WebSocket updates for committed edits/invitations. Keep playlist ownership separate from entry-level authorship. Reject unauthorized private reads before returning records/counts. Validate all permission checks server-side. No last-write-wins replacement of the full playlist.
>
> **Development demo data (R-20):** Extend the F02 development seed command with a representative playlist owned/collaborated on by the persistent demo accounts and referencing only approved F05 catalog IDs. Seed only when absent using stable seed-owned identifiers/markers; rerunning must not duplicate, reset or overwrite user-modified demo resources and must not delete any data. Keep the command's development/local-database guard; never seed sample playlists in production or as part of migrations. If the F02 command is not yet available, coordinate its creation rather than adding a second competing seed mechanism.
>
> **Concurrency/realtime:** Mutations carry expected revision plus operation ID/idempotency key under the approved F01 contract. Commit domain state before broadcasting; order events per playlist and include revision/event ID. Detect stale edits with the agreed conflict response; on reconnect or revision gap the client fetches the latest authorized snapshot. Do not broadcast viewer-specific permissions as shared state.
>
> **Tests/security:** Integration tests with at least two accounts for public/private access, invitations/revocation, permissions, unauthorized operations, duplicate/retry behavior, simultaneous add/remove/reorder, stale revision, atomic rollback, websocket authorization/revocation, event order and reconnect/resync. Test migration on fresh PostgreSQL.
>
> **Acceptance:** Public/everyone defaults match the subject; private access is limited to authorized invitees; concurrent edits produce deterministic committed state or explicit conflicts; live clients can recover from a missed event via snapshot; examples and all errors are documented. Running the development seed command repeatedly creates at most one sample playlist and preserves all pre-existing or user-modified data.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and relevant playlist/realtime docs as needed. Do not change the mobile private default in this backend task; report the required frontend integration correction and exact tests/results.

### F08 — Implement room lifecycle, discovery and access

**Copy-paste prompt**

> You are implementing Cuevo's room/event lifecycle and access-control backend needed by Music Track Vote. The subject V.2.1 (p.8) specifies public events as discoverable and votable by all and private events as findable/votable only by invitees. The handoff reports a six-character join-code UI and leaves whether public visitors must explicitly join unresolved. Visibility and vote eligibility are separate concepts; do not conflate them.
>
> **Prerequisites:** F01/F02, F04 friendship/invitation coordination and F06 notification base. The approved room contract is recorded in [`rooms.md`](./rooms.md): public visitors may read/vote without joining; Join adds roster membership; accepted private invitations grant read access; a code never grants private access; host-only invitations/end; terminal ended state; active public discovery; and separate visibility/vote eligibility. Codes use the approved alphabet, randomness, expiry, rotation, revocation and throttling contract. Reuse the F02/F04 development-only seed command and its persistent demo accounts.
>
> **Scope:** Implement authenticated create/read/update/end, public/private discovery and search, join/leave, participants/count, current viewer role/capabilities, invitation send/respond/revoke, and approved join-code redemption/rotation. Derive host from authenticated creator, not request payload. Public defaults to public per subject. Private search, counts, code errors, activity and WebSocket subscriptions must not reveal private-room existence to unauthorized users. Persist room state and membership transactionally.
>
> **Development demo data (R-20):** Extend the F02 development seed command with representative sample rooms hosted by the persistent demo accounts. Use stable seed-owned identifiers/markers and create-if-absent behavior; rerunning must not duplicate, reset or overwrite user-modified resources or delete any data. Exercise public/private access only according to approved room rules. Keep seeding restricted to a local development database, never production or migrations; coordinate with the existing seed command rather than creating a parallel mechanism.
>
> **Policy boundary:** Model visibility separately from vote eligibility so F09 can enforce the subject's default and licensed policies. Invitees-only eligibility is represented but not selectable without a room-policy entitlement. Location/time eligibility is unavailable until remaining D-06 values and client evidence limitations are approved. Do not use profile city text or BLE proximity as trusted GPS evidence.
>
> **Tests/security:** Test public discovery/join, private invite-only access, invalid/expired/reused/throttled codes under the approved contract, membership transitions, host permissions, participant privacy, ended rooms, cross-account access, and authorization revocation on active realtime subscriptions.
>
> **Acceptance:** Room lifecycle, membership, invitations and search are durable and authorized; responses do not leak private resources; documented examples work with opaque server IDs; room changes publish only after commit. Re-running the development seed command creates at most one of each sample room and preserves all pre-existing or user-modified data.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and relevant room/invitation docs as needed. Do not wire mobile screens or claim proximity/location voting until its decisions and device evidence exist; report exact test commands/results.

### F09 — Implement atomic track suggestions, voting and queue ranking

**Copy-paste prompt**

> You are implementing the mandatory Music Track Vote queue/voting backend for Cuevo. The subject says users may suggest or vote for the next track and a track with many votes moves earlier; it explicitly calls out competition between simultaneous votes (V.2.1, p.8). The handoff proposes `-1/0/1`, one vote per room/queue entry/user, descending net score then insertion order, stable queue-entry IDs distinct from song IDs, and no voting on the current track. Confirm these proposed details and re-suggest/duplicate/suggestion-removal rules before treating them as final.
>
> **Prerequisites:** F01, F05 stable song IDs, F08 room/membership/access policy and a resolved eligibility matrix D-06. Subject defaults everyone can vote; a license may narrow eligibility to invited users or location/time. Keep any license/entitlement authorization distinct from room visibility and from the Plus subscription bonus.
>
> **Scope:** Implement suggest, remove only under approved policy, set/withdraw vote, authoritative ranked queue snapshot and viewer-specific `myVote`. Resolve actor from authentication. A vote request sets the user's current value and must never increment repeatedly on retry. Enforce uniqueness and score/order updates transactionally; establish deterministic insertion tie-break ordering. Queue entry ID is an occurrence; song ID identifies catalog metadata. The current track is excluded from upcoming ranking unless an approved rule states otherwise.
>
> **Concurrency/security:** Use a database constraint and transaction/locking strategy so simultaneous same-track and different-track votes cannot double-count or lose ranking updates. Recheck room membership, invitation/license and policy on every mutation. Handle vote/cutoff races with playback advancement in F10. Apply revisions/operation IDs and safe 409/eligibility errors from F01.
>
> **Tests:** Real PostgreSQL concurrency tests for repeated requests, simultaneous votes, one-user vote changes, withdraw, tie ordering and queue mutations; access tests for public/private/invited/location-time policy; current-track and ended-room restrictions; websocket committed event and resync tests. Do not use only mocked DB tests for race guarantees.
>
> **Acceptance:** Ranked results are stable, server-authoritative and reproducible; concurrent requests preserve invariants; viewer-only fields are not broadcast to other users; API documents score and ordering semantics, eligibility and conflict errors.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and relevant voting/realtime docs as needed. Do not invent geofence values or claim GPS anti-spoofing; report exact tests/results and unresolved policy decisions.

### F10 — Coordinate host-authoritative playback state

**Copy-paste prompt**

> You are implementing Cuevo's host-authoritative playback coordination. Agreed handoff rule: only the host phone plays audio, optionally through a speaker; participant phones suggest/vote and observe shared state but do not play synchronized audio. The backend is authoritative for playback state, but no music provider/SDK, playable catalog mapping or host-disconnect behavior has been selected.
>
> **Prerequisites:** F01, F08 room lifecycle, F09 ranked queue, and explicit D-08 decisions for provider identity/SDK, playable IDs, host availability, transfer/timeout, end/restart and completion acknowledgment. If provider decisions are still open, implement only the agreed provider-neutral state contract and clearly mark actual audio playback incomplete; do not claim end-to-end readiness.
>
> **Scope:** Provide host-authorized play/pause/seek/skip/remove/end commands and a versioned playback snapshot with current queue-entry ID, status, positionMs, serverTime and revision (or the approved equivalent). Require expected revision/transition or idempotency IDs. A completion/skip retry must not advance twice; client clocks may animate elapsed time but cannot advance tracks authoritatively. Publish state after transaction commit. Include explicit idle/empty/ended behavior.
>
> **Security/correctness:** Only the current authorized host can issue playback commands. Recheck host/session validity on each request and subscription. Reject stale transition/completion events and handle provider errors without falsely marking a track as playing. Do not add synchronized participant audio or infer a playable asset from catalog artwork metadata.
>
> **Tests and acceptance:** Test host/non-host permissions, stale revision, duplicate completion, concurrent skip/completion, empty queue, ended room, host session revocation and realtime state ordering. Jointly demonstrate the selected provider on a real phone before calling provider playback complete; record device/OS/provider/account prerequisites and failure behavior.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and playback/realtime docs as needed. Do not select a provider, billable account or client integration without approval; report exact commands/results and remaining blockers.

### F11 — Complete security, mobile-action logging, CI and load evidence

**Copy-paste prompt**

> You are completing cross-cutting mandatory security, audit/action logging, CI and performance evidence for Cuevo's backend. This work supplements feature-level tests; it must not substitute for them. The Music Room subject V.6 requires protecting user data and backend logs for every mobile action with platform, device and application version; V.7 requires a measured capacity estimate and server characteristics; V.8 requires tests/continuous integration and secret-safe configuration.
>
> **Prerequisites:** F00–F10 are implemented to their accepted contracts. Resolve D-01 (whether the selected two services or all three must be included in load tests) and document the actual tested scope. Select and record the deployment/test topology and supported Python/PostgreSQL versions.
>
> **Scope:** Add or complete authenticated, validated client-action ingestion with bounded payloads and server actor/request IDs; define coverage so every mobile action is represented without treating client metadata as trusted. Redact passwords, verification/reset codes, access/refresh/provider tokens, raw payment details and other secrets from application/security logs. Add CI for backend tests/lint/type checks already supported by the repository, using isolated PostgreSQL where required. Verify clean-clone dependency/setup/migration instructions and safe production configuration. Build a repeatable load scenario for authenticated actions, simultaneous votes, playlist edits and WebSocket fan-out/reconnect.
>
> **Measurement:** Record CPU, RAM, OS, topology, database, dataset, duration, concurrent clients, throughput, latency percentiles, errors and resource saturation. Report measured limits and test methodology; do not promise a capacity number without results or extrapolate beyond the environment. Confirm rate-limit and abuse protections under concurrent load. Do not add Redis/brokers solely to improve a synthetic result.
>
> **Tests/acceptance:** Cross-account and object-level authorization suite across HTTP/search/WebSockets/images/notifications; brute-force/session replay/rate limit checks; action-log completeness/redaction; fresh-database migration; CI run; and repeatable load results. Report exact commands, test data, environment and failures. Acceptance requires all mandatory feature criteria to pass and the test report to distinguish verified evidence from unrun tests.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and security/operations/testing docs as needed. No secrets, production data or unrelated refactors; report changed files and exact results.

## 8. Bonus implementation prompts — only after mandatory acceptance

Do not begin these while any mandatory requirement is incomplete or malfunctioning. The subject's VI.4 says bonuses will not be evaluated unless every mandatory requirement is complete and working.

### B01 — Add free/paid offers and server entitlements

**Copy-paste prompt**

> You are implementing the optional Free/Plus subscription and entitlement bonus for Cuevo, only after the mandatory backend passes its acceptance gates. The handoff reports a Plus display price of 99 DH but explicitly says it is not an approved price/currency/tax/benefit catalog; no real payment provider or charging is selected. Subject VI.3 (p.12) permits some features to be paid-only, while the handoff says mandatory defaults must remain usable. Resolve D-03/D-15 with the product/evaluator before gating any feature.
>
> **Prerequisites:** All mandatory requirements are accepted; approved offer identifiers, currency/amount units, billing period, benefits, start/end/effective dates, expiry, downgrade/cancel behavior, badge semantics and decision on real billing. Keep email verification separate from subscription status.
>
> **Scope:** Persist offers and account entitlements; document offer listing/current status and approved switch/cancel operations; enforce approved entitlements server-side on each gated operation. If real billing is not approved, implement only non-payment entitlement switching for test/demo accounts. If billing is approved, use provider tokenization/references, verify signed webhooks and make renewal/refund/activation idempotent. Never store or log raw PAN/CVV; masked local UI summaries do not prove a card or subscription.
>
> **Tests/acceptance:** Test Free/Plus transitions, expiration/downgrade, unauthorized gated actions, mandatory access according to D-03, duplicate/out-of-order webhook events if billing is included, and secret/card-data redaction. Acceptance requires server-derived entitlement state and documented demo switches; no real charge is claimed unless verified with an approved provider sandbox.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and subscription/security docs as needed. Do not start before mandatory completion, add a payment SDK/provider without approval, or commit payment credentials. Report exact tests/results and all out-of-scope billing behavior.

### B02 — Add versioned offline synchronization APIs

**Copy-paste prompt**

> You are implementing the optional backend synchronization contract for Cuevo's offline bonus. Subject VI.4 (pp.12–13) requires planning for conflicts/concurrency and obsolete mobile data; it does not prescribe which actions work offline. The handoff reports account-scoped SQLite playlist snapshots with server revision/cache time, but no durable pending-edit queue or reconciliation behavior. This task is backend only; do not implement the mobile cache or offline UX.
>
> **Prerequisites:** Mandatory features are accepted; F07 revisions and idempotency are stable; D-14 defines allowed cached data/actions, account-switch/logout cleanup, read-only versus queued edits, operation types, base revision, retention and conflict UX.
>
> **Scope:** Provide authorized snapshot/revision fetch and, only if approved, bounded operation replay carrying operation ID, resource ID, base revision, type/payload and client timestamp. Deduplicate replay safely, reauthorize at replay time, validate operations against current state, and return committed revision or explicit conflict/rejection. Never blindly replace a server playlist with cached JSON. Define stale snapshot behavior and protect private data after access revocation.
>
> **Tests/acceptance:** Test duplicate replay, out-of-order operations, stale revisions, simultaneous online/offline edits, revoked membership, account isolation, malformed/oversized payloads, retention expiration and deterministic conflict responses. Acceptance requires reproducible sync examples and proof that replay cannot bypass current authorization or overwrite newer state silently.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and offline/sync docs as needed. Do not edit frontend SQLite code; report exact tests/results and any unsupported offline operation.

### B03 — Evaluate and optionally implement nearby IoT room lookup

**Copy-paste prompt**

> You are handling the optional IoT/proximity bonus for Cuevo. Subject VI.2 (p.12) calls for reflection and gives iBeacon-like nearby discovery as an example; the handoff reports only simulated nearby fixtures and proposes identifier-to-room lookup. First deliver a short feasibility/security decision in backend documentation; do not mistake simulated results for real BLE support.
>
> **Prerequisites:** Mandatory requirements are accepted. Product/team has chosen whether to implement proximity; D-16 approves identifier format/ownership, registration, rotation/expiry, room privacy, rate limits, mobile permissions/background behavior and actual device validation. The frontend teammate owns native broadcasting/detection and real-device UI tests.
>
> **Scope if implementation is approved:** Add only the authenticated backend registration/lookup/authorization needed to resolve a beacon identifier to a minimal accessible public-room summary. Keep proximity separate from authentication, room membership and voting eligibility. Proximity alone never grants private-room access. Define rotation/revocation and prevent identifier enumeration or replay according to approved policy.
>
> **Tests/acceptance:** Test valid/expired/revoked identifiers, unauthorized/private room filtering, rate limits, enumeration/replay attempts and minimal response fields. The bonus is not complete until the native detector/broadcaster is demonstrated on target hardware and the API lookup is jointly tested; fixture results do not qualify.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and IoT/security docs as needed. Do not implement mobile BLE code or invent identifiers/crypto policy; report reflection findings, exact tests and device evidence separately.

### B04 — Prepare the backend for a responsive web client

**Copy-paste prompt**

> You are preparing Cuevo's existing backend for the optional responsive web client described in subject VI.1 (p.12). This is backend compatibility work only; the frontend teammate owns web UI. The web client must use the same API, IDs, authorization and realtime behavior—do not create a second backend.
>
> **Prerequisites:** All mandatory requirements are accepted and the team has selected a web origin and browser authentication transport. Resolve D-11's browser session, cookie, CSRF, CORS and allowed-origin behavior before configuration. Do not enable wildcard credentialed CORS or place bearer tokens in URLs.
>
> **Scope:** Add only required server-side browser-origin and authentication support, with explicit production allowlists, safe cookie attributes if cookie sessions are chosen, CSRF protections for cookie-authenticated mutations, and WebSocket origin/session checks. Preserve native bearer behavior. Document deployment variables as safe names/placeholders and ensure development origins are distinct from production.
>
> **Tests/acceptance:** Test allowed/disallowed origins, preflight behavior, credential handling, CSRF rejection where applicable, websocket origin/authentication, session expiry/revocation and regression of native API behavior. Acceptance is backend browser compatibility only; do not claim a responsive web app until the separate client is implemented and tested.
>
> **Execution constraints:** Follow the shared execution rules in the plan. Update global README, backend README and deployment/auth docs as needed. Do not add a web framework or loosen CORS for convenience; report exact tests/results and approved origins/transport without exposing secrets.

## 9. Dependency and completion summary

### Mandatory path

`F00 → F01 → F02; then F03 (when approved) and F04 + F05; then F06 → F07 + F08 → F09 → F10 → F11`

- F04 and F05 can proceed in parallel once F00/F01 and shared account/API conventions are stable, with coordinated migrations.
- F07 and F08 can proceed in parallel after shared invitations/notification and realtime conventions are agreed; avoid simultaneous unreviewed changes to common models/migrations.
- F09 requires room access, catalog IDs and an approved voting-policy matrix.
- F10 requires F09 plus an explicit playback/provider contract and real-phone proof.
- F11 is a cross-cutting acceptance gate, but authorization, privacy, error handling, migration and tests must be implemented in each feature rather than deferred to F11.

### Bonus path

Only after all mandatory requirements are demonstrated as complete and functioning: `B01`, `B02`, `B03`, and `B04` can be prioritized independently once their own decisions/prerequisites are approved. B02 depends on stable revisions/idempotency; B03 depends on device feasibility and room privacy; B04 depends on browser auth/origin decisions. Optional push notifications remain outside the required plan unless the team explicitly adds them.

### Definition of a ready slice

A slice is not frontend-ready just because its endpoint returns HTTP 200. It is ready only when its agreed OpenAPI/error/event contract, authorization and privacy behavior, migration path, focused automated tests, exact verification results, safe configuration, deterministic demo procedure and known limitations are documented and reviewed with the frontend teammate. Record unverified live PostgreSQL, provider, device, browser or load checks explicitly; do not claim them complete.
