# Bonus frontend preparation plan

Updated: 2026-11-22.

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

Add a Nearby entry point on Rooms. The user's Mac or a second phone broadcasts a BLE identifier; the phone running Cuevo detects it; the backend resolves it to room information the user is allowed to see; selecting a result opens the existing room page. No dedicated beacon purchase is planned.

### Agreed broadcaster plan — 2026-11-22

Keep this a small school-project implementation, taught one file/change at a time. This is a plan only; no broadcaster, Bluetooth library or Nearby screen has been implemented.

Roles:
- Receiver: the user's real Android phone running Cuevo.
- First broadcaster to test: the user's Mac, using a small foreground Core Bluetooth helper with Start/Stop advertising.
- Alternative: a second phone with BLE peripheral/advertising support and a foreground advertising utility. Check its actual support before relying on it.
- The broadcaster is a separate demo tool initially. Adding host broadcasting inside Cuevo is a later option, not required for the first scanning implementation.

#### Step 1 — prove the hardware path

- Run a Mac BLE broadcaster and advertise one test 128-bit service UUID. Use the same UUID with a second phone if the Mac test fails.
- Use a BLE scanner on the Android phone to verify that UUID is visible; turning off advertising must remove it from new scan results.
- Keep both devices awake and tools open during this first test. Document the working hardware and foreground limits.
- Do not build polished screens or assume the Mac works until this real detection succeeds.

#### Step 2 — add real scanning to Cuevo

- Choose a native BLE scanning library verified against the installed Expo SDK/React Native version. Do not assume it also supports broadcasting.
- Configure platform permission descriptions and runtime requests. Request access when the user opens Nearby; handle Bluetooth off and unsupported hardware.
- Produce a new Android APK containing the native module; the already installed APK will not gain Bluetooth support through a JavaScript edit.
- First milestone: Cuevo detects the same test UUID on the real phone. iOS receiver support/device QA follows after Android detection works.

#### Step 3 — build a small Nearby flow

- Rooms → Nearby → Scan. Use a short foreground scan (initial target: 10 seconds) and stop it on leaving the screen/backgrounding.
- Show scanning, results, empty, permission-denied, Bluetooth-off and retry states.
- Deduplicate by the agreed advertised identifier. A new scan replaces old results so stopped broadcasters do not remain indefinitely.
- For initial local demonstration only, map the test UUID to one fixture room and open the existing room page. Record this as local mapping, not backend integration.

#### Step 4 — connect the backend

- Agree a host-authorized mapping between an opaque advertised UUID and an active room. Use an identifier carried in the advertisement, not a Bluetooth MAC address or device display name.
- The receiver sends the detected UUID to an authenticated lookup endpoint. The backend returns only room information that user may see.
- Unknown, stopped/unassigned and inaccessible identifiers get safe empty/unavailable feedback. Detection does not grant membership or voting rights.
- Bluetooth discovery can work without internet, but real room lookup needs connectivity; show a connection message when lookup cannot run.

#### Step 5 — test and document the demo

- Mac → Android detection; optionally second phone → Android with the same identifier format.
- Permission denied, Bluetooth off, no broadcaster, repeated advertisements, scan again, broadcaster stopped and failed room lookup.
- Public/private room access, opening the correct room and no automatic join.
- Signal strength is only a rough signal indicator, not exact distance or proof of presence. No background discovery or automatic notifications in this first version.
- Record setup/start/stop instructions and clarify with the evaluator whether a Mac/phone broadcaster satisfies the subject's IoT criterion before declaring bonus acceptance.

Ownership: our side handles the broadcaster demo, scanning, UI, APK and real-device checks. Teammate handles identifier assignment, lookup and server access control; agree the identifier format together.

Next action: prove **Mac broadcasting → Android detection** using one UUID, before changing Cuevo.

References: [Apple advertising API](https://developer.apple.com/documentation/corebluetooth/cbperipheralmanager/startadvertising(_:)), [Android advertising API](https://developer.android.com/reference/android/bluetooth/le/BluetoothLeAdvertiser), [Android Bluetooth permissions](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions).

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

### LightBlue broadcaster test setup — 2026-11-22

- Created `Cuevo Test` in LightBlue on the user's Mac: Virtual Devices → + → Blank → Save; edited name and default service. Left broadcasting switch on.
- Service UUID: `C0E00001-7A1B-4C2D-8E3F-123456789ABC`. LightBlue's editor accepted it as 32 hexadecimal digits without hyphens.
- Log confirmed the service was added and `Did start advertising`. The logged advertisement data contains local name `Cuevo Test` only; the custom service is configured as GATT, but its UUID has NOT been verified as included in advertising. Do not assume UUID-filtered passive scanning will detect it. Verify phone scan data; if needed, adjust broadcaster tooling or agree a connection-based read before app integration.
- Next: Android nRF Connect → Scanner → Scan; find Cuevo Test, inspect advertisement data and optionally connect to inspect its service UUID. Clear/restart scan after disabling the broadcaster to confirm fresh detections stop. Phone-side detection remains unverified.

### Nearby UI checkpoint — 2026-11-22

The `/nearby` map/radar and shared search/results panel are implemented as a UI simulation. A cancellable five-second search reveals existing public, active fixture rooms and links to their local detail routes. It does not scan BLE, read GPS or resolve broadcast identifiers. This does not complete the proximity bonus or change the agreed Mac/second-phone broadcaster → Android receiver plan. See UI_PROGRESS for final styling and SESSION_HANDOFF for source files and validation. Real phone-side broadcaster detection is still unverified; preserve the LightBlue advertisement-versus-GATT caveat above.
