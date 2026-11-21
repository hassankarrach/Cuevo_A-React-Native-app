# Session handoff — 2026-11-20

Read `mobile/AGENTS.md`, `LEARNING_NOTES.md` and `UI_PROGRESS.md` before changes. This handoff covers the session spanning November 19–20. Previous handoffs are preserved in `SESSION_HISTORY_2026-11-18.md`.

## Resume here

The user requested documentation of this session. No shutdown, commit, push or deployment was requested. Preserve substantial preexisting uncommitted changes and untracked assets; do not reset the workspace. Metro/Simulator were left running; check current state before starting duplicate processes.

Completed this session: create-room/create-playlist submissions; six-box join-code flow; two-column Rooms discovery with search/filter; shared queue ranking and lifecycle; playlist edit modal; clean Home account popup; dedicated Settings and Help pages; full-width Home popups with equal margins. See UI_PROGRESS for remaining work.

Next feature is not selected. Useful remaining UI work: room catalog picker, room privacy/invite/location-time voting-policy controls, profile/friendship integration and network states. Real authentication, backend, audio, realtime synchronization and bonuses remain absent. Second/third introduction artwork remains intentionally deferred.

## Run and test

- Workspace `/Users/zero/Desktop/MusicRoom`; Expo SDK 58 / React Native 0.88 / React 19 / Expo Router.
- Use Node from `mobile/.nvmrc` (26.13.1). `source ~/.nvm/nvm.sh`, then `cd mobile` and `nvm use`.
- Reuse Metro on port 8081 if running; otherwise `npm run start -- --localhost --max-workers 2` inside mobile.
- Use existing iPhone 17, iOS 26.5, UUID `158AB8CD-3044-4069-93A6-73D8C9CAC59A`. Open `exp://127.0.0.1:8081` in Expo Go. No unnecessary runtime preparation, device creation or restarts.
- `npm run ios` performs a native build; it is not the normal Expo Go launch workflow.
- Checks from root: `npm --prefix mobile run typecheck` and `npm --prefix mobile run lint`.
- Signup example: `test@example.com` / `Test1234`, verification/reset code `123456`. These are UI inputs, not actual credentials. Login/Google sign-in remain disabled.

## Product decisions to preserve

- Orange `#FF4D24`, warm white, peach/coral, rounded surfaces, filled icons, glass navigation/toasts.
- Do not put Preview/Mock/session-only/development-status labels in product copy. State integration limits in docs/reports.
- Home banner uses existing masked silent video and bright orange/peach wash; no brown overlay. Intro artwork remains on standby.
- Account menu is four plain icon-and-text rows only: Profile, Settings, Help & about, Log out. No icon backgrounds, duplicate avatar/name/title or Rooms/Playlists shortcuts.
- Both Home popups span window width minus 40 points: equal 20-point margins. Preserve spring entrance, Reduce Motion, backdrop/Back dismissal and notification-style surfaces.
- Settings and Help are dedicated pages, not popup subsections. No duplicate playlist management in Settings.

## Creation and joining

- Create room/playlist use existing + popups; no extra creation pages. Required names are trimmed, length-limited and show inline validation. Repeated submissions guarded. Success opens existing detail route and updates shared lists.
- New rooms: public, self as host/only member, empty queue. New playlists: private, self creator/collaborator, empty. **Playlist creation still differs from the subject's public/everyone-edit default; reconcile deliberately before mandatory acceptance.**
- Join with code uses six individual uppercase-normalized inputs, advance/backspace/full-code paste. `AAAAAA` (lowercase accepted) joins On Repeat; other/incomplete codes show modal error toast. Ended target rooms are rejected. Join success toast waits 500ms for native-modal dismissal.

## Rooms and queue

- Rooms tab reuses Home cards, two per row, vertical scrolling. Includes created rooms. Search matches room name/song/artist, case-insensitive; role filters include All, Hosted, Joined, Available and Ended, with reset and no-result state.
- `MockRoomsContext` owns membership plus each room's playback/queue, surviving navigation until reload. `state/roomQueue.ts` contains the pure rules; QueueVote is controlled by shared state.
- One changeable/withdrawable up/down vote per current user per queued song; seeded aggregate scores are illustrative. Waiting songs rank by total score, earlier suggestion order breaks ties; current song pinned. No real multi-user aggregation.
- Hosts can remove songs (confirmation), start/pause, skip including final song, and End room (confirmation). No host manual reorder controls.
- Local one-second clock simulates track completion. Empty queue stays open; suggestions wait for host manual start. This is not audio playback or provider synchronization.
- Ended rooms stay visible; playback stops, join/suggest/vote/remove/editing interactions close. Ended badge/filter included. Queue/participants remain inspectable. Activity is still screen-local and is not a complete persistent event history.
- Suggest remains the native alert offering One More Time; the 40-song catalog is not wired into room suggestions. Room artwork still uses sample record graphics.
- Existing room cases: Kitchen Disco=self host (7), Late Nights=Sara host/self member (6), On Repeat=Amine host/self visitor initially (5).

## Playlist editing

- Existing 40-song catalog search/add/remove/reorder remains. Shared provider updates Home/list/detail for the session.
- Owners see Edit on detail. Modal drafts name (60), description (300), public/private visibility and song-edit policy. Cancel discards; save validates and updates shared state, then shows toast.
- Policies: only owner, invited collaborators, everyone (public only). Private selection converts everyone to collaborators. Provider guards metadata ownership and song changes; UI labels/buttons use the same helper.
- Real invitations, backend access filtering, realtime/conflict handling and persistence remain absent.

## Account popup, Settings and Help

- Avatar opens account popup rather than navigating directly. Profile item opens own profile. Settings `/settings` and Help `/help` have dedicated safe-area/keyboard-aware pages using UtilityPage.
- Settings: Edit profile link; Change password current/new/confirm validation and local confirmation; Linked accounts accurately shows Google/Facebook Not connected; profile bio/location/genres visibility choices (Everyone/Friends/Only you); validated HTTP(S) server-address form.
- SettingsProvider retains privacy/address for session only. Privacy is not enforced against other viewers, no OAuth linking exists, no API client consumes the address, and password form does not verify/change real credentials. No passwords stored.
- These additional settings follow subject V.1 profile/privacy/social linking and V.5 configurable backend address; no playlist-management duplication.
- Log out dismisses navigation history and returns to Welcome. No real auth token exists and shared local data is not reset.
- Help describes room join/vote/lifecycle, collaboration and account actions. Notification accept/decline/invitations remain local previews.

## Keyboard crash investigation

- User report and Simulator logs confirm Expo Go native SIGABRT from `NSRangeException`: `index 3 beyond bounds [0 .. 2]` inside `UIInputSwitcherView localizedTitleForItemAtIndex:` while building the keyboard-language switcher menu.
- This establishes the immediate UIKit failure, not a password-validation/JS error. Exact OS root cause and permanent fix are not proven. Multiple English/French/Arabic/Emoji keyboard modes were observed; no settings were changed.
- Temporary workaround: choose language before focusing the password field; avoid language switching while it is focused.
- Corrected separate AuthField metadata: current password uses `password`, new/confirm use `newPassword`; iOS `textContentType` is no longer combined with `autoComplete`. This is not a confirmed fix for the UIKit crash. Expo Go was reopened without resetting the simulator.

## Validation and limitations

- Latest code typecheck and lint passed, including final popup-width change.
- Pure queue checks passed: ranking/pinning, repeated/switch/withdraw votes, stable ties, role guards, final-song completion, empty-queue restart, removal, ended-state guards. No committed test harness was added.
- Simulator verified created room/playlist on Home/detail; six-box entry and invalid toast; lowercase AAAAAA joining/count update; two-column grid visually; host/participant controls and playlist editor/menu accessibility states.
- Some later UI interaction was interrupted by concurrent user activity; queue screenshot capture timed out. Do not claim complete visual/end-to-end verification of Settings, Help, logout, final widths or password inputs. Full keyboard/accessibility/small-screen/Android/physical-device QA remains.
- Mandatory subject acceptance remains unchecked. No real auth, backend, music audio, multi-client realtime or bonuses completed.
