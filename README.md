# Cuevo

Cuevo combines **cue/queue + vote**: people choose what plays next and build playlists together.

A React Native music app with live track voting and collaborative playlist editing.

This two-person project is in the mobile UI and mock-interaction stage. Illustrated welcome/introduction, account recovery and verification UI, Home, grouped universal search, dedicated song details, room discovery/search/filtering, local creation/join flows, queue voting/lifecycle, profiles, notifications, playlist editing, Settings and Help are built. Private-room/invitation and location/time voting-policy UI remain unfinished. Real authentication, backend services, audio playback, realtime collaboration and production bonuses are not implemented. Plus offer/payment/review UI and session-only saved-card summaries are available; no real payment is processed. See [UI progress](doc/UI_PROGRESS.md) for the current inventory.

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
- [Project plan and requirements](doc/PROJECT_PLAN.md)
- [Team responsibilities](doc/TEAM_RESPONSIBILITIES.md)
- [Cuevo backend setup and migrations](backend/README.md)
- [Project subject](en.subject.pdf)

## Backend foundation

The backend foundation is separate from the mobile UI and uses Python 3.12,
FastAPI and PostgreSQL. Follow the
[backend setup and verification guide](backend/README.md) before making backend
or database changes; the current migration does not add account or
product-domain tables.
The proposed shared HTTP, error and WebSocket conventions are documented in
the [backend API contract](backend/docs/api-contract.md) and are pending
frontend review; they do not represent mobile integration or implemented
product routes.

## Checks

Run inside `mobile/`:

```bash
npm run typecheck
npm run lint
```

TypeScript and linting passed for the latest session changes on 2026-11-21. Mock account/membership seed integrity was checked. Selected flows have been inspected in Expo Go on iOS Simulator; full regression, later Settings/Help interactions and physical-device/Android behavior remain unverified. A native keyboard-language-switcher crash is documented in the handoff. Earlier web/native build checks do not validate the current full UI.

Home, room/playlist lists and universal search include two-second skeleton previews. Static Home header/banner stay visible. See the [session handoff](doc/SESSION_HANDOFF.md) for replay behavior and integration limits.
