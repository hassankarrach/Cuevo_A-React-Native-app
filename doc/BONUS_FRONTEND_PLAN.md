# Bonus frontend preparation plan

Updated: 2026-11-21.

## Decisions and current focus

- Subscription offer, payment entry, saved methods in Settings and final review UI are built. Next billing work is provider/tokenization and backend entitlements; no charge or activation is implemented.
- Prepare bonus screens and client interfaces while the backend is being implemented. Local adapters support development; they do not count as completed backend integration.
- Preserve mandatory functionality and keep it available on the Free plan.
- Build the web application **from scratch at the very end of the project**, after the mobile work and backend integration are stable. Do not start adapting the Expo mobile UI for web now.
- Use the same backend for the future web application; building a separate client does not mean creating a second backend.
- No paid Apple Music integration is planned. Subscription plans concern Cuevo capabilities, not music-provider subscriptions.
- Exact bonus acceptance remains governed by the subject/evaluator. Plan names, limits and simulated plan switching below are proposals until agreed.

Related documents: [Project plan](PROJECT_PLAN.md), [team responsibilities](TEAM_RESPONSIBILITIES.md), [UI progress](UI_PROGRESS.md).

## Work order

1. Subscriptions UI and its small shared client foundation — current focus.
2. Offline playlist preparation.
3. Nearby-room/proximity preparation. Investigate hardware feasibility early, alongside earlier work.
4. Backend integration and validation of the mobile bonuses as services become available.
5. Separate responsive web application, built from scratch at the very end.

Mandatory mobile flows, backend integration and hardening retain priority over completing bonuses.

## Shared preparation

Introduce these interfaces incrementally when needed, rather than building a large abstraction layer before the UI:

- API client using the configured server address, authenticated requests and consistent error handling.
- Data interfaces for accounts, playlists, rooms and invitations, with local development implementations and later API implementations.
- Shared loading, empty, error, offline and retry states.
- Agreed identifiers, pagination, error codes, revision fields and realtime event contracts.
- Account-scoped state and cleanup when logging out or changing accounts.

Keep temporary values behind adapters. Screens should not depend on mock IDs, hardcoded API responses or independent permission rules.

## 1. Subscriptions UI — next implementation

### Product scope

Add Cuevo Free/Plus offers with meaningful capability differences. Start by proposing creation limits, such as fewer owned playlists or active hosted rooms on Free and higher limits on Plus.

Keep joining, suggesting, voting and basic playlist collaboration available on Free. Final limits and feature differences need agreement before implementation; example limits must not be presented as subject requirements.

Real checkout is outside the current UI preparation. Confirm whether persisted demonstration plan switching satisfies the evaluator before declaring the bonus complete.

### Mobile UI

- Add a **Plan & usage** destination in Settings.
- Show the current plan, included capabilities and usage versus limits.
- Show a clear Free/Plus comparison and selected-plan state.
- Add switch-plan confirmation, submitting, success, failure and retry states.
- Explain downgrade effects before applying a change.
- Add limit-reached feedback to room and playlist creation, with a link to Plan & usage.
- Preserve existing content on downgrade; propose blocking additional creation until usage fits the lower plan rather than deleting content.
- Follow existing Cuevo typography, warm surfaces, filled icons, rounded cards and shared primary-button treatment.
- Keep implementation-status labels out of product UI; document local-only behavior here instead.

### Client setup

- Define typed plan, usage and entitlement models.
- Expose capabilities through one shared interface instead of scattering checks such as `plan === 'plus'` across screens.
- Use a local adapter to exercise Free, Plus, approaching-limit, limit-reached, switch-failure and downgrade states.
- Reuse the interface when backend account/entitlement endpoints become available.
- Never treat client checks as authorization. Server-rejected creation must produce useful feedback and refresh usage.

### Backend contract to request

- Current plan and authoritative usage/limits.
- Available offers and their capabilities.
- Plan-change operation, validation and error codes.
- Agreed downgrade behavior for existing content and pending operations.
- Server enforcement on creation endpoints, including concurrent requests.

Subscriptions must remain independent of access permissions: Plus does not grant access to private rooms or playlists, invitation rights or unrestricted voting.

### Ready before backend

All subscription screens and UI states work through the local adapter, and room/playlist creation can display entitlement feedback. This does not imply persistent or enforced subscriptions are complete.

## 2. Offline playlist preparation

### Initial scope

Support reading previously loaded playlists after an offline restart, plus a limited agreed set of pending playlist edits. Start with adding/removing known catalog songs; agree reorder conflict semantics before enabling offline reordering.

Live room voting stays online-only. Offline music downloads/playback are outside this scope.

### Mobile and client work

- Add account-scoped persistent storage beneath the playlist data interface.
- Cache playlist metadata, song entries and the last server revision.
- Handle artwork caching separately; saved playlist metadata alone does not preserve remote image files.
- Represent pending operations with unique operation IDs, playlist IDs, action payloads and expected revisions.
- Preserve pending operations across app restarts.
- Show Offline, Last synced, Pending changes, retry and rejected-change states.
- Search only available cached catalog data while offline and explain unavailable operations.
- Simulate successful synchronization, interrupted retries, conflicts, deleted playlists and revoked permissions through a local adapter.
- Isolate caches by account and define logout cleanup.

### Backend contract to request

- Snapshot/revision retrieval and a documented synchronization protocol.
- Operation deduplication so retrying cannot apply an edit twice.
- Conflict responses that include enough information to refresh or resolve the operation.
- Permission and entitlement revalidation at synchronization time.
- Behavior for removed songs, deleted playlists, lost access and plan downgrades.

### Ready before backend

Cached reading and restart persistence work. Pending-operation state and conflict UI can be demonstrated locally. End-to-end synchronization remains incomplete until verified against the server.

## 3. Nearby rooms / proximity preparation

### Product flow

Add a Nearby entry point on Rooms. A physical beacon broadcasts an identifier; the phone detects it; the backend resolves it to room information the user is allowed to see; selecting a result opens the existing room page.

### Mobile and client work

- Build permission-needed, Bluetooth-off/unavailable, scanning, detected, empty and error states.
- Reuse existing room cards and navigation.
- Define a discovery adapter for simulated and actual detections.
- Deduplicate repeated detections and avoid repeated joins, invitations or prompts.
- Use generic feedback for inaccessible detections without revealing private room metadata.

### Early feasibility check

Do this before investing heavily in polished proximity UI:

- Identify available transmitting hardware and a real test phone.
- Verify an appropriate native Bluetooth integration against the installed Expo SDK.
- Prepare a development build where required.
- Detect a real identifier and document tested foreground/background limits.

A static Nearby list is only a UI fixture, not a completed hardware bonus. Beacon detection also does not replace invitation authorization or location/time voting eligibility. Signal strength is not an exact distance measurement.

### Backend contract to request

- Beacon-to-room assignment and host authorization.
- Authenticated identifier lookup with room-visibility enforcement.
- Defined responses for unknown, inactive and inaccessible assignments.

### Ready before backend

Discovery UI and adapter behavior are verified; ideally real detection is proven. Authorized room resolution still requires backend integration.

## 4. Mobile integration and validation

Replace local adapters as the relevant services arrive. Do not wait for the entire backend to be finished before integrating a completed slice.

| Area | Verification |
| --- | --- |
| Subscriptions | Plan persists; switching and downgrade behave correctly; API calls cannot bypass limits |
| Offline | Restart offline; retry without duplicate edits; resolve conflicts; reject edits after access is revoked |
| Proximity | Real detection; denied permissions; Bluetooth unavailable; repeated detections; private-data protection |

Prepare reproducible demo accounts and scenarios. Record which behaviors are local simulations and which have been verified with the backend. Keep evidence, limitations and setup instructions current.

## 5. Responsive web application — last, built from scratch

Start only at the end of the project, after mobile and backend behavior is stable. Do not convert or progressively adapt the Expo application as part of the current preparation.

### Separate client scope

- Build a separate responsive React web application with its own browser-focused layout and components.
- Preserve Cuevo's brand and established interaction rules.
- Implement account flows, profiles, playlist collaboration, room discovery, suggestions and voting against the same backend.
- Design desktop navigation and responsive layouts deliberately: sidebar/top navigation, wider grids, and room queue/participants/activity columns where appropriate.
- Support keyboard navigation, focus states, direct URLs, browser Back and narrow screens.
- Share stable API types and non-UI contracts where useful, without coupling the new UI to native components.
- Handle mobile-only capabilities explicitly rather than implying browser parity for native hardware features.

### What we prepare now

Only platform-neutral contracts, API documentation, design decisions and reusable non-UI rules. No web screen implementation is scheduled now.

### Completion evidence

Demonstrate mobile and browser users collaborating through the same backend, including playlist updates, voting, access control and reconnect behavior. Verify both narrow and desktop layouts.

## Immediate next task

Implement the mobile **Plan & usage** screen and a local entitlement adapter, then add plan comparison, switching/downgrade states and creation-limit feedback incrementally. Do not start web implementation.

### First implemented subscription-related screen — 2026-11-20

At the user's request, the Payment reference page was built before Plan & usage. Available at Settings → Billing → Payment (/payment), with Cuevo's light peach/orange styling and rounded form/card treatment. Form state is local only; Pay now is disabled and no processing or persistent payment-method storage exists. This does not change the later plan/entitlement work or authorize real checkout. Web remains last.

- Scope correction: /payment is an account Add payment method screen, not checkout. Settings calls it Payment method; primary action is Save payment method. Any subscription selection/confirmation is a separate future flow. Saving still requires provider/backend integration.

### Plus offer screen — 2026-11-20

Added /subscription via Settings → Billing → Cuevo Plus, with the user-requested price of 99 DH, a light orange/peach blurred-edge background and a Continue link to account payment-method setup. No recurrence, trial, discount or completed subscription activation is assumed. Usage display, entitlement adapter, confirmed limits and actual plan switching remain pending.

- Plus offer page design is on standby at the user's request. Current design focus returned to the payment-method page, whose card preview now uses the cleaned user-requested CIH Sayidati cover. Do not resume revising the Plus gradient without direction.
