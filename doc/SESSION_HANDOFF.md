# Session handoff — 2026-11-21

Read `mobile/AGENTS.md`, `LEARNING_NOTES.md` and `UI_PROGRESS.md` first. Earlier detailed context is preserved in `SESSION_HISTORY_2026-11-20_LATE.md` and the other dated histories.

## Resume here

The user requested documentation, a GitHub push and closing the Simulator app. This handoff records that checkpoint. No deployment or real payment was requested. Check running services before reopening preview; do not reset or recreate the simulator. No next feature is selected.

Workspace: `/Users/zero/Desktop/MusicRoom`. Remote: `git@github.com:hassankarrach/SonicRoom_A-React-Native-app.git`, branch `main`. Repository name retains earlier branding; product name is Cuevo.

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
