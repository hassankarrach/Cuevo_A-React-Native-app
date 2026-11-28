# Session handoff — 2026-11-27

## Resume here

Read root/mobile AGENTS.md and LEARNING_NOTES.md. The authoritative endpoint inventory and remaining client work are in [UI_PROGRESS.md](UI_PROGRESS.md#existing-backend-apis-client-integration-status); startup/native build details are in [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

The user authorized the backend merge and incremental integration of profile setup, Google, password recovery and Settings password change after the earlier pause. Those slices are implemented; do not infer authorization to implement the rest automatically. Google name/avatar import and push integration remain on standby. Do not directly edit backend files. No commit/push was requested for this documentation checkpoint.

Completed client integration:

- Registration, verification/resend, email login, secure restoration/refresh/logout.
- Initial profile save/read, username, optional raw JPEG upload/delete and explicit profile completion. Separate Edit Profile saves remain local.
- Native iOS Google sign-in/sign-up and Settings linked-account state/link/unlink with password confirmation. Only Cuevo tokens are durably stored; provider token/password are not persisted.
- Login → Forgot password request/resend/confirm. Server validates code/expiry; recovery is non-enumerating and respects Retry-After.
- Settings → Change password calls the real API and saves rotated tokens before subsequent queued requests. Wrong-password errors preserve the session; ambiguous rotation clears stale credentials.

Remaining integration of **already implemented backend features**: Edit Profile save/photo changes, privacy (resolve single backend visibility versus per-field UI first), music preferences, other profile reads/avatars, friendship relationship/request/accept/decline/cancel/remove, and friend/incoming/outgoing lists. See the endpoint table in UI_PROGRESS; catalog/rooms/playlists/notification APIs are future backend work and are not this backlog.

Validation: mobile typecheck/lint and **23 client tests pass**. Full merged backend suite previously **108 passed**; focused recovery **2 passed**, password-change **1 passed**, using isolated test accounts/database. Native iOS Debug build succeeded and installed on the existing iPhone 17 (com.cuevo.app), and Google button visibly opened the accounts.google.com prompt. End-to-end Google authentication/link/unlink, profile photo persistence/cold launch and password device flows remain unverified. No real-account password was changed by the assistant.

Backend branch through `9d982f5` merged with history-preserving commit `c71231c`; not pushed. All four documented teammate requests were addressed in backend code/tests. Development migrations were subsequently applied through `0005_profile_avatars` and API health verified ready. PostgreSQL/Mailpit/Metro/API were left running; check before reuse. Pillow is available through temporary `/private/tmp/cuevo-review-deps`, not installed in backend/.venv. Demo seed was not run. Source/client/doc changes remain uncommitted; preserve them.

Notification modal design saved: very faint unread tint, top-right orange unread dot, concise title only, small avatar with top-right gradient badge/white icon, orange Accept and nearby transparent gray-bordered Reject with small bold gray cross. No card borders. Fixtures/actions still local.

All content below is historical; the current checkpoint and UI_PROGRESS table above take precedence.

Read `mobile/AGENTS.md`, `LEARNING_NOTES.md` and `UI_PROGRESS.md` first. Earlier detailed context is preserved in `SESSION_HISTORY_2026-11-20_LATE.md` and the other dated histories.

## Historical checkpoint — 2026-11-26 (superseded above)

**User direction — 2026-11-26:** pause further backend-dependent integration and push-notification work. The user will update the UI while the backend teammate fixes the open issues. Do not resume these integrations automatically, modify backend files, commit/push, or shut down services without a request. Keep UI changes incremental and preserve the working authentication flow.

Completed:

- Remote backend merged into main with real merge commit `df796eb` and pushed; teammate authorship/history preserved. Subsequent client work remains uncommitted.
- Local PostgreSQL 16, Mailpit and FastAPI configured; migrations applied. Check service availability before previewing; setup commands are in LOCAL_DEVELOPMENT.
- Real registration and initial email verification connected; wrong codes rejected in the simulator. Fixed the empty golden.jpg asset that had blocked updated bundles.
- Login, secure native token storage, startup session validation, coordinated refresh and logout connected. Passwords are not persisted by app code. Browser tokens remain in memory.
- Completed accounts enter Home; unfinished accounts resume profile setup. Actual profile name/photo persistence is still missing; the existing local setup UI does not mark backend onboarding complete.
- Account changes reset client providers; playlist snapshot keys use authenticated account IDs.

Backend review update — 2026-11-27: merged `origin/backend` through `9d982f5` into local `main` with merge commit `c71231c`, preserving teammate history and existing uncommitted frontend work. Not pushed. The four requests below are addressed in backend code/contracts/tests: resend returns replacement challenge metadata with non-enumerating responses; development/test auth limits are configurable with production defaults enforced; guarded, repeatable demo-account seeding is implemented; profile/avatar persistence and saved-profile onboarding completion are implemented. Room/playlist seed extensions remain deferred until their features exist. These were documented issue drafts; this handoff does not establish that GitHub issues were published or closed.

Local verification after merge: full backend suite **108 passed, 1 dependency deprecation warning**. Pillow 11.3.0 was installed only into `/private/tmp/cuevo-review-deps` for verification because the existing backend virtual environment lacks the new dependency. Tests used the isolated `cuevo_test` database; no development migrations or seed command were run, and no backend files were directly edited. Client wiring and device end-to-end checks remain pending; the prior integration/push-notification pause remains in effect. Profile privacy currently has one backend setting versus separate field settings in the client, requiring coordination before that integration.

Previously pending backend teammate issues (drafts given to the user; not sent by the assistant):

1. **Verification resend/resume:** resend replaces the challenge without returning its ID, but verification requires that ID. Need a privacy-safe client contract including challenge and timing metadata, with restart recovery.
2. **Development rate limits:** local tests and simulator share an IP and exhaust registration's 5/hour bucket. Request configurable development/test limits while preserving production enforcement and Retry-After. The client now formats long waits in minutes.
3. **Persistent demo data:** explicit development-only seed command, safe to rerun without duplicates or deleting existing data. Demo accounts first; rooms/playlists when their backend models exist.
4. **Profile persistence:** profile read/update, avatar upload/delete, and agreed server onboarding-completion behavior. Existing /me/onboarding/profile-completed only changes a flag; it does not save name/photo.

Notifications — on standby:

- OS remembers granted/denied notification permission locally; permission is separate from account/session persistence.
- Current setup intentionally displays its notification screen after profile setup; Next checks/requests permission, then continues to introduction. No automatic permission-based screen skip.
- Push token registration, account/device association, backend delivery and notification-tap integration remain unimplemented and explicitly deferred. Do not add them while the user focuses on UI.

Validation at the latest implementation checkpoint: mobile lint/typecheck and 7 focused session tests passed; live API registration/verification/login/restoration/refresh/logout checks passed; simulator wrong-code rejection and successful login to profile setup verified. Native cold-launch session restoration and Home routing for a real completed profile are not yet device-verified. No backend files changed during client integration. Older notes below are historical where they conflict with this checkpoint.

Assistant identity and backend request format: **GPTato**. Every backend request drafted for the user should introduce GPTato naturally and clearly explain the finding, its client impact, and the requested change. Do not require a fixed phrase after the introduction. Provide the draft to the user; do not send it without explicit authorization.

Ownership rule (2026-11-26): never directly change any file under `backend/`. All backend functionality, fixes, configuration, tests, and seed scripts must be requested from the teammate and their agents. This supersedes older profiles/friendships ownership plans. Read root `AGENTS.md` and `TEAM_RESPONSIBILITIES.md` before integration work.

Latest UI checkpoint (2026-11-22): Nearby rooms has been redesigned and visually verified in the existing iPhone 17 Simulator. Enter via Rooms → Nearby (`/nearby`). The page uses actual OpenStreetMap tiles around UM6P Benguerir, a peach/orange/cream mesh overlay and centered radar animation. The fixed coordinates are a design anchor, not GPS. Keep the radar free of location labels and the copy minimal.

The search status and results share one taller white panel, with the shared orange PrimaryButton overlapping its lower edge. On focus, searching runs for five seconds before revealing up to three existing public, active fixture rooms. Rows open `/room/[id]`; Stop pauses and Scan nearby restarts. Timeout clears on blur/unmount/background; foreground starts a fresh five seconds. This is an explicit simulation, not BLE discovery or real proximity filtering.

Preserve: plain back arrow and 21px semibold centered title matching the existing secondary-page header; shared PrimaryButton orange gradient/15px radius with a white close/radio icon; no slogans, supporting paragraphs or location text on the radar. Keep OpenStreetMap attribution visible.

Files: `mobile/src/screens/nearby/NearbyScreen.tsx`, `mobile/src/screens/nearby/components/NearbyMap.tsx`, `mobile/src/app/nearby.tsx`, and the optional `icon` prop in `mobile/src/components/PrimaryButton.tsx`. Existing Rooms → Nearby navigation is in `RoomsScreen.tsx`. No new dependencies were needed. Latest lint/typecheck pass; final results layout verified by simulator screenshot. Full Stop/rescan/navigation interactions, Android/physical-device and small-screen/large-text QA remain outstanding. No new standalone/APK build, commit or push was performed for this redesign. No next UI task is selected.


BLE plan agreed 2026-11-22: use the user's Mac or a second phone as the broadcaster, with the real Android phone as receiver. No dedicated beacon purchase. Full staged plan is in BONUS_FRONTEND_PLAN, "Agreed broadcaster plan". Next action is a real Mac-to-Android test with one service UUID before app UI/library work. Separate broadcaster tool first; in-app host broadcasting is optional later. Plan only, no BLE implementation yet.

Android APK checkpoint (verified 2026-11-22): Expo CLI browser sign-in completed, linked existing project `@zerojsxs-team/cuevo` (`95ebb846-bc8b-40ff-b27c-0fb92dcafe0e`). Added `mobile/eas.json` preview APK profile and Android `com.cuevo.app`/orange adaptive icon. First cloud build finished successfully: https://expo.dev/accounts/zerojsxs-team/projects/cuevo/builds/4f0ee720-3ffc-4167-bf3d-a02b0eeb9602 . APK download and installation instructions are in LOCAL_DEVELOPMENT. Lint/typecheck pass. Android physical-device QA remains outstanding.

Latest runtime checkpoint: rebuilt and replaced standalone `com.cuevo.app` on the existing iPhone 17 Simulator, Release configuration. Selected `assets/brand/cuevo-app-icon-orange-v3.png` in app config. Build succeeded (0 errors, 4 warnings); current welcome/Home, installed icon and simulated Plus banner with Cuevo icon were visually verified. Standalone release includes current code and requires rebuilding for later changes. Expo Go remains separately installed. User is inspecting the app; do not reset the Simulator.

Notification permission checkpoint: the final introduction action now opens `/notification-permission`. Enable requests OS authorization, Later skips, and already allowed/denied permission skips to Home. `expo-notifications` installed/configured; typecheck/lint pass. Native device/dialog QA and push token/backend/delivery/tap wiring remain pending. No new native build or Simulator launch was performed for this change.

Latest checkpoint: offline playlist local save/read code is implemented; remaining work is deferred at the user's request. See **Offline playlists checkpoint** in `UI_PROGRESS.md` for files, limitations and the exact next tasks. Typecheck/lint pass; restart persistence still needs device testing. Keep future steps simple and explain file locations/code as we go.

The user requested documentation, a GitHub push and closing the Simulator app. This handoff records that checkpoint. No deployment or real payment was requested. Check running services before reopening preview; do not reset or recreate the simulator. No next feature is selected.

Workspace: `/Users/zero/Desktop/MusicRoom`, branch `main`. GitHub repository moved to `hassankarrach/Cuevo_A-React-Native-app`; the configured origin may still use the older SonicRoom URL, which GitHub redirects. Product name is Cuevo.

## Environment and checks

- Expo SDK 58, React Native 0.88, Expo Router, React 19. Use Node pinned in `mobile/.nvmrc` and npm.
- From mobile: `npm run lint`, `npm run typecheck`.
- Expo Go workflow: `npm run start -- --localhost --max-workers 2`; reuse an existing server on port 8081. `npm run ios` builds native code and is not the routine Expo Go launch command.
- Existing iPhone 17 / iOS 26.5: `158AB8CD-3044-4069-93A6-73D8C9CAC59A`. No new runtime/device needed.
- Latest checks pass for the card loading changes. Home skeletons and resolution were visually verified. Universal search and Rooms/Playlists loading code passes static checks; the simulator later showed Welcome, so account entry was not interrupted for further QA.

## Latest room and discovery design

- Room header uses the bundled orange Colorflow v2 video/poster, clipped to rounded corners. Native white text and controls sit above it; white play button has an orange icon. Progress and timestamps sit below controls, at the bottom of the card.
- Room name and private lock live in the top bar beside Back, replacing Host/Joined/Visitor. Host and genre metadata remain in the card.
- Queue rows use actual recording covers via catalog lookup or bundled sample covers; unknown recordings use a music-note fallback. Apple artwork provenance is saved beside added covers.
- Home/Rooms cards open the room from every part of the card, including song text. No nested song links remain on those cards. Song links elsewhere remain.
- Home intentionally lists private rooms and playlists regardless of membership. Private items display a lock; public items have no visibility icon. This is the user's discovery design decision, not backend authorization. It conflicts with the subject's private-event discovery restriction; see PROJECT_PLAN before mandatory acceptance. Do not silently change this design.
- Added private After Hours (Sara host, three participants, current user is a visitor) and private Inner Circle (Sara creator, current user is not a collaborator). Existing private Our Secret Mix belongs to self.
- Rooms filters: default order, most/fewest participants, genre A–Z; independent genre filtering. Sort is a dropdown; genres are horizontally swipeable pills. Reset preserves search. No role/ended filter choices. The filter button has a solid light gray border and matches the 52-point search height.

## Badges and Plus flow

- AccountBadges reads explicit verified/subscriptionActive data flags. Verified uses a brand-orange scalloped SVG seal and white check. Plus uses an orange PLUS badge with the warm-white generated sparkle. Shared across profile, Home, search and invitations.
- Home Plus promotion retains the original masked video and bright orange wash. Plus offer page remains 99 DH; do not invent a billing period, trial or renewal policy.
- Plus Continue routes to `/subscribe` if a usable saved method exists, otherwise `/payment?from=subscription`. Payment save returns to review through dismissTo, or returns to Settings when entered there.
- `/subscribe` shows the plan, selected payment summary, add/select card actions, total and Subscribe for 99 DH. Subscribe displays unavailability because there is no payment provider. No charge or entitlement change occurs.
- BillingProvider holds session-only masked summaries; seeded Visa ending 4242, expiry 12/29. Full card number, name and CVV remain only in form state and are cleared after save. No provider token or persistent card storage exists. Production needs tokenization and backend-owned entitlements.
- Settings Payment methods expands to show saved cards, expiry, selection, confirmed removal and add action. Expired cards are visible but cannot be selected. Empty state is implemented.
- Simulator verified saved-method and missing-method Continue paths, saved list/removal/empty state, synthetic card entry and save-to-review. Validation assertions cover checksum, expiry boundaries and masked summary output.

## Skeleton previews

- Shared neutral room, playlist and search-result skeletons, with one native opacity pulse per group. Reduce Motion keeps placeholders static; pulse stops in background/cleanup.
- Home: greeting and Plus banner render immediately because their data is local/static. Room and playlist sections show skeletons for two seconds on each Home focus. Switch away and back to replay.
- Universal search: empty input immediately shows the existing hint. Typing nonempty text shows matching result-row skeletons for two seconds after the latest change, then grouped results or the empty message. Field/close/clear stay usable. Old timers are cancelled.
- Rooms and Playlists pages: two-second skeleton delay on initial mount and every search input change, including clear. Shared `useSimulatedSearch` revisions prevent stale completion when returning to an earlier query. Static titles and controls remain visible. These are deliberate timing previews, not real requests.

## Existing app and remaining integration

Welcome/introduction/auth forms, shared catalog picker, song pages, local profile edits, room queue voting/lifecycle, invitations UI, playlist editing, notifications, Settings/Help and glass tab navigation remain. Read the previous handoff for detailed behavior and the documented iOS keyboard-language-switcher crash.

Real authentication/email/OAuth, backend authorization/persistence, music/audio, realtime collaboration, real invitations, billing, offline sync, IoT and responsive web remain unimplemented. Mock state resets on reload. Mandatory/bonus acceptance checklists remain unchecked.

## Reopen preview

Reopen Simulator only when requested for new work. Reuse the existing device and Metro if available; otherwise start the two-worker server and open Expo Go. No install, cache reset or runtime preparation is required just to resume UI work.


## GitHub issue drafts — 2026-11-26

User authorized opening the four pending backend issues. **No issues were created.** GitHub connector returned HTTP 403 “Resource not accessible by integration”; Brave is signed in, but native browser automation did not reliably apply form text. Do not claim publication or duplicate drafts on retry. Use Brave (the user’s default browser), check existing issues again, then submit the following drafts. Each link prefills a new GitHub issue for review/submission.

### Verification resend and resume

[Open prefilled GitHub issue](https://github.com/hassankarrach/Cuevo_A-React-Native-app/issues/new?title=Backend%3A+fix+verification+resend+and+resume+contract&body=Hello%2C+my+name+is+GPTato.+Resend+replaces+the+verification+challenge+but+returns+only+a+generic+confirmation%2C+while+verification+requires+the+replacement+challenge+ID.+Please+provide+a+privacy-safe+resend%2Fresume+flow+with+challenge+ID%2C+expiry+and+cooldown+metadata%2C+including+recovery+after+restart+or+a+lost+registration+response.+Keep+account-enumeration+protections+and+invalidation%2Frate+limits+intact%3B+document+and+test+the+contract.)

Hello, my name is GPTato. Resend replaces the verification challenge but returns only a generic confirmation, while verification requires the replacement challenge ID. Please provide a privacy-safe resend/resume flow with challenge ID, expiry and cooldown metadata, including recovery after restart or a lost registration response. Keep account-enumeration protections and invalidation/rate limits intact; document and test the contract.

### Development authentication rate limits

[Open prefilled GitHub issue](https://github.com/hassankarrach/Cuevo_A-React-Native-app/issues/new?title=Backend%3A+configurable+development+auth+rate+limits&body=Hello%2C+my+name+is+GPTato.+API+tests+and+the+iPhone+Simulator+share+an+IP+and+exhaust+the+registration+limit+of+five+attempts+per+hour%3B+Retry-After+reached+2979+seconds.+Please+add+documented+development%2Ftest+configuration+for+practical+integration+testing%2C+without+weakening+production+limits.+Keep+accurate+Retry-After+responses+and+test+environment+boundaries.)

Hello, my name is GPTato. API tests and the iPhone Simulator share an IP and exhaust the registration limit of five attempts per hour; Retry-After reached 2979 seconds. Please add documented development/test configuration for practical integration testing, without weakening production limits. Keep accurate Retry-After responses and test environment boundaries.

### Persistent development demo accounts

[Open prefilled GitHub issue](https://github.com/hassankarrach/Cuevo_A-React-Native-app/issues/new?title=Backend%3A+repeatable+development+demo-account+seed+command&body=Hello%2C+my+name+is+GPTato.+Please+add+an+explicit+development-only+seed+command+for+persistent+demo+accounts+with+documented+test+credentials+and+verification%2Fonboarding+states.+It+must+be+safe+to+rerun+without+duplicates%2C+deleting+data+or+overwriting+unrelated+accounts%2C+and+must+not+run+automatically+in+production.+Extend+to+coherent+rooms%2Fplaylists+when+their+backend+features+exist.+Document+and+test+the+command.)

Hello, my name is GPTato. Please add an explicit development-only seed command for persistent demo accounts with documented test credentials and verification/onboarding states. It must be safe to rerun without duplicates, deleting data or overwriting unrelated accounts, and must not run automatically in production. Extend to coherent rooms/playlists when their backend features exist. Document and test the command.

### Profile and avatar persistence

[Open prefilled GitHub issue](https://github.com/hassankarrach/Cuevo_A-React-Native-app/issues/new?title=Backend%3A+profile+and+avatar+persistence+with+onboarding+completion&body=Hello%2C+my+name+is+GPTato.+Login%2Fsession+restoration+are+connected%2C+but+profile+name%2Fphoto+inputs+are+local.+The+existing+profile-completed+endpoint+only+toggles+a+flag.+Please+provide+authenticated+profile+read%2Fupdate+and+avatar+upload%2Fdelete+endpoints%2C+documented+validation%2Fprivacy%2Fownership+rules%2C+and+an+onboarding+completion+contract+tied+to+saved+profile+data.+Keep+%2Fme+and+login%2Frefresh+onboarding+state+consistent%3B+include+migrations%2C+docs+and+focused+tests.+We+will+handle+client+integration.+Push+notifications+remain+on+standby.)

Hello, my name is GPTato. Login/session restoration are connected, but profile name/photo inputs are local. The existing profile-completed endpoint only toggles a flag. Please provide authenticated profile read/update and avatar upload/delete endpoints, documented validation/privacy/ownership rules, and an onboarding completion contract tied to saved profile data. Keep /me and login/refresh onboarding state consistent; include migrations, docs and focused tests. We will handle client integration. Push notifications remain on standby.
