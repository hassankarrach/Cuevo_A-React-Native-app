# UI progress — updated 2026-11-27

“Connected” below means client code calls the existing backend; it does not imply live device acceptance. This current checkpoint supersedes older integration-status statements below. Mandatory acceptance in PROJECT_PLAN remains unchecked until integrated and verified.

## Existing backend APIs: client integration status

All paths below are relative to `/api/v1`. This table covers backend functionality already present through `origin/backend` commit `9d982f5`, merged locally as `c71231c`. It is not a request to implement future catalog/playlist/room APIs.

| Feature | Existing backend endpoints | Client status |
| --- | --- | --- |
| Register and verify | `POST /auth/register`, `/auth/email/verify`, `/auth/email/resend` | Connected; resend replaces challenge ID and respects cooldown/Retry-After. Registration challenge restart persistence remains pending. |
| Email login and sessions | `POST /auth/login`, `/auth/refresh`, `/auth/logout`; `GET /me` | Connected; secure native storage, startup validation, coordinated one-use refresh, account-scoped providers. Browser credentials remain in memory. |
| Initial profile setup | `GET/PATCH /me/profile`; `PUT/DELETE /me/avatar`; `GET /profiles/{account_id}/avatar`; `POST /me/onboarding/profile-completed` | Connected for display name, required username and optional photo. Profile reads restore server data; save failures block continuation. |
| Native Google login/sign-up | `POST /auth/google` | Connected on iOS native build. Email collisions require existing login plus explicit linking. Live Google authentication/token exchange still needs user testing. |
| Google linked accounts | `GET /me/linked-accounts`; `POST /me/linked-accounts/google`, `/me/linked-accounts/google/unlink` | Connected in Settings, using current-password confirmation and rotated Cuevo credentials. Live link/unlink remains pending. |
| Password recovery | `POST /auth/password/reset/request`, `/auth/password/reset/confirm` | Connected from login → Forgot password; resend on both steps. Server validates code/expiry; no local demo code or fabricated expiry. |
| Settings password change | `PUT /me/password` | Connected. Wrong password preserves session; successful mutation stores rotated tokens. Other sessions are revoked by backend. |
| Edit Profile screen | `PATCH /me/profile`, avatar endpoints above | **Remaining:** connect editor saves (name/username/bio/location/photo); its current Save changes only updates local context. Initial setup already uses these endpoints. |
| Profile privacy | `PATCH /me/privacy` | **Remaining:** client wiring and contract reconciliation. Backend has one profile visibility value; client currently exposes separate bio/location/genre visibility values. Do not silently collapse them. |
| Music preferences | `PUT /me/music-preferences` | **Remaining:** persist selected genres from profile editor. |
| Other profiles | `GET /profiles/{account_id}` and authenticated avatar read | **Remaining:** replace mock profile lookup and respect omitted private fields/capabilities. |
| Friendship relationship and request | `GET /friends/{account_id}/relationship`; `POST /friend-requests` | **Remaining:** use actual account IDs and backend relationship/capability state. |
| Friendship responses/removal | `POST /friend-requests/{request_id}/accept`, `/decline`, `/cancel`; `DELETE /friends/{account_id}` | **Remaining:** wire actions using real request IDs; notification list/actions still use fixtures. |
| Friend lists | `GET /friends`, `/friend-requests/incoming`, `/friend-requests/outgoing` | **Remaining:** replace mock accounts/request collections and integrate pagination. |

## Verification and remaining acceptance

- Latest mobile checks: `npm run typecheck`, `npm run lint`, **23 client tests passed** (`npm run test:session`). Tests cover session lifecycle, profile setup transport, Google cancellation/collision/rotation, recovery errors, password-change rotation and lost-response handling.
- Backend evidence: full suite **108 passed** after merge; subsequently the two focused recovery tests and one password-change test passed against isolated `cuevo_test`, with one existing dependency deprecation warning. No backend source was directly changed.
- Native iOS Debug build succeeded and installed on the existing iPhone 17; verified Continue with Google opens the iOS accounts.google.com sign-in prompt. User authentication and real Google link/unlink are not yet verified.
- Still test manually: profile/avatar persistence and failure/retry; completed-profile cold launch; password recovery email/code/new-login flow; Settings change-password and subsequent login/session behavior. No real account password was changed by the assistant.
- Local development database migrations now reach `0005_profile_avatars`; API was restarted and `/health` returned ready. Service availability must be rechecked on resume. Demo seed was not run.

## Current decisions and UI checkpoint

- Keep email flow: sign up → verify → “You’re all set” → login → profile setup → notifications → introduction → Home.
- Google name/avatar import and shorter Google setup are **on standby**. New Google accounts still complete the current profile form.
- Push registration/delivery/tap handling remains **on standby**; OS permission UI is separate.
- Latest notification cards: very light unread backgrounds, orange unread dot at top right, one concise actor/action title, no description, smaller avatar with white type icon in a top-right orange/peach diagonal gradient badge. Orange Accept and transparent gray-bordered Reject sit below the title; Reject uses a small bold gray cross. Cards have no border. Data/actions remain mock-backed.
- Current frontend changes and documentation remain uncommitted/unpushed. Saving this checkpoint does not authorize a commit or push.

## Offline playlists checkpoint — 2026-11-21

Deferred for later at the user's request. Keep subsequent implementation small and explain each code change with its file location; avoid unnecessary abstractions and field-by-field validators.

Implemented:
- Installed `expo-sqlite`; `mobile/src/storage/database.ts` opens `cuevo-playlists.db` and creates the account-scoped `cached_playlists` table.
- `mobile/src/storage/playlistCache.ts` saves/updates a playlist JSON snapshot and reads it by account and playlist IDs. Revision is nullable; cache time is stored. JSON parse errors return null.
- `PlaylistsContext.tsx` exposes `restorePlaylist`; `PlaylistScreen.tsx` reads the saved copy before enabling saving/editing, then saves on playlist changes. Now uses the authenticated account ID (updated 2026-11-26). Loading/read-error feedback and save-error toast are present.
- Latest `npm run typecheck` and `npm run lint` pass. Device persistence has not been verified.

Next tasks:
- [ ] Restore all saved playlists into the playlist list after restart, including newly created playlists. Currently only opening a known detail route restores its cached snapshot.
- [ ] Device test: open/edit a playlist, let the save finish, restart the app, reopen and verify the saved edits. Confirm first-open behavior and cache read/write failures.
- [ ] Add durable queued edit operations, connection/status handling and retries.
- [ ] Agree and integrate backend revision/conflict checks, operation deduplication and permission revalidation.
- [x] Replace fixture account scoping with authenticated account IDs (2026-11-26); in-memory providers reset on account change.
- [ ] Decide/implement explicit deletion of retained account-scoped SQLite snapshots on logout if required.
- [ ] Cache remote song metadata/artwork when real catalog data arrives; current details/covers resolve from bundled catalog assets.

This is local snapshot persistence, not a completed offline synchronization bonus. No offline audio downloads are planned.

## Screen inventory

Nearby visual (2026-11-22): Rooms → Nearby opens `/nearby`, with native warm radial gradients, a glowing circle with breathing/rotation animation, Searching/Stopped copy and Stop/Scan controls. Focus/background/Reduce Motion handling included. Simulator visual and stop/restart QA, lint/typecheck passed. This is simulated searching only; BLE scanning, actual results and backend resolution remain pending. Current installed APK/standalone Release does not include this later change.

Notification permission (2026-11-21): added `/notification-permission` after the final introduction slide, with Enable notifications / Later, existing-permission checks, native OS request, Android channel setup and error/loading states. Typecheck/lint pass; device/system-dialog QA remains pending. Push registration/delivery and tap handling remain unimplemented. See `NotificationPermissionScreen.tsx`.

| Area | Implemented UI / local behavior | Remaining UI |
| --- | --- | --- |
| Welcome | Native gradient/ribbon Lottie with the selected 3D trio layered over it and a bottom alpha fade; Get started/login | Final device/layout QA and production app icon |
| Account setup | Shared login/signup modal, signup validation, verification step, profile setup; Forgot/Reset password forms with local code checks, resend cooldown and confirmation/error states | Real auth/email delivery/social linking; request loading/network errors; carry setup name/photo into shared profile |
| Introduction | Three illustrated steps; centered lowered characters, uppercase Black headings with smaller straight handwriting and bold symbols; final action opens Home | Compact/large-text/Android/physical-device QA |
| Home | Greeting/account popup, silent video banner, solid white fixed navbar, bordered search/bell controls, linked rooms/playlists | Two-second skeleton preview added; real network/error integration remains |
| Universal search | Full-screen grouped room/playlist/song/profile search; compact art/avatar rows with gray corner badges; explicit safe-area padding | Two-second query skeleton added; remote discovery/access and repeated-open/keyboard inset QA remain |
| Song detail | Dedicated /song/[id] page with metadata, cover, source link/error state and containing playlists | Real playback/service integration and full device interaction QA |
| Main navigation | White glass Home/Rooms/Playlists pill, separate orange plus, bottom blur/fade | Complete destination screens and navigation QA |
| Plus actions | Existing create popups validate names, add session items and open detail; six-box Join accepts AAAAAA for On Repeat and shows success/error toasts | Real invite lookup, richer creation fields and defaults review |
| Rooms tab | Home cards in two-column grid; created rooms; room/song/artist search; participant-count/genre sorting dropdown, swipeable genre pills/reset; no-results state | Network/loading/error states and backend discovery/access |
| Room detail | Rounded native now-playing header, rotating vinyl/catalog cover, room/host/genre information and host-only progress/playback controls, participant avatars/host badge, Invite picker, Queue/Activity tabs, song cards, highlighted current song, external solid-caret vote pills | Real playback integration; real invitations/settings/private-room/location-time voting-policy UI; playback progress and network/error states |
| Room roles | Host, joined participant, visitor scenarios; fixed Join; Leave; session membership updates; local voting and one-song suggestion preview; host pause/resume/skip | Backend-backed eligibility and realtime state; queue ranking and lifecycle now use shared session state |
| Playlists tab | Searchable seeded and newly created playlists, cover collages/counts and detail navigation | Backend discovery/access, real loading/error states |
| Playlist detail/editor | Rounded header, collage/metadata/collaborators; catalog add/remove/reorder; owner Edit modal for name/description/visibility/song-edit policy; shared session edits | Backend permissions, real invitations, realtime collaboration and reconnect/conflict UI |
| Profiles | Separate own/public pages with shared header/banner; public text details/tags, local request button; own photo/edit/save | Real friendships, backend privacy enforcement, social linking, persistence and access-filtered fields |
| Mock data | Ten JSON accounts, stable IDs, four membership cases including private After Hours; profile links; shared Home/room counts and avatars | More varied scenarios as needed; replace with API data later |
| Notifications | Six-type popup with gray badges/unread backgrounds, equal compact rows, same-row check/close actions, avatars/covers, mark-all-read and destination links | Backend delivery, real invitation/friendship effects, loading/error states |
| Settings/account menu | Clean avatar popup: Profile, Settings, Help & about, Log out. Dedicated Settings and Help routes; profile editing link, password UI, saved session privacy choices/server address, linked-account status | Real password verification/change, social linking, backend privacy enforcement, API-client address usage, persistent settings and auth sign-out |

Direct messages are optional and not in the current required UI backlog. Notifications are a planned product surface, not a separate mandatory service in the subject. Subscription offer/payment/review UI and initial local playlist persistence are present; real billing, offline synchronization, IoT and responsive web remain incomplete; see PROJECT_PLAN for their full scope.

## What works in this preview

- Home avatar opens the account popup; Profile opens the editable own profile and save updates the shared session profile.
- Room cards open their corresponding route and role case.
- Participants open the selected profile; another person uses a separate read-only layout with plain text details.
- Join/Leave updates shared mock membership across navigation, including Home counts/avatars and room counts/avatars. Reload restores JSON seeds.
- Voting toggles/withdraws one up/down vote per queued song; score ranks waiting songs, suggestion order breaks ties, and the current song stays pinned.
- Suggest opens the shared search-first catalog picker; all 40 catalog songs can be added and duplicates are prevented. Search stays fixed above results, with no initial suggestions.
- Host start/pause controls the turntable/local playback clock. Next also finishes the final song. Empty queues stay open for suggestions and manual host restart. End room freezes the room for viewing. No audio plays.
- Suggestion, vote, playback, ended status and membership survive navigation in shared session state; reload resets the seeds.

## Three room test cases

| Room | Initial viewer | Host | Initial members | Primary controls |
| --- | --- | --- | ---: | --- |
| Kitchen Disco | Host | Current profile | 7 | Suggest, vote, pause/resume, next |
| Late Nights | Joined participant | Sara | 6 | Suggest, vote, Leave |
| On Repeat | Visitor | Amine | 5 | Read-only scores; Join enables participant controls |

Data: `mobile/src/data/mockAccounts.json`. Null mock photo URIs use colored initials. Verification badges are visual test data, not real account verification.

## Design decisions to preserve

- Brand orange `#FF4D24`, warm off-white surfaces, rounded cards and square profile/cover images.
- Room top header is now **solid off-white**. The top blur/fade trial was removed. Room bottom keeps its gradient fade and soft blur.
- Home navigation has white glass styling; the plus menu has white action pills and a curved orange/peach backdrop.
- Upcoming songs have 4px cover inset and separate up/score/down pills outside the right card border. Current song stays pinned first without votes.
- Public-room preview is allowed before joining; visitor actions require Join. Private rooms should require invitation/code before exposing content (not implemented).
- Audio is host-only. Participant devices display shared state and offer suggestions/votes; they do not play room audio.
- The subject sets no minimum/fixed catalog size and does not mandate device uploads. Provider/catalog strategy is still open; the five initial tracks are UI samples.
- Welcome and all three intro artworks use the same human trio and orange 3D style. Intro images have no left fade; centered/low placement hides feet. Main text is uppercase Lufga Black, lead-in smaller straight Caveat. Heavy hashtag/arrow only; thin underline trial removed. Do not regenerate or revise unasked.
- Home top navbar is solid white; fade/blur trial was reverted. Search opens from the header and songs have a dedicated route.

## Recommended UI order next

1. Room Suggest/search now uses the 40-song catalog. Queue album artwork remains a visual follow-up.
2. Build room visibility/invitation and everyone/invite-only/location-time voting-policy controls; fixed vote uniqueness/ranking rules are already implemented locally.
3. Complete real invitation effects and private-access states for rooms/playlists; add playlist own/shared/public filters.
4. Integrate settings privacy/social/password/address with the backend; complete friendships and carry signup profile into shared profile state.
5. Connect auth/email/social services and loading/network/reconnect/conflict states.
6. Integrate universal search with remote discovery/access filtering and connect notifications to authoritative actions.
7. Reconcile playlist creation default (currently private) with subject public/everyone-edit requirement.
8. Complete keyboard/small-screen/large-text/accessibility/physical-device/Android QA, including search modal inset recurrence and onboarding typography.

Provider playback feasibility and backend/API contracts remain separate work. The UI is a substantial local prototype, not a completed mandatory project.

## Validation (latest session and prior baseline)

- `npm --prefix mobile run typecheck`: passed.
- `npm --prefix mobile run lint`: passed.
- Mock seed integrity checked: ten unique IDs, valid room member/host references, host present in membership, no duplicate members, role/self-membership consistency.
- Earlier simulator inspection covered Home/room composition, host controls and another account's read-only profile. No full end-to-end regression or physical-device/Android QA was completed.

## Latest playlist/room update

Room participants heading now has + Invite for joined users/hosts. Shared invitation picker is a local preview only. Playlist pages use the 40-song sourced catalog; room queue still uses the earlier five mock tracks. Playlist UI and catalog additions are session previews, not backend completion.

Latest design preferences: filled icons throughout; no Preview/Mock/development-status copy in product UI. Toasts use glass blur, a light white border and larger filled icons. The reference-inspired dark playlist list was reverted. Home video overlay uses bright orange/peach/coral at roughly 80% coverage, no brown.

## Creation flows — 2026-11-19

- Existing Create room/playlist popups now trim and validate names, guard repeated submissions, create shared session items and open their existing detail routes.
- Rooms start public, with self as host/only participant and an empty queue. Home includes newly created rooms. Playlists start private with self as creator/collaborator and no songs; Home/list update from the shared provider.
- No new pages or backend/persistence added. Join with code now accepts the temporary AAAAAA code for On Repeat.
- Typecheck and lint passed; simulator verified created Test room/playlist on Home and their detail screens, host/creator ownership, empty states and add controls.

## Join with code — 2026-11-19

Six individually focusable code boxes support uppercase normalization, focus advance, backwards deletion and full-code paste. AAAAAA joins On Repeat and opens its existing detail screen; any other/incomplete code shows an error toast above the modal. Simulator verified error feedback and successful membership/count update. Typecheck/lint passed.

## Room controls — 2026-11-20

Shared session queue with one changeable/withdrawable up/down vote per member/song, automatic score ranking, stable suggestion-order ties and pinned current song. Hosts can remove songs but cannot reorder them. Local duration simulation advances/finishes the queue; exhaustion stays open and subsequent suggestions require manual start. Host End room confirmation freezes playback and mutations while preserving the viewable room; cards show Ended and the Rooms filter includes ended rooms. Real audio, realtime votes and persistence remain unimplemented. Pure queue logic checks, typecheck and lint passed; Simulator accessibility inspection confirmed control roles, but screenshot capture timed out.

## Latest account/navigation update — 2026-11-20

Home avatar opens only Profile, Settings, Help & about and Log out, using plain filled icons beside text. No repeated avatar/name/title or room/playlist shortcuts. Settings and Help have dedicated routes; settings includes edit-profile link, password form, saved session privacy choices/server URL and unlinked Google/Facebook status. Password/OAuth/privacy/address integration remains backend work. Logout returns to Welcome, clears navigation history and does not reset shared data. Both Home popups use window width minus 40 points, preserving 20-point side margins.

## Known keyboard crash

Expo Go crash report/logs show a native iOS keyboard-language-switcher NSRangeException, not JS validation. AuthField current/new-password autofill semantics were corrected separately; this is not a proven fix. Choose keyboard language before focusing secure fields as a temporary workaround. See SESSION_HANDOFF for evidence and verification limits.

## Latest welcome/search/notification pass — 2026-11-20

See SESSION_HANDOFF for final design constraints, routes/assets/prompts and verification limits. Three intro pages are complete; older notes describing deferred artwork are historical. All final code checks passed. The last typography revision was visually confirmed in Simulator; search/song/notification edge cases and Android/physical-device behavior remain unverified.

## Search-first picker update — 2026-11-20

Room Suggest, room Invite, playlist Invite and playlist Add Songs share a fixed-top search modal frame. No items render until a nonblank search; each opening starts fresh. Room Suggest now adds real catalog selections into local queue state with stable song-page IDs and duplicate protection. Typecheck/lint and 40-song queue assertions passed; Simulator verified room suggestion/invitation and playlist song-search behavior. Invitations still have local-only effects.

## Native room header — 2026-11-21

Room header now uses native vinyl/artwork and currently playing song metadata, with elapsed/duration, tap-to-seek, restart, play/pause and next controls. Removed its notched top-right shape, Lottie and duplicate floating bottom host controls. Participant/visitor controls are disabled and state mutations remain host-guarded. Typecheck/lint and queue-control assertions passed; final room visual verification pending. Playback remains simulated without audio.

## Latest checkpoint — 2026-11-21

- Room card: white foreground over bundled orange video; progress at bottom; room title/private lock moved to top navigation. Actual cover thumbnails in the queue. Home room-card song taps open the room.
- Discovery: public and private items are intentionally listed on Home; only private locks are shown. New private fixtures: After Hours and Inner Circle. No backend privacy enforcement is implied.
- Rooms controls: sorting dropdown for default/most/fewest participants/genre; horizontal genre pills derived from metadata. Gray bordered filter control matches input height.
- Shared badges: explicit data flags; scalloped orange verification seal; orange PLUS badge with warm-white sparkle.
- Plus: 99 DH offer → saved-method review or add payment → final review. Settings lists masked saved methods, expiry, selection/removal/add. Seeded 4242 Visa. All summaries are session-only; no payment provider, charge, entitlement update or billing period implemented.
- Loading preview: Home room/playlist cards on focus; universal search after nonempty input; Rooms/Playlists on first mount and input changes. Two-second cancellable delays. Static greeting/banner/page controls remain visible. Native pulse respects Reduce Motion.
- Validation: latest lint/typecheck pass; discovery and payment validation assertions passed. Simulator verified Home skeletons and Plus/card flows. Search and list loading changes await direct visual QA; no account workflow was interrupted to do so.

## Nearby map and simulated discovery — 2026-11-22

- Rooms → Nearby opens `/nearby`. Pale OpenStreetMap tiles use fixed UM6P Benguerir coordinates, HTTP caching and native Cuevo request identification. Tile errors show connection feedback. Keep visible map attribution; no actual GPS tracking is implemented.
- Native peach/orange/cream radial gradients give the reference-inspired mesh effect over the map. Radar has concentric warm rings, a native-driven six-second SVG sweep and a breathing pulse; Reduce Motion, focus and AppState control animation. No location label on the radar.
- Header follows the existing secondary-page style: plain arrow, centered 21px semibold title. Copy is limited to title, short search/result status, action and map credit.
- One taller white panel holds searching/paused/results content. Shared orange PrimaryButton overlaps its bottom edge, preserving the standard 15px corners, glow and white close/radio icon. PrimaryButton now accepts an optional JSX `icon` prop.
- Five-second simulated discovery reveals Kitchen Disco, Late Nights and On Repeat when public and active, with current local listener counts and track title when present. Rows open the existing room route. Stop cancels; Scan restarts. Focus cleanup cancels old timeouts; background clears the timeout and foreground starts a fresh five seconds.
- Validation: latest `npm run typecheck` and `npm run lint` pass. Simulator screenshot verified the final mesh/map, radar, result rows and overlapping action. End-to-end stop/rescan/result navigation, denied/network states, Android, physical-device and accessibility layout QA remain pending.
- Simulation only: no BLE scan, GPS permissions, distance/range claims, backend lookup or authorization integration. Installed standalone/APK snapshots predate this redesign and need rebuilding to include it.

### Dark application appearance — 2026-11-24

Home and onward screens now share charcoal surfaces, ivory text, muted secondary labels and subtle borders. Includes rooms/playlists/song details, profiles, utility pages, Nearby, billing screens, dialogs and skeletons. Welcome/introduction/notification onboarding remain light. Appearance is route-scoped, without a system/light/dark preference selector. Selected iOS Simulator screens visually checked; physical Android appearance remains unverified.
