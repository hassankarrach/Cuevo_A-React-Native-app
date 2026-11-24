# Cuevo: frontend-to-backend handoff

Prepared 2026-11-24 for the backend teammate and their coding agent.

## 1. Purpose and how to use this document

Build the complete backend for Cuevo while preserving the existing mobile experience. This document supplies frontend facts, agreed scope, suggested API shapes, remaining decisions, ownership, and acceptance criteria. It supersedes `message.txt` where this document is more specific.

Status labels matter:

- **Agreed:** existing team/product decision; implement consistently.
- **Current UI:** observed local implementation; not necessarily a production rule.
- **Proposed:** recommended contract to review before depending on it. No endpoint or DTO below is already implemented unless explicitly stated.
- **Open:** requires a product/provider/contract decision; record the answer rather than silently guessing.

This document describes the working tree, including frontend changes not yet committed or pushed. Before implementing against a referenced file, check that your checkout contains it. Do not assume the backend branch alone contains the latest frontend.

The backend foundation was merged into `main` as `bdf89d1`. It contains FastAPI, PostgreSQL configuration, SQLAlchemy, Alembic, `/health`, and six unit/API tests. It has no account/domain tables or product APIs; the initial migration establishes migration metadata only. Those six tests passed on Python 3.12; migration SQL generation passed. Live PostgreSQL/migration execution was not verified because Docker was not running. Pinned dependencies did not install on Python 3.14; use the documented Python 3.12 setup.

**Current instruction: keep backend implementation separate from mobile fetch/API wiring.** Do not replace mobile contexts, connect authentication, or redesign screens as part of backend delivery. Supply documented, tested contracts first; frontend integration is a later coordinated step. Backend completion will still require later integration testing with real clients.

## 2. Agreed scope and choices

| Topic | Decision |
| --- | --- |
| Product | Cuevo; official subject title is Music Room, version 6 |
| Mandatory services | Music Track Vote and Music Playlist Editor |
| Music Control Delegation | Deferred; do not add device/friend delegation to the mandatory roadmap |
| Subject ambiguity | V.2 explicitly requires at least two of three services; V.7 later says three services for load testing. Confirm with evaluator; do not claim the ambiguity is resolved |
| Mobile | React Native + Expo; iOS is the first mandatory target |
| Backend | Continue the merged FastAPI/PostgreSQL/SQLAlchemy/Alembic foundation |
| Shared state | Backend is authoritative for identity, authorization, memberships, votes, ordering, revisions, entitlements and playback state |
| Playback | Host phone alone plays audio, optionally through a speaker. Participants suggest/vote and see shared state; their phones do not play synchronized audio |
| Transport | REST/JSON plus WebSockets is the existing architecture direction; exact routes/events remain to be frozen |
| Web | Separate responsive web application at the end, using the same backend; do not adapt mobile UI to web now |
| Bonuses | Plan for subscriptions, offline synchronization, IoT/proximity and responsive web; mandatory correctness takes priority |
| Payments | Current screens are previews. No payment provider or real charging requirement is settled |

A host's play/pause/seek/skip controls are part of room playback, not an implementation of Music Control Delegation. Subject access-policy “licenses” and paid Plus subscriptions must be modeled separately. Do not put mandatory default access behind an arbitrary paywall.

## 3. Ownership and coordination

Backend teammate leads infrastructure, authentication, email flows, provider identity verification, catalog, playlists, rooms/votes, realtime, authoritative playback state, entitlements, synchronization APIs, proximity lookup, security, logs, tests, CI and performance evidence.

Frontend developer leads mobile screens, navigation, client session storage, native provider integration, API integration, realtime consumption, offline client, proximity detection and later the web client.

**Existing split:** frontend developer contributes the profiles/friendships backend feature, with backend teammate review. Establish shared account IDs, authentication dependencies, database conventions and migration ownership first. Do not independently build a competing profile/friendship model. If ownership changes, explicitly record it.

For each slice: propose OpenAPI schemas/examples and errors, record contract decisions, implement server behavior and tests, provide a reproducible demo, then coordinate client integration. Backend teammate may choose internal tables and modules without reproducing React component structure.

## 4. What already exists on the client

| Area | Existing experience | Backend support needed |
| --- | --- | --- |
| Authentication | Login, sign-up, email verification/resend, recovery/reset, change password, Google buttons | Real accounts, challenges, sessions, provider exchange/linking |
| Onboarding | Welcome → sign-up → verify email → profile setup → introduction → Home | Verified-account and profile-completion state; resumable flow |
| Profiles | Own/other profile, display name, username, avatar, bio, location, genres, badges | Privacy-filtered profile reads/updates, avatar upload, friendship state |
| Home/search | Rooms, playlists, grouped results for rooms/playlists/songs/profiles | Authorized paginated lists and search |
| Rooms | Discovery, search/filter, create, six-character join code, detail, participants, activity, queue, suggestions, votes, host controls | Room lifecycle, access rules, membership, invitations, queue and playback coordination |
| Playlists | Create, list/detail, metadata/privacy/edit-policy editor, add/remove/reorder songs, invitations | Durable transactional collaborative editing and realtime |
| Notifications | In-app list with read state and invitation/friend response previews; OS permission screen | Durable notifications/actions; optional native push registration/delivery |
| Settings | Profile/privacy, linked accounts, password, backend address, payment methods, help | Persisted account settings and relevant account APIs |
| Subscription | Plus offer, method selection and final review; masked session-only method summaries | Server offers/entitlements and agreed switching flow; billing only if selected |
| Offline | Account-scoped SQLite playlist snapshots, save/read in detail flow | Revisioned snapshots and eventual synchronization contract |
| Nearby | Animated search/stop/results with fixture public rooms | Real detector integration and authorized beacon-to-room lookup |

Loading skeletons and discovery delays are previews, not API timing requirements. Nearby is simulated, not real BLE detection. OS notification permission is not backend push registration. Local SQLite snapshots are not a completed offline synchronization system.

## 5. Current TypeScript types and important mappings

These are **current UI types**, not final API schemas. Paths are relative to the repository root.

```ts
// mobile/src/state/ProfileContext.tsx
 type LocalProfile = {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  genres: string[];
  avatarUri: string | null;
};

// mobile/src/state/SettingsContext.tsx
 type Visibility = 'public' | 'friends' | 'private';
 type PrivacySettings = { bio: Visibility; location: Visibility; genres: Visibility };

// mobile/src/data/mockPlaylists.ts
 type Playlist = {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  collaboratorIds: string[];
  private: boolean;
  editPolicy?: 'owner' | 'collaborators' | 'everyone';
  songIds: string[];
};
 type PlaylistDetails = Pick<Playlist, 'name' | 'description' | 'private'> & {
  editPolicy: 'owner' | 'collaborators' | 'everyone';
};

// mobile/src/state/MockRoomsContext.tsx
 type RoomRole = 'host' | 'participant' | 'visitor';
 type RoomVisibility = 'public' | 'private';
 type RoomOptions = { visibility: RoomVisibility; genre: string };

// mobile/src/state/roomQueue.ts
 type Vote = -1 | 0 | 1;
 type QueueTrack = {
  id: string; songId?: string; title: string; artist: string;
  addedBy: string; duration: string; tint: string;
  order: number; score: number; vote: Vote;
};
 type Playback = {
  tracks: QueueTrack[]; currentId: string | null;
  isPlaying: boolean; elapsed: number; ended: boolean; nextOrder: number;
};
```

Mapping requirements:

- `self`, names, slugs, `Date.now()` IDs, seeded scores and mock join codes are fixtures. Real IDs must be stable server identifiers. Clients treat them as opaque strings.
- Never trust client-supplied `creatorId`, `hostId`, `addedBy`, role, score, badge or entitlement claims. Derive actor/ownership from authentication.
- `addedBy` currently holds display text; the API should supply an account ID and an authorized actor summary.
- `QueueTrack.id` identifies a queue occurrence; `songId` identifies the recording. Keep them distinct. Likewise use stable playlist-entry IDs for reorder/remove operations.
- UI `duration` is formatted `m:ss`; APIs should return numeric `durationMs`. UI `elapsed` is seconds; proposed playback API below uses milliseconds with an explicit adapter.
- UI `score` is seeded aggregate excluding the viewer's local `vote`; UI sorts by `score + vote`. Proposed server `score` includes all committed votes and returns `myVote` separately. The client adapter must not add the viewer's vote twice.
- `tint`, bundled `require()` images, gradients and layout values are presentation concerns. They are not mandatory database columns or transport values.
- `private: boolean` can map to API `visibility: 'public' | 'private'`; document the conversion.
- API revisions are proposed as opaque strings because the current SQLite `server_revision` is `string | null`. Internal integer revisions can be serialized as strings.
- Privacy-hidden fields must be omitted or explicitly marked unavailable. Do not send sensitive data and ask the UI to hide it.

### Catalog source and fields

`mobile/src/data/songs.json` contains 40 metadata fixtures. `songs.ts` adds local bundled covers. Each JSON record has `id`, `title`, `artist`, `album`, `durationMs`, formatted `duration`, `genre`, `genres`, `releaseDate`, `coverFile`, `artworkUrl`, and `source: { provider, trackId, url, retrievedOn }`.

These are Apple iTunes Search metadata/artwork references, **not playable audio assets or a chosen playback SDK**. Provider track IDs are strings. Preserve the provider and ID separately from the internal song ID. Do not infer legal playback access or provider account capability from this catalog. See `mobile/src/data/SONG_CATALOG.md` for provenance.

### Notifications and payment summaries

```ts
// mobile/src/data/mockNotifications.ts
 type NotificationKind = 'friend-request' | 'friend-accepted' |
  'room-invite' | 'playlist-invite' | 'playlist-update' | 'room-activity';
 type NotificationDestination = { type: 'profile' | 'room' | 'playlist'; id: string };
// Existing list also uses id, actorId, title, message, minutesAgo, read,
// destination, and optional response: 'accepted' | 'declined'.

// mobile/src/state/paymentMethods.ts
 type PaymentMethod = {
  id: string; brand: string; lastFour: string;
  expiryMonth: number; expiryYear: number;
};
```

Use server timestamps instead of `minutesAgo`; use invitation/request resource IDs to authorize response actions. Notification text/destination is not permission to access the target. Payment summaries are display data, not proof that a card was tokenized or charged.

## 6. Proposed shared API conventions

The following are proposals to freeze in OpenAPI, not existing implemented contracts.

| Concern | Proposed convention |
| --- | --- |
| Paths | Product HTTP APIs under `/api/v1`; preserve current `/health` |
| JSON | camelCase keys to reduce client adaptation; Python may use internal snake_case |
| IDs | Opaque string IDs, preferably UUIDs; no reliance on fixture slugs |
| Dates | UTC RFC 3339 timestamps; date-only release dates remain `YYYY-MM-DD` |
| Durations | Milliseconds with `Ms` suffix; schedules include explicit timezone semantics |
| Pagination | `{ items, nextCursor }`, with bounded limit and documented stable ordering |
| Authentication | Bearer access token; proposed rotating refresh session; finalize exact lifetimes and token transport |
| Concurrency | Expected revision on mutations, atomic commit, new revision in response/events |
| Retries | Client operation ID or idempotency key on retryable mutations; bounded deduplication retention |
| Capabilities | Return viewer-specific `permissions`/eligibility for UI; enforce again on every mutation |
| Errors | Stable code, safe message, optional field errors, request ID; never expose secrets |

Example error:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "The playlist changed. Refresh and try again.",
    "fields": {},
    "requestId": "opaque-request-id",
    "details": { "currentRevision": "12" }
  }
}
```

Define HTTP status mapping: validation 422, authentication 401, forbidden 403, unavailable/hidden resource 404 where appropriate, revision conflict 409, throttling 429 with retry metadata, temporary unavailable 503. Document all FastAPI validation/auth exceptions so they use the same envelope. Avoid revealing private object existence through different errors.

Suggested codes: `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_USED` (only where enumeration policy permits), `CODE_INVALID`, `CODE_EXPIRED`, `CODE_ALREADY_USED`, `RATE_LIMITED`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `FORBIDDEN`, `NOT_FOUND`, `REVISION_CONFLICT`, `ALREADY_MEMBER`, `INVITATION_EXPIRED`, `ROOM_ENDED`, `VOTING_NOT_ELIGIBLE`, `TRACK_ALREADY_QUEUED`, `PROVIDER_UNAVAILABLE`. Finalize the catalog and safe public behavior in API documentation.

## 7. Authentication, onboarding and profiles

Required capabilities:

1. Register email/password; issue a server-tracked verification challenge.
2. Verify/resend challenge; retrieve trusted email-verification state.
3. Login and authenticated-user lookup, session renewal, logout/revocation.
4. Request password reset with a non-enumerating response; consume one-use reset challenge with a new password.
5. Authenticated password change with current-password/recent-auth policy and documented session invalidation.
6. Google registration/login and explicit authenticated account linking/unlinking. Verify provider credentials server-side; handle collisions without silently merging accounts. Prevent removing the last usable login method.
7. Persist profile completion separately from email verification so onboarding can resume after restart.
8. Define avatar upload, replace/delete, content/size limits and durable accessible URLs. A device-local `file://` URI is not a server image URL.

Current UI limits: email input 254 characters, password input 128 characters, password minimum 8, six numeric verification/reset digits, local challenge lifetime 15 minutes, resend delay 30 seconds, onboarding display name maximum 40. **These are client facts/proposals for alignment, not implemented backend security policies.** `123456` is a local preview code and must never become a universal server code. Server generates random challenges, stores protected challenge material, enforces attempts/expiry/cooldown, invalidates replaced/consumed challenges and controls delivery. Define Unicode/byte length behavior before freezing password/name validation.

Proposed responses should include challenge ID/purpose, masked destination, `expiresAt`, `resendAvailableAt`; account state should include `id`, `emailVerified`, `profileCompleted`, linked providers and sanitized profile. Never expose password hashes or reset/verification secrets in normal responses. Refresh-session contract must specify rotation, expiry, replay/reuse behavior, revocation and handling of parallel refresh attempts. Client secure credential storage is a later frontend responsibility.

Profile reads must enforce `public | friends | private` for bio, location and genres; own-user reads can include private values. Username uniqueness/case normalization/change policy and field maximum lengths remain open. UI has separate `verified` and `subscriptionActive` badges: decide whether the Verified badge means verified email or a different account status; do not silently conflate them.

Friendship contract needs request, incoming/outgoing list, accept, decline/cancel, remove, and current relationship status. Define duplicate/crossed requests and permission effects after unfriend. Profile/friendship implementation ownership remains as stated above.

## 8. Playlists and collaborative editing

Required behavior:

- Create/read/update/list/search playlists; define deletion/archive and removal effects.
- Subject default: **public and everyone can edit**. Current create UI sets `private: true`: this is a known mismatch to fix during client integration, not a reason to copy the wrong default into the API.
- Separate discover/read permission from edit permission. Support public/private visibility and everyone/invited editing. Current UI additionally exposes owner-only editing.
- Owner controls metadata, visibility, edit policy and invitations; editable entries follow the effective edit policy.
- Only authorized invitees/owner see private playlist data. Mock Home deliberately contains private fixtures; this does not authorize production disclosure.
- Add/remove/reorder entries atomically using stable entry IDs and revisions. UI currently prevents duplicate songs; proposed initial policy is one occurrence of a song per playlist, pending confirmation.
- Invite users, accept/decline/revoke, persist collaborators, and notify affected users. Define whether private invitations immediately grant visibility or require acceptance.
- Resolve stale edits explicitly; no last-write-wins replacement of an entire playlist without conflict protection. Reconnecting users fetch authoritative state.

Proposed transport:

```ts
 type PlaylistDto = {
  id: string; name: string; description: string; creatorId: string;
  visibility: 'public' | 'private';
  editPolicy: 'owner' | 'collaborators' | 'everyone';
  collaboratorIds: string[];
  entries: { id: string; songId: string; position: number }[];
  revision: string; updatedAt: string;
  permissions: { canRead: boolean; canEdit: boolean; canManage: boolean };
};
 type ReorderEntryInput = {
  entryId: string; beforeEntryId: string | null;
  expectedRevision: string; operationId: string;
};
```

An adapter can derive ordered UI `songIds` from entries. Metadata editor currently limits name to 60 and description to 300 characters; confirm these as server limits. Private + everyone editing is normalized to collaborators in the UI. Document accepted combinations server-side.

## 9. Rooms, access, queue voting and playback

Required room fields/capabilities: name, genre, host, visibility, lifecycle, participants/count, current viewer role, current playback summary, join/leave, invitations and join codes. Current room options expose only visibility and genre; **location/time voting policy UI is unfinished**. Add the backend policy model now with coordinated client work later.

Subject defaults: public events are discoverable; everyone can vote under the default policy. Private events are discoverable/accessed only by invited users. Current mock queue rejects `visitor` actions, so clarify implicit membership versus explicit Join before client integration; do not accidentally impose an invitation requirement on default public voting.

**Proposed voting policy model:** `everyone | invited | location-time`, independent of room visibility. Location/time policy needs latitude/longitude, radius, start/end timestamps, timezone interpretation, acceptable location age/accuracy, denied-permission behavior and the entitlement/license that permits selecting that policy. Radius and timing values are open. Do not use profile city text or BLE proximity as trusted GPS evidence. Document limits of client-reported location.

Queue behavior visible today:

- Suggestions use song IDs; duplicate currently queued recordings are rejected locally.
- Viewer vote is `-1`, `0` or `1`; zero withdraws the vote.
- Upcoming tracks rank by descending net score, then ascending insertion order.
- Current track stays first and cannot receive votes in the local model.
- Host can play/pause, seek, skip/remove tracks and end the room; participants can suggest/vote.
- Ending a room stops local activity. Empty queue shows an explicit empty/not-playing state.

Treat these as the proposed production rules to confirm, not proof of backend enforcement. Define whether played tracks may be suggested again, whether suggesters may remove their own suggestions, and retention/history policy. Vote changes must be transactional with a uniqueness constraint on `(room, queueEntry, user)`. A repeated vote request sets state; it must not increment twice. Lock/cutoff logic must prevent races between voting and playback advancement.

Proposed transport:

```ts
 type QueueEntryDto = {
  id: string; songId: string; addedById: string; addedAt: string;
  order: number; score: number; myVote: -1 | 0 | 1;
 };
 type RoomPlaybackDto = {
  roomId: string; currentEntryId: string | null;
  status: 'idle' | 'playing' | 'paused' | 'ended';
  positionMs: number; serverTime: string; revision: string;
 };
 type SetVoteInput = { value: -1 | 0 | 1; operationId: string };
```

Server validates host-only playback commands, applies an expected playback revision/transition ID and broadcasts committed state. A host completion report must be authenticated and idempotent; two completion/skip requests must not advance twice. Client clocks may animate progress between updates but must never authoritatively advance tracks. Current one-second mock timers are not the production protocol.

Open playback decisions: music provider/SDK, catalog-to-playable-ID mapping, provider account/subscription restrictions, host background/disconnect behavior, host transfer, recovery from playback failures, stale completion events and room end/restart semantics. Prototype provider playback on a real phone before claiming the feature works. Do not add synchronized participant audio.

Join-code UI takes six characters and normalizes case. Freeze alphabet, randomness, uniqueness, expiry/rotation, attempt throttling and whether a private-room code is an invitation credential. Never use fixture `AAAAAA` as production logic. Unauthorized search, code errors, participant/activity feeds and websocket subscriptions must not leak private-room details.

## 10. Endpoint capability checklist

Route spelling is **proposed**. Backend may supply equivalent documented paths. Every list needs pagination/filter behavior and every mutation needs authorization, validation, errors and retry semantics.

| Area | Suggested endpoints/capabilities |
| --- | --- |
| Health | Existing `GET /health`; accurate database unavailable response |
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/me` |
| Email | `/auth/email/verify`, `/auth/email/resend` |
| Password | `/auth/password/reset/request`, `/auth/password/reset/confirm`, `/me/password` |
| Providers | `/auth/google`, `/me/linked-accounts` and authenticated link/unlink operations |
| Profiles | `/profiles/{id}`, `/me/profile`, `/me/privacy`, avatar upload/delete |
| Friends | Request/list/accept/decline/cancel/remove; relationship lookup |
| Catalog | `/songs`, `/songs/{id}`; text/genre search and stable provider mapping |
| Discovery | `/rooms`, `/playlists`, `/profiles` search; optionally grouped `/search` |
| Playlists | CRUD, entries add/remove/reorder, collaborators, invitations, revisioned snapshot |
| Rooms | CRUD/lifecycle, join/leave, join-code redemption/rotation, participants, activity |
| Queue | Suggest, remove, set/withdraw vote, authoritative ranked snapshot |
| Playback | Host commands and completion acknowledgments, versioned playback snapshot |
| Invitations | List/respond/revoke with resource-specific access checks |
| Notifications | List, unread count, mark read/all read, authorized action references |
| Logging | Client action ingestion with bounded validated metadata and redaction |
| Bonus subscriptions | Offers, current entitlement, approved switching/cancellation; optional provider billing |
| Bonus offline | Revisioned fetch, operation replay/deduplication/conflict response |
| Bonus nearby | Authenticated beacon lookup returning only accessible room summaries |
| Optional native push | Device push-token register/update/revoke and delivery preferences |

Search must apply privacy filters before returning items or counts. Public discovery, hosted/joined filters, ended-room filtering and genre selection should work without changing existing page layout. Sort options currently include default, participants ascending/descending and genre; define deterministic secondary sorting.

## 11. Realtime contract

Proposed envelope:

```json
{
  "eventId": "opaque-event-id",
  "type": "playlist.updated",
  "resourceType": "playlist",
  "resourceId": "opaque-id",
  "revision": "12",
  "occurredAt": "2026-11-24T10:00:00Z",
  "operationId": "originating-client-operation-id",
  "payload": {}
}
```

Freeze actual event names and payload schemas for playlist edits, membership/invitation changes, queue/vote changes, playback transitions, room end, notifications and entitlement changes. Document whether payload is a snapshot, patch or invalidation. Authenticate connections, authorize subscriptions and recheck access after permission changes. Avoid bearer tokens in logged URLs.

Broadcast after commit. Define ordering per resource, deduplication, reconnect/backoff, heartbeats, token expiry, authorization revocation, cursor retention and resync. On a missing revision or expired cursor, the client fetches a full authorized snapshot. Viewer-specific fields such as `myVote` and capabilities require per-viewer delivery or a separate authorized fetch; never broadcast one user's private state to everyone. Bound slow-client queues and websocket connection/message sizes.

## 12. Bonuses: backend readiness without overstating completion

### Subscriptions

Agreed goal: Free/Plus offers and persisted, server-enforced switching. Current UI shows Plus at 99 DH; this is display copy, not an approved billing catalog, tax/currency contract or final entitlement list. Define currency/amount units, period, benefits, effective dates, expiry and downgrade behavior. Keep all mandatory defaults usable. Account badge state must derive from server entitlements, independently of email verification.

Real payment processing and provider are open. If selected, tokenize through the provider; backend accepts provider references and returns masked summaries. Never store/log raw PAN or CVV. Verify webhooks and make activation/refunds/renewals idempotent. A locally saved summary is not an activated subscription.

### Offline

Current SQLite stores account ID, playlist ID, JSON snapshot, nullable server revision and cache timestamp. Detail loading/restoration exists; it does not establish a durable pending-edit queue, list-wide hydration, full artwork download or backend synchronization.

Define permitted cached data, logout/account-switch cleanup expectations, stale indicators and reconnect access revalidation. Proposed replay fields: operation ID, resource ID, base revision, operation type/payload and client timestamp. Server deduplicates and reauthorizes every replay; returns committed revision or explicit conflict/rejection. Do not blindly overwrite server playlists from cached JSON. Freeze conflict strategy and retention before client write replay.

### Nearby / IoT

Current nearby results are fixtures. Intended mechanism: a phone/Mac broadcasts an identifier; mobile detects it; backend resolves the identifier to an accessible room. Define beacon ID registration, owner controls, rotation/expiry, rate limits and public/private filtering. Proximity alone grants no private access. Real BLE detection and foreground/background limits require device testing; simulated results do not satisfy that.

### Web

Use the same IDs, APIs, authorization and realtime behavior. Later define approved web origins and session/CORS/CSRF behavior for the chosen browser auth transport. Do not create a second backend or start the web UI during this backend handoff.

## 13. Security, logs, setup and quality requirements

- Enforce object-level authorization on all HTTP, websocket, search, image and notification paths. Test cross-account/private-resource access explicitly.
- Hash passwords using a suitable password-hashing scheme; protect session/challenge material; rate-limit sensitive routes. Define brute-force, replay, session theft and provider failure mitigations.
- Subject requires mobile actions logged with platform, device and app version. Agree client-only action coverage and offline batching. Authenticate/validate client telemetry, bound payloads, record server actor/request IDs and redact passwords, codes, bearer/refresh/provider tokens and card details. Client metadata is untrusted.
- Keep real credentials in ignored local environment files; commit only safe templates. Validate production configuration and avoid debug traceback/SQL/secret disclosure.
- Use migrations, database constraints and transactions for invariants. Test migration upgrade on a fresh PostgreSQL database and document rollback/recovery behavior. Never point destructive tests at development/production data.
- Existing Docker Compose credentials are development placeholders. Production deployment, TLS, secrets, backups, pool/timeouts and health/readiness need documented setup.
- Add CI for relevant tests and checks, with isolated PostgreSQL. Do not call foundation tests complete domain coverage.
- Measure realistic concurrent users for the two selected services: authenticated actions, simultaneous votes and playlist edits, websocket fan-out/reconnect. Record CPU, RAM, OS/topology, duration, dataset, concurrency, throughput, latency and error rates. Report measured limits; no invented capacity.
- Provide automatic dependency installation, exact run/test/migration commands, safe local email delivery and deterministic demo data. No third-party source or secrets committed.

## 14. Decisions to settle and information exchange

Existing scope, host-only audio and deferred fetch integration do not need reopening. The following still need written answers; backend teammate should propose concrete defaults and payloads so the frontend can review them.

| Decision | Backend supplies | Frontend/team supplies |
| --- | --- | --- |
| API conventions | Final OpenAPI, errors, pagination, ID/revision schemas | Adapter review and UI field/error needs |
| Sessions | Access/refresh lifetimes, rotation, revoke/reuse rules | Native secure-storage and renewal behavior during integration |
| Email challenges | Delivery adapter, attempt limits, expiry/cooldown contract | Confirm six-digit UI and display server timers |
| Google | Accepted credential/audience contract and server validation | Native OAuth client configuration/redirect setup; exchange securely |
| Profiles/friends | Shared account/auth/schema conventions and review | Bounded feature implementation per agreed ownership; username/privacy contract review |
| Avatar upload | Upload flow, limits, storage and URL lifecycle | Image-picker payload capabilities and failure UX |
| Verified badge | Distinct account status fields | Product meaning of badge |
| Default permissions | Public/everyone defaults and capability response | Fix current private playlist default and unfinished policy UI later |
| Voting | Atomic vote/ranking/cutoff contract | Confirm downvotes, duplicate/re-suggest and public Join behavior |
| Invitations/codes | Lifecycle, access grants, alphabet/expiry/revocation | UI review for invite acceptance and six-character input |
| Location/time | Policy shape and verification limitations | Radius/time rules, consent/denial UX and required native location support |
| Playback provider | Catalog/provider identity adapter and state protocol | Real-phone SDK feasibility; jointly select provider and account requirements |
| Host unavailable | Proposed pause/timeout/transfer/end policy | Product approval and recovery UX |
| Realtime | Event schemas, ordering, replay/resync and token handling | Subscription lifecycle and conflict UI |
| Plus | Offer/entitlement model and downgrade proposal | Benefits, final pricing/period and decision on real billing |
| Offline | Conflict/idempotency/replay contract | Cache/pending-edit scope and reconciliation UX |
| Nearby | Beacon lookup/registration/authorization contract | Real broadcaster/detector tests and identifier format |
| Push | Optional token registration and delivery contract | Native token/project setup, consent and tap routing |
| Evaluation ambiguity | Record two-service implementation and load-test scope | Confirm V.2/V.7 wording with evaluator |

Do not commit provider/email/payment secrets while exchanging configuration. Document required variable names and setup procedures; share actual values separately through an appropriate private channel.

## 15. Delivery order and acceptance gates

1. **Foundation verification:** install on documented Python, start isolated PostgreSQL, apply migration, prove `/health` ready/unavailable and run tests. Existing foundation is not proof of live DB verification.
2. **Contract/authentication:** freeze API/session/error conventions; register → verify → login → retrieve self → refresh → reset/change password → logout. Include invalid/expired/reused challenges, refresh replay and revoked-session tests. Deliver local email procedure and Google exchange/linking tests.
3. **Profiles/friends/catalog:** coordinate ownership; demonstrate own/friend/stranger privacy filtering and stable searchable song IDs with metadata.
4. **Playlist Editor:** two users collaborate; public/everyone defaults work; private visibility is protected; invitation/revocation and simultaneous add/remove/reorder/conflict/reconnect tests pass.
5. **Track Vote/rooms:** public/private discovery and membership work; eligibility enforced; concurrent votes rank deterministically; one authenticated host controls playback transitions without double advance; participant phones do not play audio. Prove provider playback jointly on a real phone.
6. **Hardening:** full selected-service acceptance, security/telemetry, CI, clean-clone setup, end-to-end integration and measured load evidence.
7. **Bonuses:** server entitlements/switching, offline replay, real proximity lookup and later browser integration, each with its own demonstrable evidence. Preparatory UI does not equal a completed bonus.

For every delivery, send: commit/branch, implemented scope, migrations, environment variable names, exact startup/test commands/results, OpenAPI/examples, realtime schemas, deterministic demo procedure, known limitations and remaining decisions. Do not mark a slice frontend-ready merely because its endpoints return 200.

## 16. Repository references

Read these together; backend planning text written before the merge may describe outdated assumptions. This handoff's status labels distinguish facts from new proposals.

- `en.subject.pdf`: authoritative project requirements; V.1–V.8 and bonus chapter.
- `doc/PROJECT_PLAN.md`: selected services, mandatory checklist and evaluation ambiguities.
- `doc/PLAYBACK_DECISION.md`: agreed host-only audio.
- `doc/TEAM_RESPONSIBILITIES.md`: ownership, including profiles/friendships contribution.
- `backend/README.md`: current setup, health and migration commands.
- `backend/docs/implementation-plan.md`: backend roadmap; F-11 Delegation is deferred by its integration note.
- `doc/UI_PROGRESS.md`, `doc/SESSION_HANDOFF.md`: detailed client state and known gaps.
- `doc/BONUS_FRONTEND_PLAN.md`: client bonus plan; distinguish proposals from implemented adapters.
- `mobile/src/data/mockAccounts.json`, `mockPlaylists.ts`, `mockNotifications.ts`, `songs.json`: fixture data and types.
- `mobile/src/state/MockRoomsContext.tsx`, `roomQueue.ts`, `PlaylistsContext.tsx`, `ProfileContext.tsx`, `SettingsContext.tsx`, `BillingContext.tsx`: current local behavior.
- `mobile/src/screens/auth/authValidation.ts`, `useResendCooldown.ts`: preview challenge rules.
- `mobile/src/storage/playlistCache.ts`: current account-scoped snapshot interface.

**Requested outcome:** a reproducible, documented, tested backend for the two selected services and agreed bonuses, compatible with the existing screens, with unresolved contracts explicitly settled and mobile fetch integration coordinated separately.
