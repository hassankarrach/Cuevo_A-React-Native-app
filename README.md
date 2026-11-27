# Cuevo

Cuevo combines **cue/queue + vote**: people choose what plays next and build playlists together.

A React Native music app with live track voting and collaborative playlist editing.

This two-person project is in the mobile UI and backend implementation stage. Illustrated welcome/introduction, account recovery and verification UI, Home, grouped universal search, dedicated song details, room discovery/search/filtering, local creation/join flows, queue voting/lifecycle, profiles, notifications, playlist editing, Settings and Help are built. Private-room/invitation and location/time voting-policy UI remain unfinished. The backend implements email/password account lifecycle, PostgreSQL session state, profile/friendship APIs, durable in-app notifications, a public metadata catalog/search contract, the collaborative playlist editor, and room lifecycle/access with revisioned WebSocket invalidations. Mobile API wiring, track voting, OS push delivery, audio playback and production email delivery are not implemented. Plus offer/payment/review UI and session-only saved-card summaries are available; no real payment is processed. See [UI progress](doc/UI_PROGRESS.md) for the current inventory.

## Development

Primary environment: MacBook Air M1 with Xcode and an iOS Simulator.

After installing nvm, Xcode, and an iOS Simulator runtime:

```bash
cd mobile
nvm install
nvm use
npm ci
npm run start -- --localhost --max-workers 2
```

Routes live in `mobile/src/app/`; UI implementations live in `mobile/src/screens/`. Optional browser preview: `npm run web`.

Mac setup is complete; the current UI has been previewed in Expo Go on the iPhone 17 simulator (iOS 26.5). For Expo Go use `npm run start -- --localhost --max-workers 2`; `npm run ios` builds the native app. Press `i` in Metro to open the existing simulator. See the handoff before changing the simulator setup.

## Documentation

- [UI progress and remaining screens](doc/UI_PROGRESS.md)
- [Mock accounts and room test cases](doc/MOCK_ACCOUNTS.md)
- [Host-only playback decision](doc/PLAYBACK_DECISION.md)
- [Brand and color cheat sheet](doc/BRAND.md)

- [Local setup and Mac handoff](doc/LOCAL_DEVELOPMENT.md)
- [Current session handoff and next steps](doc/SESSION_HANDOFF.md)
- [Backend teammate handoff](backend/docs/BACKEND_TEAMMATE_HANDOFF.md)
- [Frontend teammate handoff and Google Sign-In notes](backend/docs/FRONTEND_TEAMMATE_HANDOFF.md)
- [Original project request](backend/docs/message.txt)
- [Song catalog and metadata provenance](backend/data/SONG_CATALOG.md)
- [Backend API contract](backend/docs/api-contract.md)
- [Profile and friendship backend contract](backend/docs/profile-and-friendship.md)
- [In-app notification API contract](backend/docs/notifications.md)
- [Playlist and realtime API contract](backend/docs/playlists.md)
- [Room lifecycle and access contract](backend/docs/rooms.md)
- [Project plan and requirements](doc/PROJECT_PLAN.md)
- [Team responsibilities](doc/TEAM_RESPONSIBILITIES.md)
- [Cuevo backend setup and migrations](backend/README.md)
- [Project subject](en.subject.pdf)

## Backend foundation

The backend is separate from the mobile UI and uses FastAPI and PostgreSQL.
Follow the [backend setup and verification guide](backend/README.md) before
making backend or database changes. The email/password account lifecycle and
its account/session migration are documented in the
[auth lifecycle guide](backend/docs/auth-lifecycle.md); this does not wire
mobile credentials. Profile and friendship backend behavior is documented in
the [profile/friendship contract](backend/docs/profile-and-friendship.md);
avatars use durable PostgreSQL storage with privacy-filtered access. Google native
ID-token verification and explicit account linking are implemented in the
backend and documented in the [auth lifecycle guide](backend/docs/auth-lifecycle.md).
The approved static Apple iTunes metadata source is
[backend/data/songs.json](backend/data/songs.json); provenance and the backend
catalog/search API are documented in the
[song catalog documentation](backend/data/SONG_CATALOG.md). These records are
metadata only, do not provide playable media or imply a playback SDK, and are
not production defaults. Artwork files are not included or served.
The current checkout contains no iOS project or mobile source, so native SDK
integration remains a client-side task. Facebook is not supported.
The shared HTTP/error contract is documented in the
[backend API contract](backend/docs/api-contract.md); playlist routes and
revisioned WebSocket invalidations are implemented and documented in the
[playlist contract](backend/docs/playlists.md), but are not wired to mobile.
Room lifecycle, public/private discovery, Join/leave, invitations, protected
join codes and authorization-aware realtime are implemented and documented in
the [room contract](backend/docs/rooms.md), also not wired to mobile. Room
visibility is separate from vote eligibility; licensed invitee-only voting and
location/time policies remain unavailable pending their policy/evidence gates.
The current mobile playlist create screen defaults to private and must be
corrected to public/everyone when client integration resumes. The song catalog
routes are implemented and documented separately.
The authenticated in-app notification API provides durable unread/read state
and typed resource references; playlist invitation producers are wired, while
other resource producers and mobile wiring remain pending. Native notification
permission and server push registration or delivery are not implemented. The
development-only seed command now includes representative public/private rooms
hosted by the persistent demo accounts; its behavior is documented in
[development demo data](backend/docs/development-demo.md).

## Checks

Run inside `mobile/`:

```bash
npm run typecheck
npm run lint
```

Backend verification (from `backend/`):

```bash
python -m pytest
```

The backend tests require the isolated PostgreSQL `cuevo_test` database; see
the [backend setup guide](backend/README.md) for the documented port override
and migration procedure.

TypeScript and linting passed for the latest session changes on 2026-11-21. Mock account/membership seed integrity was checked. Selected flows have been inspected in Expo Go on iOS Simulator; full regression, later Settings/Help interactions and physical-device/Android behavior remain unverified. A native keyboard-language-switcher crash is documented in the handoff. Earlier web/native build checks do not validate the current full UI.

Home, room/playlist lists and universal search include two-second skeleton previews. Static Home header/banner stay visible. See the [session handoff](doc/SESSION_HANDOFF.md) for replay behavior and integration limits.
