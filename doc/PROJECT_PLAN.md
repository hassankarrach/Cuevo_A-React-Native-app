# Music Room — two-person delivery plan

Source: `../en.subject.pdf`, version 6. Prepared 2026-11-15.

Goal: deliver a complete mandatory project and all four proposed bonuses. This plan is a proposed implementation strategy; the subject and evaluation requirements remain authoritative.

## 1. Scope and passing conditions

- Implement **Music Track Vote** and **Music Playlist Editor**. The service section explicitly requires at least two of the three services.
- Build a mobile application for Android or iOS. One mobile platform satisfies the mandatory platform requirement.
- Build a responsive web application for the multi-platform bonus. Supporting both Android and iOS is not explicitly required.
- Implement the IoT, subscription, and offline bonuses as well.
- Complete and verify every mandatory requirement before treating bonuses as deliverable. The subject says bonuses will only be assessed if the mandatory part is perfect.
- Do not add Music Control Delegation unless evaluation clarification requires it or the agreed scope is fully complete.

## 2. Mandatory acceptance checklist

### Accounts and profiles — section V.1

- [ ] Email/password registration and login.
- [ ] Google or Facebook registration and login.
- [ ] Link a social account to an existing account safely.
- [ ] Email verification for email/password accounts.
- [ ] Forgotten-password/reset flow.
- [ ] Editable public, friends-only, and private profile information.
- [ ] Editable music preferences.
- [ ] Basic friend relationships to enforce friends-only visibility.
- [ ] Backend filters profile fields according to the requesting user's access.

### Music Track Vote — section V.2.1

- [ ] Users suggest tracks and vote for upcoming tracks.
- [ ] More votes move tracks earlier in the queue.
- [ ] Events are public by default; all users can discover public events and vote under the default policy.
- [ ] Only invited users can discover/access private events and vote.
- [ ] Support everyone, invite-only, and location/time-restricted voting policies.
- [ ] Enforce eligibility on the backend.
- [ ] Define vote uniqueness, withdrawal, ties, voting cutoff, and removed-track behavior.
- [ ] Concurrent votes cannot corrupt totals or queue ordering.
- [ ] Demonstrate playback progression using the authoritative queue.

### Music Playlist Editor — section V.2.3

- [ ] Create playlists and add, remove, and reorder tracks in real time.
- [ ] Playlists are public by default and accessible to all users.
- [ ] Private playlists are accessible only to invited users.
- [ ] Everyone can edit by default; invite-only editing is configurable.
- [ ] Visibility and edit permissions are enforced independently.
- [ ] Concurrent edits do not silently overwrite changes or corrupt ordering.
- [ ] Reconnecting clients recover the current server state.

### Architecture, API, and mobile — sections IV, V.3–V.5

- [ ] Backend persists service data and remains the source of truth.
- [ ] Mobile supports all necessary project actions.
- [ ] Backend address is configurable in the mobile app for testing.
- [ ] API reference describes methods, inputs, outputs, and errors.
- [ ] Document and justify API style, exchange format, storage, and framework choices.
- [ ] Dependencies install automatically from a clean clone using scripts, Makefile, or equivalent.
- [ ] Do not commit third-party library source into the repository.
- [ ] Music SDK supplies provider capabilities without replacing our collaboration logic.

### Security, logs, load, and quality — sections V.6–V.8

- [ ] Authentication and object-level authorization protect user data and private resources.
- [ ] Session protection, brute-force defenses, and input validation are implemented.
- [ ] Document remaining hazards and practical mitigations.
- [ ] Mobile actions generate backend logs with platform, device, and app version; define coverage for client-only actions and offline log delivery.
- [ ] Never log passwords, session tokens, or other secrets.
- [ ] Credentials and environment values stay in ignored local `.env` files; commit only safe templates.
- [ ] Tests cover the important behavior of each layer.
- [ ] CI runs the agreed quality checks.
- [ ] Load tests measure realistic simultaneous usage, latency, errors, and throughput.
- [ ] Record workload, test duration, CPU, RAM, deployment environment, and observed limits.
- [ ] Only repository contents are relied upon for evaluation; document external setup and prerequisites.

## 3. Decisions and ambiguities to resolve early

1. **Service count:** V.2 says at least two services, while V.7 refers to three. Confirm the discrepancy with the evaluator. The working scope is two.
2. **Playback:** confirm the expected playback experience. Prototype real playback on a target phone before choosing a provider/framework combination.
3. **Provider feasibility:** verify search, authentication, playback restrictions, account requirements, and track-completion behavior using current official provider documentation.
4. **Permissions:** interpret service “license management” as access rights; keep it separate from paid subscription entitlements.
5. **Subscriptions:** the subject requires switching between offers but does not explicitly require real payment processing. Confirm expectations before adding billing.
6. **IoT:** validate a real proximity mechanism and device permissions early; do not substitute a static event page for detection.
7. **Location/time:** define radius, timezone handling, location freshness, and denied-permission behavior. Document limits of client-reported location.

## Development environment decision

Mobile development moves to the MacBook Air M1 with Expo and the iOS Simulator. iOS is the initial mandatory target. Browser preview remains optional for web checks; it is not the main mobile preview. See `LOCAL_DEVELOPMENT.md` for installation and handoff. Native integrations and hardware features still need physical-device validation. The Ubuntu VM is no longer the primary mobile environment.

## 4. Proposed architecture

```text
Mobile client          Responsive web client
       \                  /
        REST/JSON + WebSockets
                  |
          Modular backend
                  |
             PostgreSQL
                  |
     Email / identity / music providers
```

Candidate stack: TypeScript, React Native for mobile, React for web, a Node backend, and PostgreSQL. This is provisional until the playback and native integration prototypes pass. Prefer team familiarity over unnecessary framework changes.

- Use one backend application with account, friendship, playlist, event, playback, and subscription modules.
- Use REST for commands/queries and WebSockets for committed state updates.
- Keep music-provider code behind an adapter.
- Keep permissions, voting, ordering, and synchronization rules on the backend.
- Start with one designated playback host per event, subject to provider feasibility and evaluation expectations.
- Share API types and suitable business-independent utilities between clients; do not assume all mobile UI or native features can run on web unchanged.
- Avoid microservices for this team size and scope.

### Concurrency strategy

- Give each playlist a revision number and each playlist entry a stable ID.
- Submit the expected revision with edits; validate and apply changes in a transaction.
- Reject conflicting stale edits and return enough information to refresh/reconcile.
- Broadcast only committed results; resynchronize after reconnecting.
- Enforce vote uniqueness using database constraints and update votes atomically.
- Define deterministic queue tie-breaking and prevent multiple playback advances for the same transition.
- Authorize both HTTP requests and WebSocket subscriptions/actions.

## 5. Two-person ownership

Ownership means leading implementation and documentation; the other teammate reviews it. Both must understand the complete system for the defense.

| Workstream | Person A leads | Person B leads |
| --- | --- | --- |
| Foundation | Backend, database, API contracts, CI | Mobile, navigation, UI foundations, configurable server address |
| Identity | Auth, email flows, linking, authorization | Account screens, profiles, friendships UI |
| Playlist Editor | Review permissions and transactions | End-to-end service: API, realtime, mobile screens |
| Track Vote | End-to-end service: events, voting, eligibility, queue | Review UX and playback integration |
| Music | Server queue and playback-state logic | SDK integration and mobile playback controls |
| Bonuses | Entitlements and synchronization API | Responsive web, BLE integration, offline client |
| Validation | Security, load tests, backend/deployment docs | Device/browser flows, UI tests, demonstration setup |

Person B has substantial client/bonus ownership: after mandatory integration, Person A should take web/API integration or IoT support work as needed to balance the backlog.

Use short branches, frequent integration, cross-review, and a shared issue board. Every week, each person explains and demonstrates the other's main feature. Freeze API contracts for each slice before implementing both sides.

## 6. Delivery phases and gates

### Phase 1 — risks and foundation

1. Prototype real music playback on a phone.
2. Prototype social login and safe account linking.
3. Spike BLE detection and identify required hardware.
4. Decide permissions and playback model.
5. Define schema, API contracts, realtime events, and core screens.
6. Add installation scripts, migrations, safe environment template, and CI.

**Gate:** fresh-clone startup works and critical external/native integrations are proven.

### Phase 2 — accounts and first usable playlist

Implement all account flows, profile privacy, friendships, playlist creation, invitations, search, and basic playlist operations.

**Gate:** two users on real clients can register, connect, and use a playlist with correct access control.

### Phase 3 — collaborative editing

Implement realtime updates, transactional edits, revision conflicts, reconnect synchronization, and permission-change behavior.

**Gate:** simultaneous edits do not lose changes or corrupt ordering, and unauthorized clients cannot read or edit private playlists.

### Phase 4 — voting and playback

Implement events, discovery, invitations, voting policies, location/time checks, queue ranking, playback progression, and reconnect handling.

**Gate:** multiple users can participate concurrently and the correct next track plays according to documented rules.

### Phase 5 — mandatory hardening

Run the complete mandatory checklist. Finish security/log coverage, API documentation, failure handling, clean-clone setup, CI, and realistic load tests.

**Gate:** mandatory requirements pass together in an integrated rehearsal. Feature completion alone is insufficient.

### Phase 6 — bonuses

Implement responsive web, subscriptions, offline synchronization, and finish the IoT integration. The early IoT spike prevents late hardware surprises.

**Gate:** demonstrate every bonus and rerun affected mandatory acceptance checks.

### Phase 7 — defense preparation

Prepare reproducible demo data, two phones/accounts and a browser, setup instructions, measured load results, and explanations of tradeoffs. Both teammates rehearse the entire demonstration.

## 7. Bonus acceptance checklist

### Responsive web — VI.1

- [ ] Account flows and the two selected services work in the browser.
- [ ] Layout works on narrow and wide screens.
- [ ] Browser and mobile share the authoritative backend and synchronize changes.
- [ ] Native-only functionality is documented and handled sensibly on web.

### IoT — VI.2

- [ ] A real BLE beacon or equivalent proximity mechanism identifies an event.
- [ ] A real mobile device detects proximity and retrieves event information.
- [ ] Handle permissions, repeated detections, and unavailable hardware.
- [ ] Enforce event visibility; proximity must not reveal private event data.
- [ ] Document tested foreground/background behavior and hardware setup.

### Free/paid subscriptions — VI.3

- [ ] Define free and paid offers with a meaningful feature distinction.
- [ ] Users can switch between offers and changes persist.
- [ ] Backend enforces entitlements, including direct API calls.
- [ ] Define downgrade behavior for existing data, memberships, and pending edits.
- [ ] Keep subscription entitlements separate from invitations and edit/vote rights.

### Offline mode — VI.4

- [ ] Cached playlists remain readable after an offline app restart.
- [ ] Users can prepare a limited set of playlist edits offline.
- [ ] Pending changes and stale data are visible.
- [ ] Reconnect triggers synchronization with operation IDs to prevent duplicate application.
- [ ] Conflicts are reconciled or surfaced rather than silently overwriting server state.
- [ ] Sync rechecks current permissions and subscriptions.
- [ ] Live voting remains online-only; downloaded/offline music playback is outside the proposed scope.

## 8. Verification priorities

Prioritize behavior that can invalidate the project:

- Account linking cannot take over another account; reset and verification tokens expire and cannot be reused.
- Private resources cannot be discovered through search, guessed IDs, API responses, or realtime subscriptions.
- Friends-only fields are filtered by the backend.
- Two users moving the same entry, removing an entry during a move, and voting simultaneously produce consistent outcomes.
- Disconnect/reconnect restores state without duplicate actions.
- Permission changes and subscription downgrades take effect server-side.
- Offline operations handle changed/deleted resources and lost rights.
- Playback transitions do not skip or advance twice.
- External service failures produce recoverable behavior.

Load-test a realistic mixture of active connections, reads, votes, and edits. Report tested capacity and observed limits, not an unsupported total-user claim.

## 9. Effort budget

| Stage | Approximate share |
| --- | ---: |
| Risk investigation and foundation | 15% |
| Mandatory features | 40% |
| Mandatory integration and hardening | 20% |
| Four bonuses | 20% |
| Defense rehearsal and cleanup | 5% |

An initial estimate is 8–10 full-time weeks for two people, subject to experience and integration results. This is a planning estimate, not a subject requirement or guaranteed schedule. Re-estimate after Phase 1 and protect the mandatory hardening budget.

## 10. Repository deliverables and defense

- [ ] README with clean-clone setup, prerequisites, commands, and demo instructions.
- [ ] Safe environment template and ignored local secrets.
- [ ] Migrations and reproducible seed/demo data.
- [ ] Requirement checklist linked to implementation and relevant tests.
- [ ] API and realtime event reference.
- [ ] Architecture, permission model, concurrency rules, and major design decisions.
- [ ] CI checks and test instructions.
- [ ] Load-test scripts/results with hardware and workload details.
- [ ] Bonus setup, including IoT hardware and offline conflict demonstration.
- [ ] Known limitations and AI-assistance record, consistent with the subject's transparency guidance.

Suggested defense sequence: clean setup; account creation/verification/recovery/social linking; profile privacy; public/private playlists; concurrent editing; public/private events; voting eligibility; concurrent votes and playback; reconnect; responsive web; subscriptions; proximity detection; offline edits and conflict synchronization; measured capacity and architecture explanation.

Both teammates must be able to explain why the backend is authoritative, how access rights are enforced, and how concurrent actions are resolved.
