# Session handoff — 2026-11-17

## Current focus: animated welcome page

Latest: approved ribbon exported to `mobile/assets/animations/cuevo-welcome.json`, integrated with `lottie-react-native` in `App.tsx`, and visually verified in existing Expo Go simulator. Dark welcome screen has animation in top 60%, empty bottom 40%. Typecheck/lint passed. User wants to discuss bottom content next; do not add it yet. Earlier blank-screen notes below describe prior state.

- App branding is Cuevo; primary color is `#FF4D24`. See `BRAND.md` and `LEARNING_NOTES.md`.
- `App.tsx` renders a blank white screen. The welcome page is being designed; it is not implemented yet.
- The user wants a creative animated welcome page, potentially with cartoon artwork, moving vector lines, or an animated background. They prefer designing a Lottie animation from scratch in Lottie Creator.
- Lottie Creator tools are now available. Created first draft in durable document `cuevo-welcome-record`, revision 1: a smiling orange vinyl record, floating notes, pulsing curved sound lines, and a soft shadow. Four-second loop, 480×480 at 30 fps. Filmstrip visually checked and playable preview shown; awaiting user feedback. No export or mobile integration yet.
- Next: agree a small animation concept, create and review it in Lottie, then integrate it into the welcome page incrementally. Layout, copy, buttons, and final motion are not approved. Do not implement authentication or the whole app flow at once.
- Installed CocoaPods 1.17.0 and built/installed a Release app on the existing iPhone 17. Native bundle identifier: `com.cuevo.app`.
- Verified the orange logo on the white native splash via a simulator screenshot, then the blank React screen. The splash is brief by design.
- Build command: `npx expo run:ios --configuration Release --device 158AB8CD-3044-4069-93A6-73D8C9CAC59A --no-bundler` using Node 26.13.1.
- First build failed because FinderInfo metadata was attached to the generated ExpoModulesJSI framework. Removed `com.apple.FinderInfo` from `mobile/node_modules/expo-modules-jsi/apple/.DerivedData` and rebuilt successfully.
- Release app runs without Metro and requires rebuilding for edits. For Expo Go with Fast Refresh, use `npx expo start --localhost --max-workers 2`; prebuild changed the npm `ios`/`android` scripts to native build commands.
- The native launcher icon still uses the starter asset; splash uses `assets/logo.png`.

## Start here

We are now working on **Cuevo’s welcome page**, the first React Native screen after the native splash. Follow the learning workflow: small changes, explain the React Native concepts using the user’s React web background, and update `LEARNING_NOTES.md`. The immediate task is animation design, followed by incremental welcome-page implementation.

Read `PROJECT_PLAN.md` for requirements, `TEAM_RESPONSIBILITIES.md` for ownership, `LOCAL_DEVELOPMENT.md` for the working workflow, and `mobile/AGENTS.md` before changing mobile code.

## Current product state

- React Native / Expo / TypeScript foundation. `mobile/App.tsx` renders a blank white screen.
- Cuevo logo is saved in `mobile/assets/logo.png`; selected primary color is `#FF4D24` in `mobile/theme/colors.ts`.
- Native splash is implemented and verified; welcome-page animation and UI are not implemented.
- No authentication, backend, music-provider integration, collaborative features, or bonuses are implemented.
- Planned primary services: Music Track Vote and Music Playlist Editor. The user leads mobile UI, the responsive web bonus, and the bounded profiles/friendships backend contribution.
- Expo Router is required by `mobile/AGENTS.md` for future navigation but is not installed or configured in the current starter. Introduce it deliberately when implementing navigation; do not assume routes already exist.

## Working development setup

- Project: `/Users/zero/Desktop/MusicRoom`; mobile package: `mobile/`.
- MacBook Air M1 with 8 GB RAM; Xcode 26.6 and iOS 26.5 runtime installed.
- Working simulator: **iPhone 17**, UUID `158AB8CD-3044-4069-93A6-73D8C9CAC59A`.
- Both Expo Go 58.0.7 and a standalone Cuevo Release build are installed. The latest session returned to Expo Go for everyday UI development and visually verified the blank screen.
- Node v26.13.1 via nvm; Expo SDK 58; React Native 0.88.1; npm lockfile is authoritative.

For a new terminal, if the development server is not already running:

```bash
cd /Users/zero/Desktop/MusicRoom/mobile
source "$HOME/.nvm/nvm.sh"
nvm use
npx expo start --go --localhost --max-workers 2
```

Reuse a live Metro server if one exists. Last verified server used port 8081 and was left running, but process state must be checked in a new session. Edit `mobile/App.tsx` and save for Fast Refresh. Use one simulator and two bundling workers on this Mac. Press I in the Expo terminal to open Expo Go. Native iOS files have already been generated; ordinary JSX/style edits do not require a native rebuild.

## Troubleshooting lessons and preferences

- Runtime shared-cache preparation completed successfully using `xcrun simctl runtime dyld_shared_cache update --all`.
- `simctl bootstatus` reported migration failure even when the iPhone later showed its home screen and ran the app. Verify actual usability before treating this warning as a blocker.
- Do not stop or reset a working device, create more devices, repeat installation, or recommend another reboot without concrete evidence that it is necessary.
- The user wants authorized next actions carried out, not repeated status-only replies or requests to say “check again.” Continue to a verified result where possible.
- The blue gear is Expo Go's developer overlay; its **Tools button** switch can hide it. It is not production UI.
- The installed standalone Cuevo app is a Release build: no developer menu or Fast Refresh. Use Expo Go for current UI work. A development build with custom native dependencies has not been created.
- If the simulator shows Contacts and other default apps, it is on the iPhone home screen. Reopen Expo Go and the project; do not confuse that with Cuevo’s blank React screen. Cmd+D opens the developer menu when Expo Go has focus.
- Broad cache cleanup and removal of Claude's VM bundle and Docker data were explicitly requested and completed. Do not perform more unrelated cleanup. Runtime-cache preparation is separate from that cleanup.

## Verification and open work

- Mac dependency installation, TypeScript, and lint passed.
- Expo Go successfully loaded the current blank white React screen on the working iPhone.
- Release build succeeded with zero errors and four warnings; the native splash was visually captured during launch.
- npm reported eight moderate advisories during setup. No forced upgrades were applied.
- Release simulator build is verified. A custom development build and physical-device test remain unverified.
- Next: design the welcome-page Lottie animation from scratch, approve its visual direction, then add the welcome UI in small explained steps. Introduce routing deliberately when navigation is needed. Keep mock data separate from future backend integration.

## Welcome animation direction update

- User wants an animated looping line matching their supplied gradient ribbon reference, replacing the record concept.
- Created durable Lottie document `cuevo-welcome-ribbon`, revision 1: 480×720, 30 fps, six-second draw-on/erase loop, subtle float and moving purple/blue/mint/yellow gradient on near-black. Filmstrip checked. No mobile integration yet.

- Ribbon updated to revision 3: Cuevo `#FF4D24` gradient with burnt orange and peach, plus four gently floating music notes. Saved new version to existing workspace file: https://app.lottiefiles.com/animation/7ab916f5-7116-4700-8c8e-721680a0307e . Filmstrip checked and Lottie export/save succeeded. Gradient path stays at composition level for export compatibility; group float was removed in revision 2, while draw-on/erase and gradient motion remain.

- Welcome layout correction: restored white background and dark status bar. Lottie now fills screen width with its original 480/720 aspect ratio, aligned to the top; hero clips excess canvas vertically instead of shrinking artwork to fit height. Lower section remains empty. Typecheck and lint passed.

## Native welcome background

- User explicitly prefers native code for gradient backgrounds, not generated photos. Implemented three full-screen native `View` radial gradients using RN 0.88 `backgroundImage`: peach at upper left, coral at right, lavender at lower right. Broad transparent fades give a soft blurred-cloud appearance without an image asset or blur filter.
- Background is absolutely positioned behind safe-area content and ignores touches; Lottie remains sharp and full width above it. `StyleSheet.absoluteFill` fills the parent (the older `absoluteFillObject` API is unavailable here). No added background dependency.
- Verified colors visually in existing iPhone 17 Expo Go simulator; typecheck and lint passed. Bottom remains empty pending discussion.

## App organization

- `mobile/App.tsx` now only sets up `SafeAreaProvider` and renders `WelcomeScreen`.
- Welcome layout, Lottie, and screen-specific styles live in `mobile/src/screens/welcome/WelcomeScreen.tsx`.
- The decorative gradient is a screen-local component: `mobile/src/screens/welcome/components/WelcomeBackground.tsx`.
- Shared color tokens moved to `mobile/src/theme/colors.ts`; bundled assets stay in `mobile/assets/`.
- This is component composition, like React web: app setup at the root, page layout in the screen, a focused child for its background. Keep styles beside the component they belong to.
- No navigation exists yet; when introducing navigation, use Expo Router route entries in `src/app/` with screen implementation outside the route directory. Bottom content still awaits discussion.

## Illustration edge blur trial

- Added screen-local `IllustrationEdgeBlur.tsx` after the Lottie. Native `expo-blur` overlays cover the outer 12% per side with progressively decreasing intensity; center remains clear. This is an iOS-only visual trial. iOS blur samples background too and adds a light tint; it is not a filter applied exclusively to Lottie pixels. Android currently renders no overlay.
- Masked blur attempt was discarded because it faded rather than visibly blurred the artwork; masked-view dependency removed. Narrow native blur bands do blur the moving ribbon but can have subtle band boundaries; user review pending. Original Lottie JSON unchanged.

- Edge-blur trial rejected by user as pixelated. Removed segmented blur overlay, its component, and expo-blur dependency; restored crisp Lottie. Do not reintroduce banded blur or silently substitute a fade. Smooth artwork-only blur on iOS needs further renderer/native implementation research; it is not implemented.

- User clarified they preferred the FIRST masked edge-blur preview. Restored `IllustrationEdgeBlur.tsx` with a single BlurView at intensity 35 and a continuous alpha gradient mask (outer edges opaque, center transparent at 17–83%). Restored expo-blur and masked-view dependencies. No segmented strips. Added a local documented-props type adapter for masked-view legacy declaration incompatibility with RN 0.88. This recreates the first softer/faded preview, not a verified artwork-only Gaussian filter; iOS-only.

## Welcome content preview

- Added `WelcomeContent.tsx`: centered orange symbol + Cuevo wordmark, headline “Your music. Better together.”, shared-playlist/voting subtitle, orange Get started button, and Log in text action. User authorized trying the proposed layout; visual approval pending.
- `Image` loads the existing local PNG; `Text` displays native text (unlike web, bare text must be inside Text). `Pressable` supplies button semantics. Account actions are explicitly disabled previews until account routes exist; no authentication or navigation added.
- Content sizes naturally, with remaining height given to the illustration. Shifted Lottie up 24 logical pixels to keep its bottom note above the logo. Added shared text colors. Existing background and first masked edge blur preserved. Typecheck/lint passed and layout inspected in iPhone simulator.

- Moved logo/wordmark into `WelcomeBrand.tsx`, rendered at the very top inside the safe area, above the illustration. Removed brand from lower content. User clarified the second request (transparent bottom/blur interruption) was already fixed, so no background or blur changes were made. Typecheck/lint passed; top placement visually checked.

- Main action now lives in `WelcomePrimaryButton.tsx`: pill shape, orange native linear gradient, yellow radial glow clipped along its bottom edge, subtle warm outer shadow, fine highlight border, and a native View-drawn arrow. Matches supplied reference while retaining full-width layout. No bitmap or extra dependency. Button remains a disabled layout preview until navigation is implemented. Native gradient styles work like CSS gradients; the rounded container clips the light layer. Typecheck/lint passed and simulator appearance verified.

## Local font integration

- User supplied Lufga and Clash Grotesk ZIPs and selected Lufga as the main font. Native OTF families are organized in `mobile/assets/fonts/lufga/` and `clash-grotesk/`. Original license/readme files retained; ZIPs, URL shortcuts, and duplicate web/variable formats removed after verifying extracted bytes. Lufga archive included no license; provenance noted in assets/fonts/README.md.
- `src/theme/fonts.ts` centralizes font aliases and the five loaded faces. Lufga Regular/SemiBold styles the welcome headline, body, buttons, and login link; Clash Grotesk Semibold styles the Cuevo wordmark. Unloaded original OTF weights remain available for later use.
- `App.tsx` uses `expo-font` `useFonts` with bundled local files, holding the native splash until fonts load. Unlike web, font family is applied explicitly to native Text styles; use named faces rather than synthetic fontWeight. Runtime loading works in Expo Go without rebuilding.
- Kept the user's 15px main-button radius. Typecheck/lint passed; visually verified font loading and text fit in the existing iPhone simulator.

## Login modal shell

- User approved welcome appearance and requested next an empty white container sliding up on Log in click.
- Added `mobile/src/screens/login/LoginModal.tsx`: native React Native Modal with `animationType="slide"`, transparent presentation, dim backdrop, rounded white sheet at 65% screen height, close button, backdrop dismiss handler, Android onRequestClose handler, and bottom safe-area padding. No login form/auth logic yet.
- WelcomeScreen owns `loginVisible` state; WelcomeContent receives an `onLoginPress` callback, like passing an onClick callback in React web. Log in is now enabled; Get started remains a disabled preview. This is a local UI overlay, not navigation; future navigation must use Expo Router.
- Typecheck/lint passed. Clicked Log in through simulator UI and visually verified the white modal opened. Dismissal UI verification was interrupted by a computer-use screen-capture error; handlers are implemented but dismissal not independently confirmed.

- Login modal revision: removed dim backdrop (overlay now transparent) and increased white sheet height from 65% to 78% to open higher. Retained slide animation and dismissal controls.

- Raised login sheet again: replaced percentage height with a flex sheet whose top margin is `insets.top + 56 + 12`, placing it 12 logical pixels below the 56px logo row. Transparent backdrop retained.

- Login sheet dismissal control changed from a right-side X to a clean left arrow at the upper left, with a 44px press target and accessibility label “Back to welcome”. Same close handler.

- Added centered “Log in” header at the top of the white modal using Lufga SemiBold, with back arrow on the left and an equal-width right spacer to keep the title centered.

- Added static ribbon-only decoration to login modal bottom-right, extending past right/bottom edges and clipped by sheet. `LoginDecoration.tsx` uses a transparent 3× PNG at 22% opacity; no music notes or playback. PNG and editable SVG in `mobile/assets/decorations/` are derived directly from the approved Lottie path and gradient. Percentage-width wrapper sets aspect ratio; Image explicitly fills wrapper to avoid intrinsic bitmap dimensions affecting layout. Verified bottom-right placement in simulator.

- Login decoration revised to neutral gray, with native Image `blurRadius={12}` on an upper layer, smoothly blended into a sharp lower layer using complementary gradient masks. Uses `login-ribbon-gray.png`, derived from the original editable ribbon vector, because native iOS image blur ignored tintColor on the orange source. Overall opacity 30%. Smooth blur affects only static artwork; white background and welcome Lottie remain unchanged. Verified visually; typecheck/lint passed.

## Login input styling

- Added `LoginFields.tsx` with controlled email/password TextInputs, gray user/lock icons, show/hide password control, email keyboard/autofill hints, and Next-to-password focus. Values stay local; no auth submission or persistence.
- Reference style: cool gray surfaces, rounded corners, subtle soft shadows, and partial white border highlights from native gradient layers. Focus strengthens gray border underneath the highlight; Lufga Regular text preserved. Added Expo-compatible @expo/vector-icons for consistent native icons.
- TextInput uses `onChangeText` rather than DOM onChange events; `secureTextEntry` hides the password; useRef allows Next to focus the second field. Native styles draw the gradient border without a bitmap.
- Typecheck/lint passed; inspected fields in the running simulator. Password visibility interaction not exercised because user was actively entering text. No additional login actions added.

## Complete login modal UI

- Added LoginForm: Welcome back copy, official Google sign-in artwork, “or log in with email” divider, existing soft gray email/password fields, Forgot password, glowing orange Log in, and Create an account link. No Remember me checkbox because session behavior is not defined yet.
- Extracted shared orange `src/components/PrimaryButton.tsx`; welcome wrapper preserves Get started/arrow and user-selected 15px radius, login uses same visual treatment.
- Modal body scrolls inside KeyboardAvoidingView, keeping fixed header and decoration. Added native keyboard avoidance; actual software-keyboard behavior still needs checking (simulator click did not show keyboard).
- Google/login/recovery/signup remain disabled UI previews pending services/routes, explicitly stated to user. No fake auth success, credentials transmission, or account creation. Local input and password visibility work as before.
- Official Google button source recorded in `assets/brand/README.md`. Typecheck/lint passed; full modal visually verified in simulator.

- Login form revision: removed Welcome back/subtitle; email fields now lead. Google sign-in moved below orange login and a simple “or” divider; now a full-width native white button with 15px radius matching the main button. Original Google G used without tint or distortion. Inputs keep their approved 22px soft corners. Removed superseded pill-button bitmap. Simulator appearance checked; typecheck/lint passed.

## Shared auth sheet / signup preview

- Replaced LoginModal with `src/screens/auth/AuthModal.tsx`, shared by login, signup, and profile content. Welcome Get started and cross-links now work; profile back returns to signup with fields retained.
- Signup Continue is a local UI preview only. Profile display-name/initial avatar implemented; Explore Cuevo remains disabled. No backend, account creation, photo upload, or home screen added. Agreed eventual flow: signup → profile → explore app; room creation/joining is optional later.
- Typecheck and lint passed. Interactive signup/profile simulator review still needed.

- Replaced step text with a fixed progress line under the auth header (signup 0%, profile 50%). Added Expo-compatible expo-image-picker for local optional avatar previews, image-only square cropping, change/remove actions, cancellation/error handling. No upload or persistent app storage. Interactive picker verification remains pending; check in Expo Go via Get started → Continue → Add a photo.

- Default profile image now uses generated `assets/avatars/cuevo-mascot.png`: cream 3D mascot, orange headphones, solid periwinkle. Local selected photos override it; Remove photo restores it. Typecheck/lint passed.

## Intro background preview

- Explore Cuevo now opens `/introduction` through newly installed Expo Router. Font/splash setup moved to `src/app/_layout.tsx`; `App.tsx` is a compatibility re-export; `index.ts` loads router entry. Added scheme and router config plugin. Existing welcome and auth preserved.
- Intro is currently a blank orange canvas with a soft bottom yellow glow, subtle upper rays, light status icons, and back button. No slideshow/collage/Lottie yet, per incremental request. Background visually verified in the existing iPhone 17 simulator; typecheck/lint passed and Metro returned HTTP 200 for iOS bundle.
- Expo restarted with cleared cache under Node 26.13.1; server remains running. Intro route can be opened by Explore Cuevo or exp://127.0.0.1:8081/--/introduction.

- First intro slide integrated with approved `assets/mascot/cuevo-ink-cat-concept-v1.png`, native headline/support copy, top progress (1/4) and bottom cream Next action. Existing orange/yellow rays background preserved. Next remains disabled pending slide two; no other slide artwork generated/integrated. Typecheck/lint passed and layout visually checked in iPhone 17 Expo Go.

- Intro revised to full-height right-overflowing collage using `cuevo-ink-cat-tall-v2.png`: white dynamically posed cat, no purple, no paper card. Text now runs down the left as separate cream/dark headline blocks with narrow supporting copy. Fixed progress and bottom Next preserved. Source prompts saved alongside PNG; generated via built-in imagegen with cleanup pass. Visually checked on iPhone 17; typecheck/lint passed. Next remains disabled pending subsequent slides.

- User put intro design on standby. Resume context and exact asset/screen paths saved in `doc/INTRO_DESIGN_STANDBY.md`. Current UI left intact. Next discussion: Home layout for new and returning users.

- Added Home header preview at `/home` matching supplied reference: rounded avatar, Hello/name/emoji left, only notifications outline icon right. `HomeHeader` accepts data/callback props; HomeScreen uses preview defaults (Music lover + existing avatar). Bell disabled until notification flow exists. No Home body or auth wiring yet; intro preserved on standby. Visually checked on iPhone 17; typecheck/lint passed.

- Home now includes headline + search box via HomeSearch. Tapping opens `/search` with focused editable query, clear control, and back navigation; backend/results/filter UI remains unimplemented. Home body still otherwise empty. Visually reviewed and verified search open/back; typecheck/lint passed.

- User rejected separate search page behavior. Removed search route/screen and navigation; kept Home heading/search appearance as a static placeholder. Wait for user's interaction specification before adding search behavior.

- Implemented fixed rounded charcoal bottom tab bar with Home / Rooms / Playlists, icon-only cream/orange styling inspired by reference. Used expo-router/ui headless Tabs, TabSlot, TabList/TabTrigger under `(main)` route group. Home route moved into group with URL unchanged; new Rooms/Playlists title-only shells. Intro remains separate/on standby. Typecheck/lint passed and Home appearance visually checked. Computer-use connection closed during verification; screenshot fallback confirmed bar layout.

- Latest tab bar styling replaces dark pill with white and subtle warm border/shadow; height 60 (was 84), icons 26 (was 32), margins 40. Inactive icons muted, selected orange. User requested lighter and smaller.

- Added HomeRooms below search: Rooms + right-aligned View all linking to /rooms, three blank rounded white card previews with subtle borders/shadow. Home body scrolls; header and tabs fixed. Cards have no content/interactions yet. Typecheck/lint and visual simulator check passed.

- HomeRooms now renders sample Kitchen Disco / Late Nights / On Repeat data, rounded inset gradient artwork banners, room titles, current track/artist and listener counts. Header marked Preview; no actual live data or card navigation. Typecheck/lint and visual simulator check passed.

- Latest Rooms preview uses 164×164 square cards, horizontal scrolling, partial third card at screen right. Banner/text compressed to retain square silhouette. Verified typecheck/lint and simulator appearance.

- Room card titles now centered on gradient banners instead of music icons; duplicate body titles removed. Typecheck/lint passed.

- Room footer now has three overlapping avatar placeholders + remainder badge and a pulsing red broadcast live icon. RoomListeners accepts avatar image sources for later backend wiring. LiveIndicator uses native Animated with reduced-motion support and focus cleanup. Counts remain sample data; cards keep square shape. Typecheck/lint passed; visual screenshot checked.

- HomePlaylists now follows HomeRooms: section heading + View all and three blank 90px-high rectangular placeholders stacked vertically. User will provide styles later; no playlist content/card interaction yet. Typecheck/lint passed.

- Added native rotating vinyl records left of room song/artist. Center label follows sample genre (disco orange / R&B violet / pop gold); grooves/sheen/spindle drawn in Views. Native rotation loop with focus cleanup/reduced-motion support. Room cards remain square; typecheck/lint and visual check passed.

- Filled Home playlist row previews: square gradient covers left; title, creator + track count, collaborator avatars/remainder, public/private labels right. Sample playlists Late Night Drives / Weekend Together / Our Secret Mix. No real backend or detail routes; rows not tappable. Typecheck/lint and visual check passed.

- New editable `/profile` route from Home avatar, matching supplied card reference with orange cover, overlapping circular avatar, rounded white body and input spacing. Name/username/bio/location/preferences + photo editing, required-name validation. Save updates session-only ProfileContext shared with HomeHeader and returns; no backend or durable save. Signup ProfileForm not wired to this context yet. Typecheck/lint passed. Inspected form fields and save placement in simulator; user actively changed screen during further QA, so avoided interfering with their edits.

- Profile revision: full-width white card, rounded-square avatar instead of circular. Typecheck/lint passed.

- Profile header revised to a fixed fading gradient overlay for scrolling. Removed extra bottom padding from content/card; retained system safe area. Typecheck/lint passed.

- Profile white container now extends to the very bottom: bottom safe-area inset removed, bottom corners square, content/card flexGrow enabled. Explicit user requested bottom zero. Typecheck/lint passed.

- Profile white container bottom now fades to transparent over 24px via separate background layer. Button remains fully opaque; layout padding retained. Typecheck/lint passed.

- Profile identity row revised: removed Change photo text, name/bio beside avatar. Avatar/camera still opens picker. Typecheck/lint passed.

- Navigation bottom area changed from reserved solid block to absolute overlay. Content scrolls behind continuously masked blur + upward transparent warm fade; pill translucent white. New TabBarBackdrop; BlurTargetView around TabSlot. Home bottom scroll padding accounts for bar and safe area so last item remains accessible. Preserved user-adjusted bar dimensions. Typecheck/lint and iPhone visual check passed; Android not device-tested.

- Latest nav now matches white glass reference: rounded translucent pill left, outlined tab icons with active label/capsule, separate orange plus right. Native blur/white border and prior upward backdrop fade retained. Plus opens three-choice CreateMenu and local room/playlist-name or join-code preview forms; submit disabled until backend wiring. Typecheck/lint passed; bar and open playlist sheet visually inspected. User was actively using simulator during review.

- Plus menu revised from bottom sheet to staggered floating dark glass pills with glossy warm icons and glass close circle. Forms retained. Latest backdrop is curved elliptical orange-to-transparent with peach glow and masked light blur (replaces original dark diagonal linear fade). Typecheck/lint passed.

- Latest create/join/playlist form presentation is centered popup with fade animation, 28px full rounding and capped width, rather than slide-up sheet. Floating action menu stays as-is. Typecheck/lint passed.

- Plus-menu items now enter one by one with native fade/upward/scale animation: 90ms stagger, 280ms duration. Reduced motion supported; cleanup on unmount. Current menu pills remain white, backdrop curved orange/peach (white backdrop trial reverted). Typecheck/lint passed.

- Home room cards now open blank `/room/[id]` pages using stable sample IDs. Added RoomScreen with only back control and warm white surface, outside bottom tabs. No room content/backend behavior yet. Typecheck/lint passed.

- Blank room now has a top horizontal swipeable participant-avatar row alongside back arrow. Individual 50px circles; current profile photo + seven sample initials. Remaining room surface blank. Typecheck/lint passed.

## Agreed playback design

- User selected host-only audio playback. Host phone (optionally connected to a speaker) plays room music. Joining participants suggest/vote and view shared state without audio starting locally. Remote synchronized listening excluded from initial scope.
- Decision and unresolved integration/session rules saved in `doc/PLAYBACK_DECISION.md`; PROJECT_PLAN updated. This is a product choice consistent with the party/event scenario, not an explicit subject restriction.

- Room page updated with empty rounded charcoal header card near top and swipeable participants directly below it, rather than beside back arrow. Rest empty. Typecheck/lint passed.

- RoomHeaderCard now draws a custom SVG outline: flat upper-left edge curves downward into a lowered upper-right shelf. Empty charcoal shape retained; participants below. Expo-compatible react-native-svg added. Typecheck/lint and visual check passed.

- Created standalone Beat Buddy Lottie speaker draft for header cutout: `cuevo-room-beat-buddy` revision 1, saved to LottieFiles. Editor/preview and implementation constraints recorded in `doc/BEAT_BUDDY_DRAFT.md`. Transparent four-second loop reviewed via filmstrip; not integrated. dotLottie state machines exist, but this draft is timeline-only; existing lottie-react-native pause/resume can provide desired host-state behavior.

- User rejected Beat Buddy as too childlike and supplied a graphic turntable reference. Created new standalone Creator document `cuevo-room-turntable` revision 1: orange/cream deck, detailed charcoal spinning vinyl, stationary tonearm, pitch fader. Four-second transparent loop, filmstrip checked, not integrated. Previous speaker retained as alternate. Playback pause/resume intent unchanged.

- Room header now has Cuevo orange/peach SVG gradient, turntable Lottie overlapping top-right, and Participants heading above avatars. Turntable is autoplay-loop visual preview, not audio or host-state controlled yet. Updated TURNTABLE_ANIMATION note. Typecheck/lint and visual check passed.

- Room header now renders route-specific sample room name, host, genres and participant count on the left, with a Live/Public badge and existing animated turntable on the right. RoomHeaderDetails typed props separate card presentation from route sample data. These remain UI previews; no live playback or membership backend. Typecheck/lint passed; visually verified in iPhone simulator.

- Added RoomQueue below Participants with five sample song cards: square vinyl placeholder covers, song/artist, contributor and duration. First has warm peach/orange highlight and Now Playing label; remaining four have queue positions. Room body now scrolls vertically with back control fixed. Visual preview only, no playback actions. Typecheck/lint passed and simulator layout checked.

- Room page reuses Home TabBarBackdrop for a full-width bottom gradient/masked blur, backed by BlurTargetView. Bottom safe area now belongs to scrolling content with extra clearance so the last card can scroll above the fade. Overlay ignores touches. Typecheck/lint passed.

- Added fixed orange-gradient Join room CTA above bottom safe area/fade. Scroll clearance increased so last queue card remains reachable. Button currently explains preview status on tap; membership/host conditional rendering remains unimplemented. Typecheck/lint passed.

- Queue cards now have 4px cover inset and 76px rounded square covers. Upcoming cards have separate QueueVote pills outside the right border: up chevron, score, down chevron, warm white styling and orange selected state. Local preview votes toggle/clear and switch direction; no backend persistence/reordering/membership enforcement yet. Now Playing remains without voting. Typecheck/lint passed.

- Three room role mocks: Kitchen Disco = host (current profile name, pause/resume animation and next-track controls); Late Nights = joined participant (suggest/vote/leave); On Repeat = visitor (read-only scores, no self avatar, fixed Join). Home cards label mock role. Join/leave updates local role, self avatar and count. Suggest adds one mock catalog song once. Route-keyed room preview state resets on reopening; queues begin with each Home room’s corresponding track. No audio/backend/persistence; vote totals are local and do not reorder. Typecheck/lint passed; host layout visually verified in simulator.

- Added data/mockAccounts.json: 10 stable test accounts (self plus nine) with profile fields/colors/verification previews and per-room host/member IDs. Shared MockRoomsProvider now persists role/join/leave membership across navigation for the session (supersedes previous route-local role note). Home card avatar stacks/counts and room participant strips/counts use the same membership, initially 7/6/5. Self seeded from JSON but remains editable through ProfileContext. Participant avatars route to the same ProfileScreen: self editable; others read-only, no camera/remove/save; unknown IDs show unavailable. Profile route keyed by user ID prevents stale account drafts. Mock account ID/host/membership/role integrity checked; typecheck/lint passed. Simulator displayed Sara’s read-only profile. Details in doc/MOCK_ACCOUNTS.md.

- Room page now has matching top masked blur/warm fade using TabBarBackdrop placement=top with reversed gradients. Back/role/leave header floats above scrolling content; initial top clearance preserves card placement. Overlay ignores touches and bottom fade unchanged. Typecheck/lint passed.


# Earlier handoff snapshot before final consolidation

# Session handoff — 2026-11-18

Session closed after room role previews, shared mock profiles/membership, and final room header styling. This file describes the current state; the superseded chronological notes are preserved in SESSION_HISTORY_2026-11-18.md.

## Start here

Read mobile/AGENTS.md and doc/LEARNING_NOTES.md before changes. The user prefers small UI changes, using reference images and iterative review. Do not build unrelated screens or revisit the intro unasked. Current UI inventory and remaining work: [UI_PROGRESS.md](UI_PROGRESS.md).

The next work has not been selected by the user. Recommended next: the room Suggest song modal, followed by playlist detail/editor. Rooms and Playlists tabs are still title-only shells. Backend integration is not implemented.

## Current app

- Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router.
- Entry mobile/index.ts loads expo-router/entry; route/layout files are in mobile/src/app. Screen implementations are under mobile/src/screens; App.tsx is a compatibility re-export.
- Welcome, signup/login preview, first intro slide (standby), Home, profiles and room detail have UI implementations.
- Tabs: Home, Rooms, Playlists. White glass pill plus separate orange action button. Plus opens animated white pills over curved orange/peach blur backdrop; forms open centered with fade and currently have disabled submission.
- Home search is visual only by explicit user request; do not open a separate search route without agreeing behavior.
- Home playlist rows are visual previews with no detail destination yet. Notifications icon is disabled.

## Room preview

- Kitchen Disco: current user is host; Late Nights: joined participant; On Repeat: visitor.
- Header: shaped orange/peach SVG card, room name, live/paused/public label, host, genres, membership count and turntable Lottie. Host pause/resume drives the animation locally; no audio.
- **Final top styling: solid #FFFCF8 fixed back/role/leave header. No top fade or blur.** Bottom gradient fade/blur retained.
- Horizontal participant circles navigate to that account's profile. Host avatar has a yellow outline and admin shield.
- Joined users/hosts see Queue and Activity tabs below participants. Visitors see only the queue preview. Participants and playback controls stay shared. Activity shows local join/leave, suggestion and playback events with timestamps; newest 60, reset on room reopen. Queue stays mounted across tabs to preserve votes.
- Five initial song cards; first highlighted current song, no votes. Other cards have separate external up/score/down pills; cover inset 4px.
- Visitor sees fixed Join and disabled voting. Join enables Suggest/voting and adds self; Leave reverses membership.
- Host fixed controls pause/resume and advance to next song; no end-room/queue management UI yet.
- Suggest is a native alert offering one extra mock song; full catalog search modal is not built. Local vote scores do not reorder tracks.

## Shared test data and profile behavior

- mobile/src/data/mockAccounts.json: ten accounts (self + nine) and room host/member IDs.
- MockRoomsContext: session membership/role state shared by Home and room views. Initial member counts 7/6/5; Join/Leave stays updated across navigation, resets on reload.
- ProfileContext: session own-profile state seeded from self; save updates name/photo throughout the app. Signup name/photo preview is still separate.
- /profile edits self. /profile?userId=sara (etc.) selects a separate read-only profile page with text details, music tags and a local friend-request preview icon. Shared ProfileHeader and ProfileLayout preserve the banner and header; OwnProfileScreen owns editing logic. Unknown account IDs show unavailable.
- Mock images default to colored initials; self uses existing mascot or locally picked image. Verification badges are preview flags.
- Song suggestions, votes and playback state are screen-local and reset on reopening. See MOCK_ACCOUNTS.md.

## Product decisions

- Host-only audio: PLAYBACK_DECISION.md. Provider/catalog integration remains undecided; subject specifies no fixed track count or upload requirement.
- Public rooms can be previewed before Join; private-room access gate is planned, not enforced yet.
- Mandatory selected services: Track Vote + Playlist Editor. No real authentication, backend, realtime sync, music provider or bonuses.
- Intro artwork stays on standby; three steps are connected, with empty second/third content and a final Explore Cuevo action to Home.
- Turntable is the selected room illustration; Beat Buddy was rejected. TURNTABLE_ANIMATION.md describes export and current mock state wiring.

## Development and checks

Workspace: /Users/zero/Desktop/MusicRoom. Use existing iPhone 17 simulator and running Metro when available; do not repeat machine setup. Follow LOCAL_DEVELOPMENT.md. For Expo Go start `npm --prefix mobile run start -- --localhost --max-workers 2`; npm ios script is a native build command.

Useful routes: /home, /room/kitchen-disco, /room/late-nights, /room/on-repeat, /profile, /profile?userId=sara. Welcome/profile setup opens a three-step intro; the final action replaces it with Home.

Final typecheck/lint passed. Seed integrity checks passed. Simulator previously displayed the host room and Sara read-only profile. Full regression, physical-device and Android checks remain. There are substantial preexisting uncommitted files; preserve them and do not reset the workspace. No commit, deployment or publishing was requested.

## Shared song catalog

`mobile/src/data/songs.ts` exports 40 sourced tracks, `Song`, and `getSong`: five Winners 2005, five Labess, 30 across Pop/Hip-hop/R&B/House/Rock/Jazz/Afrobeats/Indie. Each has a distinct bundled cover. `songs.json` stores metadata/provenance; `genre` is provider data and `genres` holds curated app categories. See `mobile/src/data/SONG_CATALOG.md`. Ready for playlist UI but not wired to existing room sample tracks. No audio downloaded.

## Playlist detail and invitations

- `/playlists` now lists/searches three seeded playlists; Home rows and list cards open `/playlist/[id]`. Detail has a rounded orange header without the room notch, 2×2 cover collage, duration/count, collaborators, Invite and song list.
- Add songs searches all 40 catalog entries, prevents duplicates; ellipsis menus remove/move songs. Shared `PlaylistsContext` keeps edits/counts/covers consistent during the session; reload resets. No personal playback or backend/realtime editing.
- Joined room users/hosts have + Invite beside Participants, styled like Suggest. Both room and playlist use `InvitePeopleModal`; it excludes current members and toggles local invitation previews without sending anything.
- Typecheck/lint passed; playlist rendered in iPhone 17, Add song and duplicate prevention verified, count/duration updated from 7/25min to 8/27min; collaborator invitation picker inspected. Full regression and Android QA pending.

## Home notifications

Bell now opens dedicated compact `NotificationsModal` below header. Six typed mock notification kinds in `mockNotifications.ts`: friend request/accepted, room invite, playlist invite/update, room activity. Local read/response state drives bell dot and count; Mark all read, dismiss, destination navigation and preview Accept/Decline are wired. Responses do not modify friendships or room/playlist access. Simulator acceptance/unread behavior checked; no backend notification delivery.

## User-facing copy and notification style

User explicitly wants all Preview/Mock/development-status labels removed from product UI; do not reintroduce them. Removed visible copy/accessibility labels across features. Notifications popup has no pointer/count/Close; Notifications and Mark all read share a row with a fading gray divider. Native spring pop entrance replaces fade, with Reduce Motion support. Backdrop and native Back dismiss. Typecheck/lint and simulator visual review completed.

## Shared toasts

`react-native-toast-message` 2.5.2 installed via Expo. `components/AppToast.tsx` owns success/error/info styling; `utils/toast.ts` exports typed `showToast(type, title, message?)`. Root and visible native modal hosts keep messages visible over dialogs. Automatic hide (3s, errors 4.5s), tap/swipe dismissal, safe-area offsets and Reduce Motion supported. Wired profile save/photo errors, friend-request toggles, invite/cancel, notification responses, playlist add/remove, room join/leave/suggest. Simulator checked normal and modal toast rendering. No new backend functionality.


User rejected the reference-inspired dark-header playlist browsing redesign. Restored the prior warm-white searchable card list; removed its CollaboratorStack component. Playlist detail, catalog, editing, notifications and toast styling remain as before that redesign.

## Home banner

User requested an orange reference-inspired header directly beneath the Home navbar, carrying the existing headline. `HomeSearch` now starts with `HomeHero`: white frame, upper-left diagonal orange shape/lower-right step, native headline and subtle SVG music/geometric marks. Search remains visual-only below. Simulator screenshot `/tmp/cuevo-home-banner.png` checked; typecheck/lint passed.

Home banner refinement: removed outer white container and all interior decorations. Current HomeHero is only the solid brand-orange shaped background and headline.

## Home video header

User supplied root `Adult_friends_assembling_record_…_441f7f17.mp4`. Preserved original; app uses a silent 960px H.264 copy (~1.3MB) in `mobile/assets/videos/` plus poster. `HomeHero` now masks expo-video with existing cut-corner SVG, layers deep warm native radial mesh gradients and cream headline. Silent loop, focus/background pause, Reduce Motion still poster. `expo-video` installed with Expo and config plugin automatically added. Typecheck/lint passed; simulator rendering checked at `/tmp/cuevo-home-video-check.png`.

Home video overlay revised by user: bright brand-orange wash at 76% plus peach/tangerine/coral radial mesh layers, reducing video visibility to roughly 20% or less. No brown/charcoal overlay or dark text shadow. Simulator visually checked; typecheck/lint passed.

Icon preference: filled/solid icons throughout. All Ionicons -outline variants replaced with filled equivalents; voting chevrons replaced by solid carets. Keep future icons filled. Glyph names validated, typecheck/lint passed.

## Account recovery / verification UI

Three new shared-modal views: ForgotPasswordForm, ResetPasswordForm, VerifyEmailForm. Login Forgot link connected. Signup validates email and minimum-eight-character password, then Verify email → profile → intro; progress 0/33/67. Six-digit local code 123456; malformed/incorrect/expired cases, 15-minute deadline and 30-second resend cooldown. Reset includes confirmation and success state; verification has success state; change-email/back links wired. No backend email/auth/password changes; Login/Google remain disabled. See AUTH_UI.md for testing/integration. Typecheck/lint and direct validation cases passed; signup validation visually inspected.


## Archived handoff at close of 2026-11-18

# Session handoff — 2026-11-18

Current state at session close. Read `mobile/AGENTS.md`, `doc/LEARNING_NOTES.md`, then `doc/UI_PROGRESS.md`. Chronological and superseded handoff notes are preserved in `SESSION_HISTORY_2026-11-18.md`.

## Resume here

User asked to save progress and shut down the iOS simulator. All work is saved in the workspace; no commit/push/deployment requested. There are substantial preexisting uncommitted files: preserve them; never reset the workspace.

Next feature is not selected. Suggested next: complete the local Create playlist flow, then Create room / Join with code, Rooms discovery, and the room catalog song picker. Real authentication, backend, music playback, realtime synchronization and bonuses remain unimplemented.

## Current app and design preferences

- Expo SDK 58, React Native 0.88, React 19, TypeScript and Expo Router. Routes: `mobile/src/app`; implementations: `mobile/src/screens`.
- Brand orange `#FF4D24`, peach/coral/cream, rounded surfaces, glass navigation and toasts. Use filled icons everywhere.
- Do not place Preview/Mock/session-only/development disclaimers in product UI or accessibility copy. Keep implementation limitations in docs and task reports.
- User prefers small explained changes and reference-driven visual review. Do not redesign unrelated screens or resume intro artwork unasked.
- The dark-header playlist browsing experiment was explicitly reverted. Keep the warm-white searchable playlist card list.
- Main tabs: Home, Rooms, Playlists. White glass pill plus separate orange action button. Plus menu has animated white action pills over orange/peach backdrop; create/join forms still have disabled submission.

## Welcome and account UI

- Branded welcome with ribbon Lottie, signup/login modal and profile name/photo step.
- Login → ForgotPasswordForm → email confirmation → ResetPasswordForm → success → Login.
- Signup validates email/password → VerifyEmailForm → verification confirmation → ProfileForm → introduction. Progress 0/33/67.
- Three intro steps connected. First illustrated; second and third intentionally empty except navigation/progress. Final Explore Cuevo replaces intro with `/home`.
- Auth is UI-only: no emails sent, account created/verified or server password changed. Login and Google sign-in remain disabled; signup profile is not yet saved into shared ProfileContext.
- For local signup testing use `test@example.com`, `CuevoDemo123`; these are sample form inputs, not an authenticated account. Verification/reset code **123456**. Minimum password length eight characters; matching confirmation required for reset. Code deadline 15 minutes, resend cooldown 30 seconds; invalid/expired/incomplete-code states exist.
- `AUTH_UI.md` explains integration and test limits. Replace local challenge checks with authoritative backend validation before release.

## Home, notifications and toasts

- Greeting/profile link, visual-only search, linked room cards and linked playlist rows. Home search behavior remains undecided; do not add a search route unasked.
- HomeHero masks a silent looping video into the existing upper-left diagonal / lower-right stepped SVG shape. No outer white frame or decorative icons.
- User-supplied original `Adult_friends_assembling_record_…_441f7f17.mp4` preserved at root. App uses 960×540 H.264 copy (~1.3MB), audio removed, plus poster under `mobile/assets/videos/`.
- Final overlay: 76% brand-orange wash plus peach/tangerine/coral radial mesh; video visibility roughly 20% or less. **No brown/charcoal overlay.** Cream headline. `expo-video` installed; pauses off-focused Home/background; Reduce Motion uses poster.
- Compact bell NotificationsModal: six types (friend request/accepted, room invite, playlist invite/update, room activity), local read state, responses and destination links. No pointer, title count or Close button. Notifications and Mark all read share a row, fading gray divider, spring pop entrance, backdrop/native Back dismiss.
- Notification responses and invitations are local UI state; they do not change real friendships or access permissions.
- `react-native-toast-message` 2.5.2: shared AppToast and typed showToast helper. Success/error/info use frosted native blur, white sheen/border and large 34px filled icons in 52px tiles. Root and visible native-modal hosts. Auto-hide 3s (errors 4.5s), tap/swipe dismissal, accessibility announcements and Reduce Motion. Native blur currently iOS; Android toast uses translucent fallback.

## Rooms

- Kitchen Disco: self host (7 members); Late Nights: joined participant, Sara host (6); On Repeat: visitor, Amine host (5).
- Orange shaped room card, turntable Lottie and shared member data. Fixed solid off-white top bar, no top blur/fade; bottom gradient/blur retained.
- Participant avatars open profiles; host has yellow stroke and bottom-right admin shield. + Invite beside Participants for joined users/hosts opens shared local invitation picker.
- Participants remain above Queue/Activity tabs. Tabs visible to joined users/hosts; visitors see queue and Join. Queue stays mounted across tabs to preserve votes.
- Activity: local join/leave, suggestions, pause/resume/skip, timestamps, newest 60; resets on reopening. No per-vote logs.
- Current track pinned without votes. Other cards have external up/score/down controls; vote scores do not reorder songs yet.
- Join/Leave updates MockRoomsContext and Home counts. Host pause/resume controls animation; Next advances local queue. **No music audio playback.** Host-only audio is the agreed future model; see PLAYBACK_DECISION.md.
- Suggest still uses a native alert offering One More Time. The 40-song catalog is not wired into rooms yet. Private-room gates, settings, vote policies, end-room and realtime behavior remain.

## Playlists and catalog

- `/playlists`: warm-white searchable three-playlist card list. Home and list cards open `/playlist/[id]`.
- Detail: plain rounded orange header without room notch, 2×2 cover collage, title/description/creator, count/duration, collaborators, Invite and songs.
- Catalog search/add prevents duplicates. Ellipsis menus remove or move songs up/down. PlaylistsContext shares order/membership across Home/list/detail for this session; reload resets seeds. No personal playback.
- Visibility labels and simple UI edit eligibility exist; policy editing, real access enforcement, creation, persistence and realtime concurrency remain.
- `songs.ts` exports 40 songs, Song type and getSong: 5 Winners 2005, 5 Labess, 30 across Pop/Hip-hop/R&B/House/Rock/Jazz/Afrobeats/Indie. Distinct local release covers, metadata/provenance in songs.json. Provider `genre` is preserved; curated `genres` supports app filters. No song audio downloaded. See `mobile/src/data/SONG_CATALOG.md`.

## Profiles and illustration assets

- Separate OwnProfileScreen and OtherProfileScreen share ProfileHeader/ProfileLayout. Own editing/photo picker/save updates ProfileContext during the session. Other profiles use text details/music tags and local friend-request toggle, not disabled fields.
- Ten mock accounts in mockAccounts.json with stable IDs and shared room memberships. Unknown profiles show unavailable. Verification badges are data flags, not account verification.
- Three orange collaboration storyboard starting images saved under `design/storyboards/shared-rhythm/`; video was generated externally by user. Blue reference-character experiments are not app assets.

## Validation and outstanding checks

- Latest code: typecheck and lint passed. Direct auth validation checks covered valid/invalid email, short password and malformed/wrong/expired/valid codes.
- Simulator checks covered Home/video masking, playlist composition, song addition/duplicate prevention/count updates, public profile, notifications/read responses, toasts above native modals and signup inline validation.
- Full auth recovery/verification traversal, keyboard/large-text/small-screen regression, physical-device and Android QA remain. No claim of backend completion.

## Restart development

Workspace `/Users/zero/Desktop/MusicRoom`. Use nvm and `mobile/.nvmrc`; default shell Node 25 produced engine warnings during installs, while the documented Node 26 setup is compatible.

1. Reuse existing iPhone 17 (iOS 26.5), UUID `158AB8CD-3044-4069-93A6-73D8C9CAC59A`.
2. Start Expo Go Metro: `npm --prefix mobile run start -- --localhost --max-workers 2`.
3. Boot/open Simulator, then open `exp://127.0.0.1:8081` in Expo Go. Avoid duplicate Metro/device processes. `npm run ios` is a native build command, not the normal Expo Go workflow.
4. Checks: `npm --prefix mobile run typecheck` and `npm --prefix mobile run lint`.

Useful routes: `/`, `/home`, `/playlists`, `/playlist/late-night-drives`, `/room/kitchen-disco`, `/room/late-nights`, `/room/on-repeat`, `/profile`, `/profile?userId=sara`.

Session shutdown confirmed: iPhone 17 simulator shut down and project Metro stopped after saving documentation. Restart using the steps above.
