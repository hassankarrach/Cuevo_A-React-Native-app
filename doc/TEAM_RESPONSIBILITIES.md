# Cuevo — team responsibilities

This document applies the agreed ownership split to `PROJECT_PLAN.md`. You lead the React Native mobile application and responsive web bonus, and contribute a bounded backend feature. Your teammate leads the backend and shared-state logic.

## Your main responsibilities

### 1. React Native mobile application

Own the mobile application from setup through device testing. Your primary environment is the MacBook Air M1 with Expo and the iOS Simulator; iOS is the first mandatory platform. Browser preview is optional. Follow `LOCAL_DEVELOPMENT.md` for setup.

- Project structure, navigation, reusable UI, and client state management.
- Configurable backend address for evaluation and testing.
- API integration, authenticated sessions on the client, loading/error states, and reconnect behavior.
- Registration, login, email verification, password reset, and social account linking screens.
- Native social login SDK integration, coordinated with backend identity verification.
- Profiles, music preferences, and friendship screens.
- Playlist creation, invitations, visibility/settings, and collaborative editing screens.
- Event discovery, invitations, voting, and voting-policy screens.
- Music-provider SDK integration and playback controls, coordinated with the authoritative backend queue.
- Real-time updates for playlists, votes, and playback state.
- Client action reporting and device metadata needed for backend logs.
- Mobile usability, device testing, and client documentation.

The server decides access rights, vote eligibility, queue ordering, and committed shared state. Client-side checks support the experience but never replace server enforcement.

### 2. Responsive web application bonus

Own the React web client after the mandatory mobile flows are stable:

- Responsive navigation, layouts, and screens.
- Account flows and the two selected services: Playlist Editor and Track Vote.
- Integration with the same backend and real-time events as mobile.
- Shared API types and suitable non-UI logic where practical.
- Browser testing at narrow and desktop widths.
- Clear handling of provider/native features that differ between browser and mobile.

The web application is a second client of the existing system, not a separate backend or database. Supporting both Android and iOS is not required by this ownership plan.

### 3. Bounded backend contribution: profiles and friendships

Own this feature end to end, with your teammate reviewing the schema, API, and authorization:

- Profile and music-preference database changes.
- APIs for reading and updating profiles.
- Public, friends-only, and private field filtering on the backend.
- Friend request, acceptance, removal, and listing behavior, agreed before implementation.
- Authentication and access checks for these endpoints.
- Tests for privacy boundaries and friendship state transitions.
- API documentation and corresponding mobile screens.

Agree contracts and migrations with your teammate before coding. Reuse the shared authentication and database conventions. This contribution gives you backend experience without taking ownership of another complete service.

### 4. Client side of the other bonuses

- **Offline:** cached playlist views, queued edits, pending/stale indicators, reconnect synchronization, and conflict UI.
- **IoT:** native proximity detection, permissions, event information display, and testing with real hardware.
- **Subscriptions:** offer/plan screens, switching flow, and entitlement-aware UI using backend decisions.

These features depend on backend contracts and shared integration work; owning their client side does not mean implementing each bonus alone.

## Your teammate's main responsibilities

- Backend architecture, database foundations, migrations, and shared API conventions.
- Authentication, sessions, social identity verification/linking, email verification, and password reset.
- Playlist persistence, invitations, access control, and concurrent editing.
- Events, voting rules, location/time eligibility, atomic voting, and queue ordering.
- Authoritative playback coordination and real-time infrastructure.
- Subscription persistence and server-side entitlement enforcement.
- Offline synchronization endpoints, conflict rules, and duplicate-operation prevention.
- IoT event lookup and access control.
- Security controls, backend action logs, load testing, CI, and deployment/setup documentation.
- Review and integration support for your profiles/friendships backend work.

## Shared responsibilities

- Prove music playback, social login, and IoT feasibility early.
- Define API contracts and real-time events together before implementing each client/server slice.
- Agree permissions, vote rules, playlist conflict behavior, and offline synchronization rules.
- Review each other's changes and integrate frequently.
- Test private-resource access, simultaneous actions, disconnects, and provider failures together.
- Keep setup instructions and requirement checklists current.
- Understand the whole architecture and rehearse the complete defense together.

## Suggested order for your work

1. Learn the React Native foundations while building navigation and a basic API-connected screen.
2. Prototype music SDK playback and social login on a real phone; spike native IoT feasibility early.
3. Build account screens and implement profiles/friendships end to end.
4. Build Playlist Editor screens and integrate real-time behavior.
5. Build event/voting screens and integrate playback.
6. Complete mobile error handling, reconnects, device tests, and mandatory acceptance checks.
7. Build the responsive web bonus and finish the client parts of subscriptions, offline mode, and IoT.
8. Rehearse the integrated project and defense with your teammate.

## Workload boundaries

Your largest commitments are learning React Native, completing the mandatory mobile application, and delivering the web bonus. Keep backend contribution focused on profiles/friendships initially. If the client workload grows, your teammate should take suitable web/API integration or bonus support tasks rather than leaving all client and bonus work with you.

Do not begin full web implementation at the expense of unfinished mandatory mobile flows. Bonus assessment depends on the mandatory project working completely.
