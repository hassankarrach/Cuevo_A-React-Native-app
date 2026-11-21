# Building and learning React Native

## App identity

- Brand assets and the selected primary color are recorded in `doc/BRAND.md`.
- The logo lives in `mobile/assets/logo.png`. The shared primary color is `colors.primary` (`#FF4D24`) in `mobile/theme/colors.ts`; centralizing it lets us update future UI consistently.

- The app's name is **Cuevo**. Use this name consistently in the UI, configuration, and documentation.
- The name combines **cue/queue + vote**, connecting the shared music queue with track voting.
- Expo display name: `Cuevo`; Expo slug: `cuevo`; package name: `cuevo-mobile`.
- Existing filesystem paths, GitHub repository URLs, and historical simulator device names may retain older names until those resources are actually renamed. They are technical references, not app branding.

## How we work

- Do not put Preview, Mock, session-only or development-status disclaimers in user-facing UI or accessibility labels. Keep implementation limitations in developer documentation and task reports.

- The goal is to build a cool UI for the running Expo app while learning React Native.
- I am already very familiar with React for the web. Explain React Native concepts by connecting them to familiar React and web concepts where useful.
- Build incrementally, focusing on one specific UI piece or concept at a time.
- Do not implement the whole UI or application logic at once.
- Explain the code added or changed at each step: what it does, why it is needed, and how the React Native parts work.
- Keep changes small enough that I can understand them before we move on.
- Add concise learning notes here as we introduce new concepts.

## Current work: welcome page

- The native splash is configured and verified in a standalone simulator Release build. We have returned to Expo Go for UI development with Fast Refresh.
- We are designing the welcome page: the first React Native screen after the native splash. Its UI has not been implemented; `App.tsx` is still blank white.
- The user wants a creative animated experience, exploring cartoon backgrounds, vector lines, and moving shapes.
- Selected workflow: design an animation from scratch in Lottie Creator, review it, then integrate it into React Native. No animation file or player dependency has been added yet.
- Lottie Creator is now connected. First animation draft created in document `cuevo-welcome-record`: smiling orange record with floating notes and pulsing sound lines. Playable preview shown for review; not yet exported or integrated.
- Next step: settle one small animation concept and build it incrementally. Welcome copy, layout, controls, and navigation remain undecided.
- React Native is the UI framework; Expo supplies libraries and tooling. Expo Go is a development preview app. A standalone build removes the need for Expo Go, while still including the Expo libraries we use.

## Step 1: A blank white home screen

File: `mobile/App.tsx`

- Removed the starter text, button, counter state, and their styles.
- `App` is a React component, using the same component and JSX concepts as React for the web.
- React Native styles are JavaScript objects. `StyleSheet.create` organizes the styles used by components.
- `flex: 1` lets the screen container fill the available space, and `backgroundColor: '#ffffff'` makes it white.
- `SafeAreaProvider` supplies information about device safe areas. `SafeAreaView` uses it to keep future content clear of notches and system bars.
- `StatusBar style="dark"` gives the system status bar dark text and icons for the white background.

## Step 2: Native splash configuration

- `expo-splash-screen` supplies a config plugin, configured in the `expo.plugins` array in `mobile/app.json`.
- The plugin sets a white background, uses `./assets/logo.png`, and gives the image a width of 160 logical pixels. `contain` preserves the image's aspect ratio; transparent padding in the PNG counts toward that width.
- Native splash configuration is applied when building the native app, before React can render. It is not a JSX screen and does not update through Fast Refresh.
- No manual hiding or timer is added: the default behavior dismisses the splash when the app is ready.
- Expo Go does not provide an accurate custom splash preview. Verify the final startup appearance in a release build.

## Native simulator build

- CocoaPods installs the iOS libraries that Xcode needs to compile the app.
- `npx expo run:ios --configuration Release --device 158AB8CD-3044-4069-93A6-73D8C9CAC59A --no-bundler` generates the native iOS project, builds Cuevo, and installs it on the existing iPhone 17 simulator.
- `ios.bundleIdentifier` is `com.cuevo.app`: the native app's identifier, separate from its display name and Expo slug.
- Release builds bundle the JavaScript into the app and run without Metro. To see later code edits in this release preview, rebuild it; the existing Expo Go workflow still supports Fast Refresh.
- Generated `mobile/ios/` files remain ignored by Git. Customize native behavior in app config rather than editing generated files.

## Welcome animation direction update

- User wants an animated looping line matching their supplied gradient ribbon reference, replacing the record concept.
- Created durable Lottie document `cuevo-welcome-ribbon`, revision 1: 480×720, 30 fps, six-second draw-on/erase loop, subtle float and moving purple/blue/mint/yellow gradient on near-black. Filmstrip checked. No mobile integration yet.

- Ribbon updated to revision 3: Cuevo `#FF4D24` gradient with burnt orange and peach, plus four gently floating music notes. Saved new version to existing workspace file: https://app.lottiefiles.com/animation/7ab916f5-7116-4700-8c8e-721680a0307e . Filmstrip checked and Lottie export/save succeeded. Gradient path stays at composition level for export compatibility; group float was removed in revision 2, while draw-on/erase and gradient motion remain.

## Step 3: Welcome animation

- Exported the approved ribbon as `mobile/assets/animations/cuevo-welcome.json` and installed `lottie-react-native` with `expo install`.
- `LottieView` renders the local vector animation; `autoPlay` starts playback and `loop` repeats it. Unlike a video, the JSON describes shapes and motion.
- `View` is the basic layout container, similar to a web `div`. The hero and empty content area use `flex: 3` and `flex: 2` to divide available safe-area height 60/40.
- The animation uses percentage dimensions and `resizeMode="contain"` (similar to CSS object-fit) to preserve its proportions.
- Added `colors.background` (`#0B0B0B`) and light status-bar icons to match the dark artwork. Native splash remains white.
- TypeScript and lint passed; verified the rendered welcome animation in the existing iPhone 17 Expo Go simulator. Bottom copy and buttons await discussion.

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

## Shared account sheet and signup preview

- `AuthModal` owns the existing sheet styling, header, keyboard avoidance, scroll area, and decoration. It accepts `title`, `children`, and optional `onBack`, just like a reusable React web layout component.
- WelcomeScreen uses one `authMode` union (`login`, `signup`, `profile`, or null) instead of separate modal booleans. Get started opens signup; account links switch content in the same sheet; profile back returns to signup.
- LoginForm and SignUpForm stay separate. Signup reuses the input styling with new-password autofill hints. Its fields remain mounted while previewing profile setup so back preserves entered values. Closing clears local form values.
- Continue currently previews profile setup locally; it does not create or validate an account. Profile has a display-name field and initial avatar; photo upload is deferred. Explore Cuevo and real login/Google actions remain disabled until authentication and the home screen exist. No mandatory create/join-room step.

## Signup progress and local avatar preview

- AuthModal accepts an optional progress percentage and draws a thin orange bar below its header: empty on signup, halfway on profile. Login has no progress bar; removed numeric step copy.
- ProfileForm uses Expo ImagePicker to open the system photo library (image-only), optionally crop a square, and show its returned local URI in a circular native Image. Tapping the photo or Add/Change photo reopens the picker; Remove restores the initial avatar. Cancellation leaves the previous photo intact; errors show an alert.
- The URI lives only in component state, like a React web preview URL. No upload, account write, persistent application storage, or photo-library save is performed. The native picker may create a temporary cache file. Closing the sheet discards the preview state.

## Custom mascot avatar placeholder

- Generated a cream 3D headphone mascot on solid periwinkle using the imagegen skill; bundled at `mobile/assets/avatars/cuevo-mascot.png`.
- ProfileForm now gives Image either the picked local URI or the bundled require asset. Removing a selected photo restores the mascot. Display name no longer replaces the placeholder with an initial; existing circular clipping and picker actions remain.

## Introduction page foundation

- Added Expo Router for the first page transition. `index.ts` loads its entry; `src/app/_layout.tsx` now handles fonts, splash, safe areas, and a headerless Stack. Small route files export screen components kept outside `src/app`.
- Explore Cuevo closes the auth sheet and pushes `/introduction` for local UI preview; no account is created. Intro back returns to welcome.
- IntroductionBackground uses native gradient Views: saturated orange base, broad yellow radial glow from the bottom, and faint rotated gradient strips for the reference's top rays. These are code-drawn layers, with no bitmap or blur dependency.
- This increment is intentionally just the background and a safe-area back control. Slide copy, progress, collages, and Lottie follow after background approval. Typecheck/lint and iOS bundle passed; visually verified on iPhone 17.

## First illustrated intro slide

- Added the approved transparent ink-cat collage PNG to IntroductionScreen using native Image with contain sizing. The orange/yellow background shows through its alpha channel.
- Native Lufga text reads “Good music. Better company.” and “A space to discover, share, and enjoy music together.” Text stays separate from artwork for readability and accessibility.
- Progress line is pinned at the safe-area top (first of four slides); cream Next button is pinned at the bottom. ScrollView between them allows copy/artwork to scroll on smaller screens or enlarged text. Artwork uses remaining space with a minimum height.
- Next is currently a disabled visual preview because subsequent slides are not built. No slideshow navigation or fake destination added. Typecheck/lint passed; visually checked first slide in existing iPhone 17 Expo Go.

## Full-height intro collage revision

- Generated a taller transparent 2D collage version with a white leaping cat, orange headphones, charcoal/yellow supporting elements, and no purple or paper card. Source and generation prompts: `assets/mascot/cuevo-ink-cat-tall-v2.*`.
- Moved artwork outside the text ScrollView into an absolute decorative layer spanning full screen height. useWindowDimensions supplies current screen height to preserve its 2:3 aspect ratio; left offset and root overflow hidden crop it beyond the right edge.
- Split native heading into staggered left-aligned “Good music.” and “Better company.” blocks with narrow supporting copy. Top progress/back and bottom Next remain above the illustration. Next is still a disabled preview.
- Visually reviewed in iPhone 17 Expo Go. Typecheck/lint passed.

## Home header

- Added `/home` route and HomeScreen with a warm off-white surface. Reusable HomeHeader displays a rounded 48px avatar, small Hello greeting, bold display name and emoji, and only an outlined notifications bell on the right.
- Header props accept a displayName, native ImageSourcePropType, and an optional notifications callback. Defaults are preview data; account/profile data is not connected. Name flexes and truncates to prevent overlap with the 44px bell target.
- Notifications is disabled until its handler/screen is implemented; no unread badge or fake notification count. Intro remains on standby and unchanged. Home preview opened directly in Expo Go; typecheck/lint passed and simulator layout visually checked.

## Home search entry

- Added HomeSearch beneath the header: native Lufga headline “Find your next music room.” and a soft rounded search entry with search icon.
- Home uses a Pressable rather than TextInput because tapping opens the separate `/search` route. SearchScreen contains the actual controlled TextInput, autofocus, clear action, and back control. This keeps query entry separate from discovery content.
- Search results/backend queries are not implemented yet; no fake matches or empty-result claims. Visually checked Home and exercised open/back in iPhone 17 Expo Go. Typecheck/lint passed.

- Search behavior correction: user does not want a separate section/page and will define interaction later. Removed `/search` and SearchScreen. HomeSearch is now a static visual View with icon/placeholder; no navigation, input, keyboard or filtering behavior attached.

## Fixed bottom tabs

- Added Expo Router headless tabs in `src/app/(main)/_layout.tsx` for Home, Rooms and Playlists. Parentheses group routes without changing URLs (`/home`, `/rooms`, `/playlists`). Welcome/auth/intro stay outside this group.
- TabSlot gets remaining screen space; TabList stays below it, so future screen content can scroll without moving the bar or hiding behind it. Safe-area bottom margin keeps it above the home indicator.
- Reference-inspired charcoal pill, cream filled home/playlist icons and waveform rooms icon; selected tab uses Cuevo orange. Icons have accessible tab names even though visible labels are omitted.
- Rooms and Playlists currently have title-only screen shells. Existing Home header and static search retained. Typecheck/lint passed; Home tab bar visually verified in iPhone 17 Expo Go.

- Bottom tab bar revised per user feedback: white surface, subtle warm border/shadow, muted inactive icons and orange active icon. Height reduced from 84 to 60, icons from 32 to 26, horizontal margins increased to 40 for a more compact floating pill. Retained 44px icon targets and bottom safe area.

## Home room-card section

- HomeRooms adds a Rooms heading with View all linking to the existing Rooms tab, followed by three intentionally blank white rounded cards matching the supplied shape reference. Flex distributes the cards equally; aspectRatio keeps proportions across widths.
- Empty cards are decorative previews, not fake live room data or tappable controls, and are excluded from accessibility. Home sections now sit in a ScrollView while the greeting and bottom tabs remain fixed.
- Typecheck/lint passed and room-card spacing visually checked in the existing iPhone 17 simulator.

## Room banner and sample content

- Replaced blank cards with three explicitly preview/sample rooms. Each has an inset rounded native gradient banner with a soft radial highlight and music icon, room name below, track and artist beneath, and listener count along the bottom.
- Native backgroundImage draws the temporary artwork; no new bitmap/dependency. Cards grow with content and names allow two lines. These are static design samples, not live backend rooms; cards remain noninteractive. View all still navigates to Rooms.
- Typecheck/lint passed; visually checked banner clipping and text fit in all three cards on iPhone 17.

- Room cards revised to fixed 164×164 squares in a horizontal ScrollView. Full-bleed row uses negative outer margins and inner padding so the third card peeks beyond the right edge. Compact inset banner and text spacing preserve track/artist/listener details. Typecheck/lint passed; square layout visually checked in Expo.

- Room name moved into the center of each gradient banner, replacing the music icon. Cream semibold text allows two lines; removed duplicate title below so track/artist remain in the body.

- Increased room-card song text to 14px/19px line height and artist to 13px/18px for readability, retaining square cards and single-line truncation.

## Listener stack and live pulse

- RoomListeners shows up to three overlapping circular placeholders followed by +remaining (total minus visible avatars). It accepts optional native image sources for real avatars later; sample totals remain in HomeRooms. Total count stays in each card's accessible description.
- Replaced the small dot/count row with avatars and a red radio/broadcast live icon. LiveIndicator uses native Animated opacity/scale for a gentle loop, stops on focus loss/unmount, and respects system reduced motion. useAnimatedValue provides a stable animation value compatible with React lint rules. No animation dependency added.
- Square card sizes preserved. Layout visually checked in iPhone 17; typecheck/lint passed.

## Playlist section shell

- Added HomePlaylists directly below Rooms in the Home ScrollView: Playlists heading, View all linking to the Playlists tab, and three blank rectangular cards stacked vertically. Cards are noninteractive layout placeholders; styling/content awaits the user's reference. Header and tabs remain fixed while sections scroll.
- Typecheck/lint passed.

## Rotating room vinyl

- Added RoomVinyl beside song/artist text, drawn with native circular Views, groove borders, a diagonal sheen, colored center label and spindle hole. No generated bitmap or dependency required.
- Sample room genre drives label color: disco orange, R&B muted violet, pop gold. Future backend genre can map to the same presentation token.
- Native Animated performs a linear 6.5-second rotation loop, stops when Home loses focus/unmounts, and respects reduced motion. Song and artist share a flex column next to the 34px disc.
- Typecheck/lint passed; visually checked room cards in iPhone 17 Expo Go.

## Playlist row content

- HomePlaylists now renders three sample rectangular rows with 76×76 square gradient covers on the left. Right column holds playlist title, creator/track count, overlapping collaborator placeholders and a +remaining badge, plus public/private icon and label.
- Collaborators represent editors rather than room listeners; no live indicator or spinning record here. Rows remain noninteractive preview data. Footer can wrap on narrow widths; titles/metadata truncate to preserve layout. Typecheck/lint passed and simulator layout visually checked.

## Editable profile page

- Added `/profile`, opened by tapping the Home avatar. Reference-inspired white card has 32px outer rounding, inset orange gradient cover with 26px rounding, 84px circular avatar overlapping cover by 42px, name/subtitle, and padded editable fields.
- Fields: display name (required), username, bio, optional city, music preference chips; photo picker supports change/remove with local preview. No fake verification badge, online status, or fabricated statistics from the reference.
- ProfileProvider holds saved profile state above the Router Stack, allowing HomeHeader and ProfileScreen to share data. ProfileScreen edits a draft; Save validates/trims and updates the shared state, then returns. Back discards draft edits. Changes last for the current runtime session only; no backend, durable storage, uniqueness checks, or privacy enforcement yet. Signup preview is still separate.
- KeyboardAvoidingView + ScrollView keeps the long form accessible. Typecheck/lint passed; editable fields and save placement inspected in iPhone 17. User was actively interacting during final UI review, so automated edit/save testing was not performed.

- Profile white card now spans full screen width (removed horizontal ScrollView padding). Avatar retains its overlapping position but uses rounded-square corners: 14px border frame and 10px image, matching existing app photo styling.

- Edit profile header now overlays the scrolling content with an opaque-to-transparent warm gradient instead of a solid cutoff. It remains fixed below the system safe area; content starts with enough top inset and scrolls underneath the fade. Removed explicit bottom padding from ScrollView, outer card, and card body; system safe area remains.

- Per user request, profile now excludes the bottom safe-area inset, has no bottom corner rounding, and allows the white card to grow to the screen edge. No bottom padding/gap remains; top and side safe areas retained. Typecheck/lint passed.

- Added 24px bottom padding inside the profile card body to lift Save changes while the white container still reaches the screen bottom.

- Profile card background now lives in an absolute, noninteractive surface layer: solid white body followed by a 24px white-to-transparent bottom gradient. Only the background fades; Save button and form remain opaque. Fade occupies the existing bottom padding and reveals the page color underneath.

- Removed duplicate Change photo text action from profile. Avatar/camera remains the photo picker trigger. Name and live bio preview now sit in a flex column beside the overlapping square avatar; bio replaces the previous genre subtitle and falls back to brand copy when empty.

- Added an orange checkmark-circle badge beside the profile display name. It is currently a requested visual preview, not backed by account verification; accessibility label identifies it as a preview. Name shrinks/truncates while preserving badge space.

## Fading tab navigation backdrop

- Main TabList is now an absolute bottom overlay, allowing Home content to scroll behind it. Preserved the user's current 65px height, 15px radius and 20px side offsets; pill is slightly translucent white.
- TabBarBackdrop uses a continuous alpha-gradient mask over expo-blur with a warm transparent-to-cream overlay. Its top edge fades smoothly instead of cutting off scrolling content. BlurTargetView wraps TabSlot for Android SDK 31+ blur support; iOS uses native backdrop blur. Older Android falls back to tint.
- Home's scroll-content bottom inset reserves enough end space to bring the final playlist fully above the bar. Backdrop ignores touches; tab controls stay sharp and interactive. Typecheck/lint passed and Home composition visually checked in iPhone 17.

## Glass navigation and creation menu

- Restyled tabs after supplied glass reference: 60px translucent white capsule with thin white border, native blur and soft shadow; outlined icons, active white inner pill with visible tab label. Separate 58px orange plus circle at right. Existing fading bottom backdrop retained.
- Plus opens CreateMenu, a native bottom Modal with Create a room / Join with a code / Create a playlist. Selecting a choice reveals a small local name/code form; Back returns to menu, close/backdrop dismisses it. Submission stays disabled and explicitly preview-only until backend flows exist.
- Modal state is local and resets on close, keyboard avoidance and scroll space included. Existing 3 tab destinations preserved. Typecheck/lint passed; glass bar and playlist action sheet visually inspected in iPhone 17. User actively interacted during QA, so avoided taking over their input.

- Floating plus menu now uses a Cuevo-orange radial backdrop instead of black linear shading. Large elliptical alpha/blur mask originates beyond bottom-right for a curved fade toward top-left; a second peach glow adds warmth. Blur uses light tint to avoid residual charcoal shading; action pills remain dark for contrast.

- Floating action pills and close circle now use translucent white instead of gray. Labels/close icon switched to charcoal for contrast; warm icon tiles and curved orange backdrop preserved.

- Create/join/playlist forms now open as centered rounded popup dialogs using native Modal fade animation, replacing slide-up sheets. Width capped at 420px with side/safe-area spacing and max-height scrolling/keyboard avoidance retained. Removed sheet drag handle; floating plus menu unchanged.

- Plus-menu backdrop trial changed from orange/peach to white. Curved radial transparency mask and soft light blur retained; colored icon tiles unchanged.

- Reverted the white backdrop trial at user's request; restored curved orange/peach menu backdrop with blur.

## Staggered plus-menu entrance

- Wrapped each floating menu action in StaggeredMenuItem. Native Animated fades each pill from 0 to 1 while moving up 18px and scaling from 0.96, with a 90ms delay between actions and 280ms ease-out timing.
- Runs each time menu items mount, including returning from a create/join form. Animation cleanup stops work on close/unmount; system reduced motion shows actions immediately. No added animation dependency. Typecheck/lint passed.

## Blank room destination

- Added dynamic Expo Router route `/room/[id]`, implemented by RoomScreen outside the route directory. Each Home room card is now a Pressable that pushes its stable sample room ID.
- RoomScreen is intentionally blank except for a safe-area back arrow, with the existing warm off-white background. It sits outside main tabs, leaving the whole page available for the upcoming room UI. Back restores the previous screen; direct entry falls back to Home.
- No queue, playback, participation, or backend logic yet. Typecheck/lint passed.

## Room participant strip

- Added RoomParticipants in the room's top row beside the back control: one horizontal ScrollView of individual 50px circular avatars, with spacing instead of overlap. It can swipe sideways to show the remaining participants.
- Uses current local-profile photo first, followed by named initial placeholders for preview participants. No membership/backend action occurs. Participants have accessible names; no tap behavior added yet. Typecheck/lint passed.

- Room layout now has a blank charcoal header card (164px high, 22px rounded corners) below the back control, inspired by the supplied card reference. Participant carousel moved into a separate 66px-high row below the card with 16px spacing; rest of room remains blank. Typecheck/lint passed.

- Replaced plain room header rectangle with RoomHeaderCard, an SVG silhouette with rounded outer corners and a smooth recessed step at the upper right, matching the supplied reference shape more closely. Installed react-native-svg with Expo-compatible version; empty card content preserved. SVG path curves form an actual transparent cutout rather than a page-colored cover. Typecheck/lint passed and shape visually verified in Expo.

- RoomHeaderCard now uses SVG linear orange gradient plus soft radial peach glow within its custom cutout silhouette. Exported Lottie turntable placed absolutely at top-right (170px square, top -42px), with transparent artwork extending above the card. It autoplays as a design preview only; no audio or host state wiring yet.
- Added native Participants heading above the horizontal avatar strip. Typecheck/lint passed and full header composition visually checked in iPhone 17 Expo Go.

- Lowered room-header turntable by 24px (top offset -42 → -18) per user feedback; size/right position unchanged.

- Room header now renders route-specific sample room name, host, genres and participant count on the left, with a Live/Public badge and existing animated turntable on the right. RoomHeaderDetails typed props separate card presentation from route sample data. These remain UI previews; no live playback or membership backend. Typecheck/lint passed; visually verified in iPhone simulator.

- Added RoomQueue below Participants with five sample song cards: square vinyl placeholder covers, song/artist, contributor and duration. First has warm peach/orange highlight and Now Playing label; remaining four have queue positions. Room body now scrolls vertically with back control fixed. Visual preview only, no playback actions. Typecheck/lint passed and simulator layout checked.

- Room page reuses Home TabBarBackdrop for a full-width bottom gradient/masked blur, backed by BlurTargetView. Bottom safe area now belongs to scrolling content with extra clearance so the last card can scroll above the fade. Overlay ignores touches. Typecheck/lint passed.

- Added fixed orange-gradient Join room CTA above bottom safe area/fade. Scroll clearance increased so last queue card remains reachable. Button currently explains preview status on tap; membership/host conditional rendering remains unimplemented. Typecheck/lint passed.

- Queue cards now have 4px cover inset and 76px rounded square covers. Upcoming cards have separate QueueVote pills outside the right border: up chevron, score, down chevron, warm white styling and orange selected state. Local preview votes toggle/clear and switch direction; no backend persistence/reordering/membership enforcement yet. Now Playing remains without voting. Typecheck/lint passed.

- Three room role mocks: Kitchen Disco = host (current profile name, pause/resume animation and next-track controls); Late Nights = joined participant (suggest/vote/leave); On Repeat = visitor (read-only scores, no self avatar, fixed Join). Home cards label mock role. Join/leave updates local role, self avatar and count. Suggest adds one mock catalog song once. Route-keyed room preview state resets on reopening; queues begin with each Home room’s corresponding track. No audio/backend/persistence; vote totals are local and do not reorder. Typecheck/lint passed; host layout visually verified in simulator.

- Added data/mockAccounts.json: 10 stable test accounts (self plus nine) with profile fields/colors/verification previews and per-room host/member IDs. Shared MockRoomsProvider now persists role/join/leave membership across navigation for the session (supersedes previous route-local role note). Home card avatar stacks/counts and room participant strips/counts use the same membership, initially 7/6/5. Self seeded from JSON but remains editable through ProfileContext. Participant avatars route to the same ProfileScreen: self editable; others read-only, no camera/remove/save; unknown IDs show unavailable. Profile route keyed by user ID prevents stale account drafts. Mock account ID/host/membership/role integrity checked; typecheck/lint passed. Simulator displayed Sara’s read-only profile. Details in doc/MOCK_ACCOUNTS.md.

- Room page now has matching top masked blur/warm fade using TabBarBackdrop placement=top with reversed gradients. Back/role/leave header floats above scrolling content; initial top clearance preserves card placement. Overlay ignores touches and bottom fade unchanged. Typecheck/lint passed.

- Removed blur from room top fade per feedback via optional TabBarBackdrop blur=false. Top gradient retained; bottom blur unchanged. Typecheck/lint passed.

- Room top header reverted to solid #FFFCF8 matching page background; removed top fade overlay. Fixed header retained. Bottom fade/blur unchanged. Typecheck/lint passed.

## Session close — 2026-11-18

Audited screens and documented built UI separately from local mock behavior and missing backend integration in UI_PROGRESS.md. Replaced stale SESSION_HANDOFF with a current snapshot and archived its historical notes in SESSION_HISTORY_2026-11-18.md. Updated README, PROJECT_PLAN, LOCAL_DEVELOPMENT and TURNTABLE_ANIMATION to reflect routing, role/profile mocks, host animation controls and final solid room top header. Mandatory acceptance remains unchecked; next UI work is not selected. Recommended room Suggest modal then playlist detail/editor. Intro remains on standby. Final code checks already passed after last UI edit; session-close changes are documentation only.

## Three-screen introduction navigation

- `IntroductionScreen` uses React `useState` to track three steps, like a small React web wizard. Only step one renders copy and artwork; steps two and three keep an empty content area with shared progress and Back/Next controls.
- Final Explore Cuevo uses Expo Router `router.replace('/home')` to replace the introduction route with Home. Back moves between steps before leaving the introduction.

## Separate profile pages with shared presentation

- `ProfileScreen` selects `OwnProfileScreen` or `OtherProfileScreen` from the route user ID. Form drafts, validation, photo picking and saving belong only to the own-profile component.
- `ProfileLayout` shares the page header, scrolling and card surface; `ProfileHeader` shares the banner, avatar and identity. Props customize presentation, like reusable React web components.
- Other profiles use native `Text` and noninteractive genre tags instead of disabled inputs. The friend-request icon toggles a screen-local preview state; no request is sent to a backend.

## Host participant indicator

- `RoomParticipants` receives the room host ID and compares it with each participant ID to show a yellow avatar border and bottom-right shield badge. The badge is positioned inside an outer wrapper, while the inner avatar clips its photo to a circle. This keeps the badge visible outside the photo edge.

## Room Queue and Activity tabs

- Joined participants and hosts see `RoomTabs` below the shared participants row; visitors keep the queue preview. React state selects Queue or Activity, without adding navigation routes. Join/Leave resets selection to Queue.
- Queue stays mounted with `display: none` while Activity is selected, preserving its screen-local vote state. Shared header, participants and host playback controls remain outside the tab content.
- `RoomActivity` renders timestamped events from local room interactions: join/leave, suggestions, pause/resume and next track. Events are newest first, capped at 60, and reset when reopening the room. No per-vote logs or backend/realtime events are implemented.

## Shared song catalog

- Added five Winners 2005 songs sourced from Apple’s public iTunes Search API, with distinct bundled 600px release covers. `src/data/songs.json` holds IDs, titles, artists, albums, durations, genres, release dates and source provenance.
- `src/data/songs.ts` adds literal local image `require` mappings for Metro and exports `songs`, `Song` and `getSong`. This catalog is ready for future playlist UI; existing room sample tracks remain separate. No audio was downloaded or playback added.

## Expanded song catalog

- Catalog now contains 40 tracks: five Winners 2005, five Labess and 30 across all eight preference genres. Each has a distinct bundled cover and source provenance.
- `genre` preserves the provider label; `genres` holds curated app categories so filters can match preference chips even when providers use broader labels such as Dance or Alternative. No audio or playback was added.

## Playlist pages and shared session edits

- `PlaylistsScreen` lists/searches three sample playlists; Home cards and list cards open `/playlist/[id]`. `PlaylistHeader` uses a plain rounded orange card without the room’s upper-right notch, plus a collage of the first four covers.
- `PlaylistsProvider` shares song membership/order across Home, list and detail for this app session. Add prevents duplicates; song menus remove or move entries up/down. Counts, duration and collage derive from the same IDs rather than separate mock totals. Reload resets the seed.
- `AddSongsModal` searches the 40-song catalog; a keyboard-avoiding container keeps search usable on phones. `InvitePeopleModal` is shared by room and playlist Invite buttons and excludes existing members. Invitations only toggle a local preview and send no notifications. No playback, backend or realtime playlist synchronization was added.

## Compact Home notifications popup

- `NotificationsModal` is a dedicated transparent native Modal positioned below the Home bell using measured header height and safe-area insets. Its compact panel scrolls independently and closes through the backdrop, Close, or native Back.
- `mockNotifications.ts` defines six typed examples: friend request, friend accepted, room invite, playlist invite, playlist update, room activity. Home owns local read/response state and the bell’s unread indicator. Accept/Decline are previews only; tapping content opens its profile, room or playlist route. Mark all read clears unread indicators.
- Request responses do not change actual friendships or room/playlist permissions, and no notifications are sent. State is local to the Home screen.

## Notification popup refinement

- Popup header is a single row: Notifications and Mark all read. Removed pointer, header count and Close button; backdrop tap and native Back/Escape dismiss it. Divider is a transparent → light gray → transparent native linear gradient.
- Native Modal uses no built-in transition; an Animated spring scales/slides its panel into place with the native driver. Reduce Motion opens the panel without movement. Animated.Value is initialized with lazy useState for compatibility with the project’s React hooks lint rules.
- Removed development labels throughout Home, room/playlist headers, invitations, create forms, own-profile save text, notification responses and accessibility copy. Mock state behavior remains documented in code/docs.

## Shared action-feedback toasts

- Installed `react-native-toast-message` using Expo. `AppToast` centralizes warm rounded success/error/info cards, fonts, icons, safe-area positioning, tap/swipe dismissal, automatic hiding and Reduce Motion behavior. `showToast` is a small typed helper and announces messages to screen readers.
- Root layout renders one toast host after navigation. Native modals that trigger messages render an extra host only while visible, because native Modal content sits above the root UI. Toasts now cover profile saves/photo errors, friend requests, invitations, notification responses, playlist add/remove and room join/leave/suggestions. Action-choice dialogs remain alerts; no backend behavior changed.
- Simulator verified a friend-request toast and a toast above the invitation modal; typecheck/lint passed.

## Frosted-glass toast styling

- Shared toast now layers native `BlurView` beneath a translucent white gradient sheen, with a bright 1.5px white border and soft shadow. Inner surface clips blur to rounded corners; the outer container keeps the shadow visible.
- Left icon increased from 23px to 34px in a 52px translucent tile. Text stays sharp above the blur. iOS uses native backdrop blur; Android currently uses expo-blur’s translucent fallback without a BlurTargetView.


## Reference-inspired Home banner

- Added screen-local `HomeHero` immediately below the Home greeting/navigation header. Existing Find your next / music room headline now sits on an orange SVG banner with an upper-left diagonal cut, rounded lower-right step, fine record/grid graphics and music-note badge. Search stays directly underneath.
- SVG supplies scalable decorative shapes; native Text renders the accessible headline above it. No raster asset or dependency added. Typecheck/lint passed and Home visually reviewed in iPhone 17 simulator.

- Home banner simplified at user request: no outer white frame, icons or decorative graphics. Keep only the solid brand-orange cut-corner silhouette and existing headline.

## Masked video Home banner

- Installed SDK-compatible `expo-video`. User’s 10-second MP4 is bundled as `assets/videos/cuevo-home-collaboration.mp4`; original root file preserved. FFmpeg removed audio and resized to 960px, reducing the asset from about 5MB to 1.3MB. A still poster handles initial loading and Reduce Motion.
- `HomeHero` reuses its exact SVG path as a MaskedView alpha mask. Video, poster and three native radial gradients are clipped together. Deep burnt-orange/charcoal gradients protect the cream headline, with warm light at upper right. Native Text remains outside the decorative mask for accessibility and sharpness.
- `useVideoPlayer` handles the native player lifecycle. Loop/mute and mixing preserve other audio; `useFocusEffect` and AppState pause outside focused/active Home. Android textureView allows video composition with the mask. Playback controls are hidden.
- Typecheck/lint passed; iPhone 17 simulator verified video image and clipping. This decorative clip does not implement room/music playback.

Home video overlay revised by user: bright brand-orange wash at 76% plus peach/tangerine/coral radial mesh layers, reducing video visibility to roughly 20% or less. No brown/charcoal overlay or dark text shadow. Simulator visually checked; typecheck/lint passed.

## Filled icons

- User prefers filled icons throughout the app. Replaced all 27 Ionicons outline variants with their filled names across navigation, forms, profiles, notifications, room activity, playlists, menus and toasts. Vote chevrons now use filled caret triangles. Validated names against the installed Ionicons glyph map; typecheck/lint passed. Preserve the filled style in future UI.

## Account recovery and email verification views

- Added ForgotPasswordForm, ResetPasswordForm and VerifyEmailForm inside the existing AuthModal. Signup checks email/password and opens verification before profile setup; Forgot password is now connected from Login. Confirmation and code-error states stay inside these three views.
- `AuthField` shares field styling and filled icons for email/password/six-digit inputs. New-password fields can toggle visibility; reset validates matching passwords. Resend uses a cleaned-up timeout and preserves cooldown between request and reset.
- UI-only challenge code is 123456, expires after 15 minutes, resend cooldown 30 seconds. No emails sent, server passwords changed or real verification performed. Replace local checks with backend operations; see `doc/AUTH_UI.md`. Typecheck/lint and validation cases passed.

## Room and playlist creation

- Existing popup TextInput fields are controlled React state, just like web inputs. Submission trims the name and shows a native Text inline error when blank.
- Provider create functions prepend new items through functional state updates and return a unique ID for the existing dynamic detail route. This shares the item across Home and detail without adding a page. A ref guards repeated taps during navigation.
- New rooms have self as host and an empty queue; new playlists are private, self-owned and empty. State still resets on app reload. Typecheck/lint passed; created room and playlist detail states verified in Simulator.

## Six-character room invite input

- JoinCodeInput renders six controlled native TextInputs with a shared character array. ComponentRef types each input instance so refs can move focus, like DOM input refs in React web. Typing advances focus, Backspace on an empty box clears/focuses the previous box, and pasting a full code fills all six. Letters normalize to uppercase.
- Join accepts AAAAAA for the existing On Repeat room, updates shared membership and navigates to its detail. Other/incomplete codes show an error toast through a toast host inside the native modal. This is a temporary local test mapping.
- Typecheck/lint passed; simulator verified six boxes, error toast, lowercase six-A entry and successful joined room/count update.

- Join success feedback waits briefly for the native modal dismissal before showing on the root toast host, preventing the disappearing modal host from swallowing it.

## Rooms list grid

- HomeRooms now accepts a grid prop: Home keeps the horizontal carousel; Rooms reuses the cards and shared membership data in a wrapping two-column View. A vertical ScrollView provides scrolling and bottom padding clears the floating tab bar. New rooms appear in both places. Simulator layout verified; typecheck/lint passed.

## Rooms search and filters

- Rooms owns controlled search and role-filter state and passes them into the shared cards component. Search matches room name, song and artist without case sensitivity; role filters use live shared membership. No-result searches show an empty state.
- A flex row gives the search field remaining width alongside a 44-point filter touch target. Native Modal provides All/Hosted/Joined/Available choices, selected feedback, backdrop/Back dismissal and reset.

## Room queue rules and lifecycle — 2026-11-20

- Queue state moved into MockRoomsProvider, alongside membership, to preserve tracks, votes, playback and ended status across navigation for the session. A pure updatePlayback function enforces permissions and ended-state guards independently of visible controls.
- Each track has a stable ID, suggestion order, existing score and one current-user vote (-1/0/+1). QueueVote is controlled; sorting uses total score then original suggestion order, with the current song pinned. Reordering cannot reset votes because identity uses IDs.
- Host controls remove songs with confirmation, skip the final song to finish the queue, start/pause playback, and end the room with confirmation. An exhausted queue remains open; new suggestions wait for the host to start. Ended rooms stay viewable and block membership changes, voting, suggestions, removal and playback.
- A local one-second clock simulates track duration/completion and advances queued songs; no audio/provider integration exists yet. New suggestions after exhaustion do not autoplay. All state still resets on app reload.
- Pure logic checks passed for ranking/pinning, repeated votes, switching/withdrawing, stable ties, role permissions, natural final-song completion, manual restart, removal and ended read-only guards. Typecheck/lint passed. Simulator accessibility inspection confirmed host controls and participant-only controls; screenshot capture timed out, so full visual regression remains outstanding.

## Edit playlist details — 2026-11-20

- Owners have an Edit action in the existing detail top bar. EditPlaylistModal mounts on open, initializing an independent draft for name, description, visibility and song-editing policy. Cancel/unmount discards that draft; Save validates a trimmed required name and updates the shared provider. Limits are 60 characters for name and 300 for description.
- Song-edit policies are owner, invited collaborators or everyone (public playlists only). Switching to private replaces everyone with collaborators. Provider guards protect both owner-only metadata changes and song mutations; permission labels and buttons use the same policy helper. No new route or dependency added.
- Typecheck/lint passed; Simulator accessibility inspection confirmed editor fields and selected visibility/policy controls. Shared edits remain session-only and real access requires backend enforcement.

## Home account popup — 2026-11-20

- Home avatar opens AccountMenuModal instead of directly navigating. Home owns mutually exclusive account/notification visibility and uses the measured header/safe-area position for both.
- Popup matches notification styling, native-driver spring and Reduce Motion behavior; backdrop/native Back/accessibility Escape dismiss it. Profile, Rooms and Playlists navigate; Settings and Help render sections within the same popup.
- Settings links to profile editing and playlist preferences. Help explains existing room/vote flows. Log out dismisses navigation history and replaces the route with Welcome; there is no authentication token to revoke and shared local session data is not reset.
- Typecheck/lint passed. Simulator confirmed avatar opens the menu and its six utilities. Additional interaction was interrupted by concurrent user activity.

## Clean account menu and dedicated utilities — 2026-11-20

- Account popup now contains only plain filled icons beside Profile, Settings, Help & about and Log out. Removed avatar/name, menu heading, icon tiles, Rooms/Playlists links and inline utility panels.
- New /settings and /help routes render separate screens with a shared safe-area/back-header/keyboard-aware UtilityPage wrapper. Settings includes Edit profile, Change password form, Linked accounts status, per-field Profile visibility and configurable Server address. Help contains product guidance, not playlist-management duplication.
- Subject PDF read with native PDFKit: V.1 requires social linking, public/friends/private profile information and music preferences; V.5 requires configurable backend address. Those justify the additional settings.
- SettingsProvider holds privacy choices and validated HTTP(S) address for the session. No API client exists yet, so address is not used for requests. Profile privacy enforcement and social linking remain backend work. Linked accounts accurately display Not connected without pretending to perform OAuth. Change password validates current/new/confirmation and renders local confirmation only; no credentials are stored or changed.
- Typecheck and lint passed; Simulator confirmed the four-row menu. Page interaction was interrupted by concurrent user activity; full visual QA remains outstanding.

## Password keyboard crash diagnosis — 2026-11-20

- User-supplied Expo Go crash and simulator logs show native SIGABRT from NSRangeException: index 3 beyond bounds [0..2] in UIInputSwitcherView localizedTitleForItemAtIndex, reached while the keyboard-language switcher builds its menu. This proves the immediate native failure, not a JS validation error; the precise OS trigger/root cause is unconfirmed.
- Simulator has multiple English/French/Arabic/Emoji input modes. Avoid switching keyboard languages while a secure field is focused as a temporary workaround; no keyboard preferences or simulator runtimes were changed.
- Corrected a separate AuthField issue: Current password now uses password semantics, new/confirm use newPassword, and iOS textContentType is no longer set alongside autoComplete. React Native docs advise using only one. These corrections are not a proven fix for the UIKit switcher crash. Typecheck/lint passed; Expo Go reopened.

- Home notification/account popups use window width minus 40 points, preserving equal 20-point side margins rather than capping panel width.

## Session documentation saved — 2026-11-20

- SESSION_HANDOFF.md now contains the consolidated November 19–20 implementation, decisions, restart workflow, validation evidence and known keyboard crash. The prior November 18 handoff was preserved in SESSION_HISTORY_2026-11-18.md. UI_PROGRESS, README, PROJECT_PLAN status and LOCAL_DEVELOPMENT date were reconciled. No app/simulator shutdown, commit or push requested or performed as part of this documentation task.

## Notification appearance — 2026-11-20

- Notification rows reserve two message lines and a 44-point action footer, keeping their height consistent before and after responding. `justifyContent: 'flex-end'` aligns footer buttons to the right, like flexbox on the web.
- Decline has a transparent background and light gray outline; unread rows use light gray. All type icons are gray badges positioned absolutely at the image’s bottom-right, relative to the avatar wrapper.
- Explicit actor IDs resolve friend avatars from account data (initial fallback when no photo exists). Room/playlist rows use the bundled generated record photo at mobile/assets/covers/notification-default.jpg.
- Built-in imagegen prompt and asset provenance are recorded beside the cover. Typecheck and lint passed; visual device verification remains outstanding.

## Compact notification rows — 2026-11-20

- Replaced the notification action footer with a horizontal body: flexible text beside an 80-point action area. Check/close icons retain Accept/Decline accessibility labels, and response status uses a labeled icon. Removed unread dots; light gray backgrounds still indicate unread items.
- Two message lines remain reserved for consistent compact row heights. Icon buttons are 36 points with 4-point hit slop; the decline background remains transparent with a light gray border.

## Home search modal — 2026-11-20

- Replaced the home search placeholder with a header search icon beside notifications. HomeHero remains in the scroll content, and opening search closes the account/notification popups.
- SearchModal uses a full-screen native Modal, SafeAreaView and KeyboardAvoidingView. Its top TextInput focuses via a ref on modal show; close, Android Back and accessibility Escape dismiss and reset the search.
- Search filters current room and playlist names from shared providers and opens results through Expo Router. Keyboard-aware scrolling keeps results tappable. This searches the current local data; no backend search added.

## Header controls, input typography and universal search — 2026-11-20

- Header search/notification buttons have light gray borders and a dedicated flex row with a 6-point gap, independent of the avatar/greeting spacing.
- Added fonts.input using the platform system sans-serif and explicit zero letter spacing across general editable fields (search, auth, profile, settings, create/edit). Display text keeps Lufga. Verification-code spacing remains intentional. This removes the shared custom font from affected inputs; the exact reported rendering issue still needs device comparison.
- Home search now matches room names, playlist names/descriptions, song titles/artists/albums/genres and profile display names/usernames. Matches support multiple terms and ignore Latin accents. Current self-profile edits and newly created rooms/playlists come from shared state.
- Results open room/playlist/profile routes. Song results display cover, artist, album, duration and genres inside search, with a link to their Apple Music source and Back to results. Search remains limited to the app's current local catalog/accounts; no remote discovery service exists yet.
- Typecheck and lint passed. Device visual verification remains outstanding.

## Search result artwork — 2026-11-20

- Removed trailing result chevrons. The left tile now shows song artwork, the existing PlaylistCover collage, the room's existing banner gradient, or a person's avatar. Rooms without a banner and empty playlists use the generated default record cover; missing/failed avatar photos use the default mascot.
- A small gray result-type badge sits absolutely at the tile's bottom-right, outside the artwork so rounded image clipping does not cut it off. Image load failures fall back to bundled artwork.
- Typecheck and lint passed; no device visual check performed.

## Grouped search results — 2026-11-20

- Search results now render under Rooms, Playlists, Songs and Profiles headers; empty categories are omitted. Each category filters the existing result list and preserves its artwork, badges and tap action.
- Removed row dividers and reduced vertical row padding from 12 to 6 points. Section headers have accessibilityRole="header" for screen-reader navigation.
- Typecheck and lint passed.

## Dedicated song route and search inset correction — 2026-11-20

- Song search results now close search and navigate to /song/[id]. SongScreen uses the shared safe-area/back-header UtilityPage, showing artwork, artist, album, duration, release year, genre tags, the Apple Music source link with error handling, and links to containing playlists. Missing IDs render Song unavailable.
- Removed the inline selected-song state/details from search. File-based routing keeps the page addressable directly and gives it normal Back behavior.
- Search now applies explicit window safe-area padding from useSafeAreaInsets to its full-screen modal root instead of relying on the native SafeAreaView across the modal presentation boundary. The header sits outside KeyboardAvoidingView; only results resize for the keyboard. This addresses a plausible cause of the reported intermittent top-edge placement, but the original issue has not been reproduced/confirmed fixed on device.
- Typecheck and lint passed. Simulator inspection was unavailable because CoreSimulator access failed in the sandbox; repeated-open/keyboard visual verification remains outstanding.

## Fading home navbar — 2026-11-20

- Home's fixed header now overlays scrolling content with a white-to-transparent native backgroundImage gradient, extending 20 points below the controls for a soft edge. Its decorative layer ignores touches.
- Scroll content reserves the measured header height plus top safe-area inset so the initial hero position remains stable. Content scrolls underneath the fade; account/notification popup positioning still uses the same header measurement.
- Typecheck and lint passed.

- Home navbar fade adjusted to stay fully white through 80% of its background, fading only over the final 20%. Controls have no opacity applied. Typecheck and lint passed.

## Soft blur beneath home navbar fade — 2026-11-20

- HomeNavbarBackdrop adds a masked native BlurView under the existing white gradient. The first 80% stays solid white; the final 20% reveals a soft blur that fades smoothly to clear. Header controls render above the effect and remain sharp.
- Home scroll content is wrapped in BlurTargetView for Android sampling. The blur renders after its target, uses the existing masked-view adapter pattern and ignores touches. Android 12+ uses the efficient blur method; older Android falls back to the white fade/tint.
- Typecheck and lint passed. Visual device verification remains outstanding.

## Solid home navbar restored — 2026-11-20

- User reverted the navbar fade/blur trial. Home navbar is now solid white, including the top safe area. Removed HomeNavbarBackdrop and the home-only blur target/ref. Header controls, scroll spacing and popup anchors remain intact.
- Typecheck and lint passed.

## Welcome characters over Lottie — 2026-11-20

- Bundled the selected transparent trio PNG as mobile/assets/illustrations/cuevo-listening-together.png. WelcomeCharacters renders after the Lottie and its edge blur, keeping the characters sharp in front of the moving ribbon.
- An absolute overlay preserves the existing hero/copy layout. Image resizeMode="contain" preserves proportions, and a native alpha mask fades the lower portion smoothly to transparent, revealing the animation and page behind it instead of painting a white patch. The decorative layer ignores touches and is hidden from accessibility.
- Existing PNG pixels remain unchanged; fade is applied at render time. Asset provenance is recorded beside the image. Typecheck and lint passed; device visual verification remains outstanding.

## Lower welcome artwork and complete bottom fade — 2026-11-20

- Lowered the character overlay by 32 points. Its mask now matches the PNG's actual 1225/1284 aspect ratio, instead of masking a full-height container with variable contain-mode empty space.
- Fade starts at 45% of the photo, reaches full transparency by 88%, and stays clear to the bottom. This removes the solid crop line before the hero clips the image. Alpha reveals the existing peach/coral/lavender background and ribbon directly; no white fade layer is used.
- Typecheck and lint passed; device visual verification remains outstanding.

## Three illustrated introduction pages — 2026-11-20

- Generated three 887 × 1774 transparent PNG illustrations with built-in imagegen, using the selected welcome trio as the identity/style reference: listening together, building playlists and voting for the next track. Assets and exact prompts are in mobile/assets/illustrations/cuevo-intro-{discover,playlists,vote}.png and INTRO_PROMPTS.md.
- IntroductionScreen now uses a slide configuration with artwork and copy for all three steps; previous steps two/three were empty. Artwork fills the window height with its 1:2 aspect ratio and overflows the right by 24% of screen width. Copy stays in a left column and renders above the illustration. User explicitly rejected a left fade: final artwork uses no mask, fade or opacity.
- Kept the orange background and set its base to brand #FF4D24. Three progress segments track the current page; Back moves to the previous step (or prior route on step one), and Explore Cuevo opens Home. Compact typography applies to smaller windows; text remains scrollable above the fixed action.
- Simulator inspected all three rendered pages and confirmed Next advances with the matching artwork/copy. Narrowed descriptions to avoid dark clothing and removed a stranded title punctuation mark found in visual QA. Typecheck and lint passed.

## Centered introduction composition — 2026-11-20

- Replaced the narrow left typography with a centered top block: small category label, one dark headline line, one cream headline line, and a short centered description. Removed forced word-by-word line breaks and the large gap between phrases.
- Illustrations are centered visually, enlarged to 125% of window width and lowered to 30% of screen height (34% on compact screens). Their legs extend below the viewport so feet are hidden. Images remain fully opaque without fades. Next/back/progress controls remain usable above the artwork.
- Checked all three steps in the iPhone 17 simulator: headings and descriptions remain above the characters, no feet visible. Typecheck and lint passed.

## Mixed typography and drawn accents — 2026-11-20

- Intro headings now pair bold Lufga with a larger Caveat handwritten subtitle, tilted slightly with its own line height and zero inherited tracking. Caveat Regular is bundled locally with its SIL OFL license and loaded by the existing root fontAssets/useFonts setup.
- IntroductionDoodles uses native SVG paths for a looped arrow, hashtag/star, loose underline and short accent strokes. Pale yellow complements the orange/cream/charcoal palette. Decorative vectors ignore touches and are excluded from accessibility; headline groups expose one combined label.
- Lowered artwork slightly to keep the larger type and description clear. No fade or transparency added to characters. Simulator verified all three final compositions with the new font and artwork visible; typecheck and lint passed.
- Local Metro server stopped during inspection, causing artwork requests and a reconnect to fail. Restarted Expo on localhost:8081 with two workers and reopened /introduction; the app and illustrations loaded successfully.

## Handwritten lead-in above heavy main headline — 2026-11-20

- Reversed the type hierarchy: first phrase (Good music./Your favorites./Pick the next track.) is dark Caveat handwriting just above the main phrase, with a small negative bottom margin. Main phrases use cream Lufga Black, with no rotation. Added the existing bundled static Black face to fontAssets; no dependency/download needed.
- Preserved surrounding doodles and illustration layout. Compact font sizes keep the same hierarchy on smaller screens.
- Typecheck/lint passed. Reloaded Expo to load the newly registered font face and verified the heavy, unrotated main heading in the simulator.

## Uppercase main typography and bold symbols — 2026-11-20

- Main introduction phrases now use larger 43-point Lufga Black uppercase over two deliberate lines (36 points on compact screens). Handwritten lead-ins are reduced to 35 points (30 compact), have no rotation, and sit closely above the headline with a small negative margin.
- Removed the thin underline, sparkle and little accent strokes. Replaced them with a large heavy hashtag and a broad curved arrow, using 7-point pale-yellow SVG strokes closer to the supplied reference.
- Typecheck/lint passed; simulator confirmed the uppercase headline, straight smaller handwriting and bold symbols.

## Progress documentation saved — 2026-11-20 (welcome/search pass)

- Reconciled SESSION_HANDOFF, UI_PROGRESS, README, PROJECT_PLAN, BRAND and LOCAL_DEVELOPMENT with the current search/song/notification and welcome/introduction work. The previous handoff is preserved in SESSION_HISTORY_2026-11-20_EARLIER.md.
- INTRO_DESIGN_STANDBY.md retains its path but now describes the implemented three-page direction and explicitly marks the earlier standby/ink-cat/left-column/rotated-type designs as superseded.
- Final typography: large uppercase cream Lufga Black main phrase, smaller straight dark Caveat just above it; heavy pale-yellow hashtag/curved arrow, no underline. Intro images centered/low with feet hidden and no fade; initial Welcome keeps the trio-over-Lottie bottom fade.
- No commit, push, deployment, simulator shutdown or Metro shutdown requested/performed. Docs-only updates do not require rerunning app checks; the latest code typecheck/lint were already passing.

## Blue blur in room cards — 2026-11-20

- Home/Rooms card white details now contain RoomCardBlur: a cyan-to-blue curved SVG ribbon softened with FeGaussianBlur, following the supplied reference. Only the decorative shape is blurred; song text, vinyl and listeners render above it sharply.
- Like an absolutely positioned background in React web, StyleSheet.absoluteFill keeps the decoration out of layout. pointerEvents="none" passes touches through to the card. The lower rounded container clips the effect to the white area. useId gives each card independent SVG filter/gradient references.
- Uses existing react-native-svg with no added dependency. Typecheck and lint passed; device visual verification remains outstanding.

- Room card blur shifted 24 SVG units right and 15 down toward the bottom-right corner. Its three gradient colors now come from the card's banner palette: orange/peach, lavender, or gold. Created rooms inherit their orange banner palette. The SVG transform moves only the artwork while its clipping container stays fixed. Typecheck and lint passed; device visual confirmation pending.

## Diagonal banner corner — 2026-11-20

- Wrapped the Home/Rooms card banner in MaskedView with an opaque SVG polygon. The mask cuts an 18-unit diagonal across the bottom-right corner, connecting the right and bottom edges while revealing the white card underneath. Existing rounded top corners remain on the inner banner.
- A mask uses alpha to control visibility, like a CSS mask; it clips the banner gradient, glow and content together without a painted white triangle. Banner height and details layout stay the same. Typecheck and lint passed; device visual verification pending.

- Reverted the diagonal banner corner at the user's request. Removed the banner mask and restored its original straight bottom edge; retained the theme-colored bottom-right blur. Typecheck and lint passed.

## Subtle Home header grain — 2026-11-20

- Added a deterministic 128×128 transparent noise tile behind the Home navbar controls and top safe area. Warm dark speckles at low alpha and 0.55 layer opacity give the white surface a subtle paper grain. Image resizeMode="repeat" tiles rather than stretches it; absoluteFill keeps it out of layout. The decoration ignores touches and accessibility, and controls render above it sharply.
- Asset generated procedurally with Python's standard library; no dependency or runtime random drawing. Typecheck and lint passed; device visual confirmation pending.

- Header grain visibility correction: original tile's pixel alpha was only 0–21/255, making it faint even with layer opacity 1. Replaced it with a stronger tile (alpha 12–84/255 on 70% of pixels), using a new asset filename to avoid stale image caching. Preserved the user’s layer opacity of 1. Typecheck/lint passed; device appearance still needs review.

- Corrected grain placement after user clarification: “header” means the HomeHero video card, not the top navigation. Removed the navbar texture and placed grain above the video's orange/mesh washes inside its existing SVG mask. This clips grain to the shaped card and keeps heading text sharp above it. Typecheck/lint passed; visual confirmation pending.

- Grain coverage fix: the bundled PNG has intrinsic image dimensions; absolute edge offsets alone left a square texture patch. Set the grain Image's width and height explicitly to 100% of the video card media container, keeping repeat mode and the outer card mask. Typecheck/lint passed; device coverage confirmation pending.

- Removed the Home video card grain at the user's request, including the overlay, its style and both unused generated noise tiles. Original video and orange mesh treatment remain. Typecheck/lint passed.

## Cleaner room cards — 2026-11-20

- Removed the top-left Host/Visitor/Joined/Ended visual tags from Home/Rooms cards. Moved the disc/title/artist row up 5 points with a smaller top margin; increased its bottom margin by the same amount to preserve listener positioning. Typecheck/lint passed.

## Room creation visibility and genre — 2026-11-20

- Create room now asks for name, Public/Private visibility and one genre using wrapping choice chips (Mixed by default). Playlist/join forms remain unchanged. Options use radio accessibility state and 44-point minimum targets; the existing scrollable keyboard-aware modal accommodates the extra fields.
- RoomOptions carries visibility/genre into the existing in-memory rooms context. Room screen reads those values and the header displays the selected genre and PUBLIC/PRIVATE instead of hardcoded public. Back resets form choices. Private access requires backend enforcement when real discovery/invites are connected; local metadata alone is not access control.
- Typecheck/lint passed. Device visual verification pending.

## Modal button shadow clearance — 2026-11-20

- Create/join/playlist creation and playlist editing scroll content now reserves 28 points below the final primary button. Their scroll viewports extend into the sheet's horizontal padding while matching content padding preserves field/button alignment, giving side shadows room to render.
- Shared AuthModal uses the same viewport/content gutter pattern with extra bottom clearance, covering login/signup/profile/verification/password forms. ScrollView clips at its own bounds, so padding outside the viewport cannot protect a child's shadow; padding must be inside its scroll content. Shared button appearance remains unchanged.
- Typecheck/lint passed; device visual verification pending.

## Shared frosted modal surfaces — 2026-11-20

- Added ModalSurface: a background-only light BlurView at intensity 18, warm translucent wash and thin white border. Only this decorative layer clips to the modal corners, keeping content sharp and retaining button shadow clearance.
- Applied to all nine custom native Modal declarations: shared account/auth flows, create/join/playlist forms, invitations, add songs, edit playlist, room filters, account menu, notifications and search. Search now uses a transparent full-screen modal so its frosted surface can reveal the underlying screen. Native system Alert dialogs remain OS-managed.
- Existing Expo blur dependency reused; verified SDK 58 docs. iOS uses native background blur; Android native modals currently use a translucent light fallback because they have no in-window BlurTargetView. Do not claim Android background blur is implemented by this surface alone.
- Typecheck/lint passed; on-device appearance verification pending.

## Playlist card visibility icons — 2026-11-20

- Home and Playlists cards now show only an 18-point globe/lock at the top right, replacing the smaller icon plus Public/Private text. Reserved right-hand text space to avoid overlap. Visibility remains in card accessibility labels; collaborator information stays visible. Typecheck/lint passed.

## One shared playlist card — 2026-11-20

- Extracted the exact Home card markup, styles, navigation and accessibility into screens/playlists/components/PlaylistCard.tsx. It accepts a Playlist prop and derives creator/track/collaborator display information itself.
- HomePlaylists and PlaylistsScreen both render this component. Removed the separate Playlists-page card and its styles; search and page headers remain page-specific. This is ordinary React composition: one component owns the design, so future card edits update both screens.
- Typecheck/lint passed.

## Song navigation across the app — 2026-11-20

- Song rows in playlist details, room queues, Add Songs search results, and the current-song area of Home/Rooms cards now open /song/[id]. Global search already did. Add/remove/options/vote controls remain separate actions; Add Songs dismisses its native modal before navigation. Room card song presses stop propagation so they open the song rather than the room.
- Queue entry IDs such as seed-0 are not recording IDs and vary between rooms. queueSongId resolves title/artist to the existing catalogue ID, or a stable queue-song ID for local songs missing from the catalogue. SongScreen renders those local songs with their existing title, artist, duration and a generic music illustration rather than an unavailable page or invented metadata. Suggestion metadata is shared with the fallback lookup.
- Typecheck/lint passed. A Node assertion check verified all five queue songs across every initial room order and the suggested One More Time resolve to the correct recording and stable ID. The check uses TypeScript-first resolution to match Metro (plain Node otherwise resolves songs.json before songs.ts). Tap-through verification on device remains pending.

## Search-first room and playlist pickers — 2026-11-20

- Added SearchPickerModal as the shared frosted modal frame: search/close controls occupy the very top, heading follows, and only results scroll. Safe-area and keyboard avoidance apply to the frame. Each open mounts a fresh query state; empty/whitespace queries show only a typing hint, never suggested items.
- SongPickerModal supplies searchable catalog rows and separate add controls for both room suggestions and playlist Add Songs. Clicking artwork/title still opens Song detail after closing the modal. Existing songs are disabled/checkmarked. InvitePeopleModal reuses the frame for room and playlist invitations, searching eligible nonmembers by name or username without an initial people list. Invitation delivery remains local preview behavior.
- Replaced room Suggest's one-song alert with the catalog picker. QueueAction now carries a catalog songId, validates it, prevents duplicates against both seeded and catalog queue entries, and preserves role/ended guards. QueueTrack stores the selected songId so navigation and duplicate checking use recording identity, not queue-entry IDs. Empty queues still wait for manual host playback start.
- Typecheck/lint passed. Pure assertions checked all 40 catalog additions, stable page IDs, invalid IDs, duplicate/seeded duplicate prevention, visitor/ended guards and current-song pinning.
- Simulator verified room Suggest opens empty, searching Levitating adds it and disables its add button, reopening resets the query; room Invite opens empty and username inesoul finds Ines; playlist Add Songs opens empty and searching Labess shows matching artwork rows with existing songs disabled. Inspected the fixed-search invitation layout visually. Playlist invitation's separate tap-through was interrupted by concurrent user navigation; it uses the same verified shared invitation component. Software-keyboard/small-screen QA remains.

- Picker layout correction: all shared song/invite modals now place the title at the very top with Close on its right, then a full-width search box directly below. Both header and search remain outside the scrolling results. Invite avatars now match song artwork exactly: 46×46 with 11-point rounded-square corners. Typecheck/lint passed.

## Light-theme payment page — 2026-11-20

- Built /payment as the first subscription-related page, based on the supplied payment reference. Uses warm off-white background, peach/orange gradient Mastercard illustration, thin warm borders, 26-point card/form corners, 15-point inputs and the existing orange PrimaryButton. Chip/contactless details are native SVG; no raster artwork or new dependency.
- Settings now has Billing → Payment. Centered header/back button, keyboard avoidance and scroll padding keep form and button glow usable. Add payment card clears the local form and focuses cardholder name. Card number/expiry inputs format locally, CVV is concealed, and the illustrated card shows only the last four entered digits.
- UI only: Pay now is disabled. No payment SDK, requests, billing, persistent card storage or successful-payment simulation added. Future real collection should use the chosen payment provider's supported input/tokenization flow; do not persist raw card details or CVV.
- Ref typing uses ComponentRef<typeof TextInput> for the installed React Native declarations. Typecheck/lint passed. Simulator verified Settings navigation and the rendered full light-theme page, including uncropped primary-button glow. Left the simulator on Payment.

- Payment page scope clarified: this screen only adds an account payment method. Renamed heading to Add payment method and main action to Save payment method. Removed redundant Add payment card/reset action and updated Settings entry. Saving remains disabled pending provider/backend integration; no charge or raw-card persistence added. Typecheck/lint passed.

- Payment-method back button now matches other utility pages: plain arrow with a 44-point touch target, no background or border. Typecheck/lint passed.

## Cuevo Plus offer page — 2026-11-20

- Added /subscription, linked from Settings → Billing → Cuevo Plus. Reference-inspired composition uses a light warm canvas, centered headline/benefit pills and a rounded white footer with the requested 99 DH price and shared orange Continue button.
- Background is native SVG: broad curved orange, peach and golden strokes around the upper-left/lower-right edges, softened together with FeGaussianBlur (stdDeviation 30). Center stays pale for text contrast; decorative background ignores touches. No generated bitmap or dependency added.
- Hero content scrolls independently above the price/footer; safe-area spacing protects header/footer controls. Continue opens the existing account payment-method page; it does not purchase or activate a plan. No trial, discount, annual toggle or billing period is invented. Higher playlist/room capacity remains proposed benefit copy until entitlements are finalized.
- Typecheck/lint passed. Simulator visually verified layout, corner gradients, 99 DH and Settings navigation. Left simulator on the Plus page.

## Sayidati payment-card cover — 2026-11-20

- User paused Plus-page design and requested the supplied CIH Sayidati cover for the existing payment-method preview. Used the explicitly requested imagegen skill and built-in image edit tool; saved the generated cleaned reference in mobile/assets/cards/cih-sayidati-cover.png, with provenance and exact prompt beside it.
- Image keeps CIH and Arabic/Latin Sayidati branding and floral design, removing baked-in sample details and Mastercard circles. Existing card dimensions/radius remain; chip, contactless, Mastercard and live masked number/name render as separate native overlays. Added a non-padded absolute background wrapper after simulator inspection caught percentage image sizing leaving an inset.
- Typecheck/lint passed; Simulator visually confirmed full-edge coverage, branding and live text overlays. No form values were stored or transmitted. Plus page remains on standby; no further gradient revision made.

## Plus username badge asset — 2026-11-21

- Generated a transparent orange/gold rounded sparkle badge using the imagegen skill and built-in tool. Saved at mobile/assets/badges/cuevo-plus.png with exact prompt/provenance alongside it. Intended render size is 16–20 points beside active subscriber names. No user subscription status or screen integration changed in this asset-only step.

## Data-driven verification and Plus badges — 2026-11-21

- Added explicit subscriptionActive booleans to all account fixtures; self and Sara are active subscribers and verified. No badge rendering branches compare names/IDs to decide subscriber eligibility. Current-account status is exposed separately from editable profile fields by ProfileContext, keeping badges intact during profile edits.
- Shared AccountBadges renders the existing verification check and generated transparent Plus PNG only when the corresponding data flags are true. Used in own/public profile headers, Home greeting, universal profile search results and room/playlist invitation search rows. Search accessibility labels include status; text shrinks while badge groups retain their size.
- Fixture assertions, typecheck/lint passed. Simulator verified own-profile status, Sara's profile and search badges visually, and Home status via accessibility. Invite rows share the same component; no backend entitlement activation was implemented.

- Badge styling revised at user's request: Verified uses a white check inside a brand-orange square with a small 22%-of-size corner radius. Subscription uses a compact peach/gold bordered PLUS text badge with matching corners. Shared AccountBadges updates all placements while retaining data-driven status. Generated PNG retained as an unused design asset. Typecheck/lint passed.

- Subscription badge now keeps the generated sparkle icon alongside PLUS text inside the same softly rounded badge. Shared rendering updates every placement. Typecheck/lint passed.

- Plus badge background/border now use colors.primary, matching the verified badge; PLUS text is white and the generated sparkle remains alongside it. Typecheck/lint passed.

- Subscription sparkle uses Image tintColor #FFF2DA (warm white) for contrast on the orange badge. Tint recolors visible PNG pixels at render time while preserving alpha; source artwork remains unchanged. Typecheck/lint passed.

## Home Plus promotion — 2026-11-21

- Converted HomeHero's existing orange masked video banner into a Cuevo Plus promotion: warm-white sparkle/label, Make room / for more music headline, Explore Plus CTA and 99 DH. Existing video, mesh treatment, focus/app-state playback and Reduce Motion behavior remain.
- CTA is a separate 44-point Pressable that opens /subscription; no plan activation or billing occurs. Increased banner minimum height to 224 for the extra content, preserving the shaped outline and card corner style. No billing period or trial invented.
- Typecheck/lint passed; simulator visually verified banner layout and observed the existing Plus destination after navigation. Plus offer-page gradient remains unchanged/on standby.

## Native room now-playing header — 2026-11-21

- Replaced RoomHeaderCard's notched SVG background and Lottie turntable with a regular rounded peach card showing room identity, current song title/artist, native vinyl with centered catalog cover, elapsed/duration progress and playback controls. Song details still link to Song. Missing catalog artwork uses a music-note fallback rather than unrelated artwork. Empty, queued-but-not-started, paused and ended states have explicit labels.
- RoomRecord uses native Views/Image/Animated: concentric groove borders, sheen and circular artwork; nine-second linear native-driver rotation, cleaned up on blur/unmount, paused with playback/background and disabled for Reduce Motion. No Lottie or added dependency for this header.
- Moved play/pause/next from the floating bottom host bar into the header, with restart and tap-to-seek plus accessible ten-second adjustments. Participant/visitor controls are read-only/disabled. Queue reducer adds finite clamped host-only seek and retains ended/empty guards; clock and audio remain local simulation, not actual playback.
- Typecheck/lint passed. Pure assertions verified host-only toggle/next/seek, seek bounds/invalid values, paused clock, empty/ended guards, ticking and next reset. During incremental editing, Fast Refresh briefly mounted the new header with the old parent props and showed a render error; the final parent passes playback and handlers correctly. Simulator subsequently returned to account flow during concurrent user activity; final room visual/tap-through verification remains pending. Did not interrupt account entry.

- Room header background refinement: replaced the full peach linear fill with white and a reference-inspired curved orange cloud. Native SVG strokes create a pale peach upper-left sweep and a stronger orange hook at the lower right, softened with Gaussian blur. Separate rounded background layer ignores touches and keeps foreground sharp. This pass changes only background; further header simplification is deferred. Typecheck/lint passed; visual review pending.

- Room header background revised to the newer reference: mostly white upper area, a broad orange sweep running from lower left toward the right, and a yellow glow on the left. Native blurred SVG strokes/ellipses supply the colors. A deterministic transparent 256px noise tile adds fine grain at 0.4 opacity, filling an unpadded absolute wrapper to prevent the previous square-patch sizing issue. Grain applies only behind card content, not to text/record/controls. Typecheck/lint passed; simulator visually verified full card coverage, color placement and grain.

## Local Colorflow video trial — 2026-11-21

- Bundled the user-downloaded root colorflow-animation.mp4 as mobile/assets/videos/cuevo-room-gradient.mp4 (H.264, 1920×1440, three seconds, about 2.9 MB); retained original. Extracted its first frame as cuevo-room-gradient-poster.jpg using ffmpeg.
- RoomHeaderBackground now renders the actual muted looping video edge-to-edge inside the existing rounded clipping layer, replacing the SVG/noise composition. Native song details, vinyl and controls stay above it. Uses existing expo-video, with textureView on Android, no controls/touches, and pauses on screen blur/background. Reduce Motion or initial loading shows the local poster.
- Typecheck/lint passed. Simulator verified full-card video rendering and rounded clipping. No wash added so the user can assess the original export. Native audio playback remains unrelated/simulated.

## Room header contrast and progress placement — 2026-11-21

- Header labels, icons and progress now use white against the orange video; the white play button uses an orange icon. The unfilled progress track uses translucent white.
- Moved the seek bar and time labels after the controls in JSX so they sit at the bottom of the card. React Native Views stack children vertically by default; JSX order controls this layout, like a web flex column. Playback and seeking behavior stay the same.

## Room queue artwork — 2026-11-21

- RoomQueue resolves each recording through queueSongId and renders its actual bundled cover with React Native Image. Missing sample artwork is bundled separately with Apple catalog provenance. resizeMode="cover" fills the existing 76-point thumbnail like CSS object-fit: cover; overflow: hidden clips its rounded corners. Unknown recordings use a music-note fallback.

## Room title in the navigation bar — 2026-11-21

- Moved the room name and visibility icon from RoomHeaderCard to the screen’s top bar, replacing the membership role label. Host/genre metadata remains inside the card. The title uses a single line with flexShrink so long room names truncate while leaving space for the back and room action buttons.

## Home visibility design rule — 2026-11-21

- Home lists public and private rooms/playlists regardless of membership. Private items display a lock; public items have no visibility icon, including detail headers. Visibility remains in accessibility descriptions. This is a listing rule; no access or edit permissions changed.
- Added After Hours (private room hosted by Sara) and Inner Circle (private playlist owned by Sara), both with no self membership, to exercise the rule. Room cards read visibility from shared room state, so newly created private rooms get the same lock.

## Room card song interaction — 2026-11-21

- Replaced the nested song Pressable in HomeRooms with a plain View. Song artwork/text now belong to the outer room card touch target, so tapping them opens the room. The shared component applies this behavior to both Home and the Rooms grid.

- Rooms filter button now has a solid gray border and rounded corners, using a separate style so the modal close button keeps its existing appearance.

## Room discovery controls — 2026-11-21

- Replaced role/status filters with independent sorting (default, most/fewest participants, genre A–Z) and a genre picker derived from room metadata. Sorting uses current participant counts; multi-genre rooms match each listed genre. Search combines with both controls. Reset filters preserves the search query. The modal stays open for combined selections and Show rooms closes it. Home retains its default order.

- Genre filters now use a horizontal ScrollView with rounded pills and a dark selected pill/checkmark, matching the supplied reference. Horizontal scrolling keeps the choices on one swipeable row while preserving 44-point touch targets and radio accessibility states.

- Sort by now uses a collapsible dropdown showing the current choice and chevron. Selecting an option closes the dropdown; expanded accessibility state tracks whether its choices are visible. Genre pills remain below it.

## Plus checkout and saved payment methods — 2026-11-21

- BillingProvider shares masked card summaries and selection between Settings, payment entry, and checkout. Seeded a masked Visa ending 4242 (12/29) for the current fixture. State lasts for the current app session; full card numbers, cardholder names, CVVs and provider tokens are never put in context, files or logs. Production requires provider tokenization and account-backed storage.
- Plus Continue skips payment entry when an unexpired saved method exists; otherwise it passes a subscription return parameter. Saving validates card number checksum, expiry and security-code format, keeps only the summary, clears form values and returns to review or Settings. Saving never charges or activates Plus.
- New /subscribe route shows Cuevo Plus, 99 DH total, saved-method selection and an add-method action. No billing period or trial was invented. Subscribe reports unavailability because no payment service is wired; no success or entitlement is simulated. Existing account subscription fixtures remain unchanged.
- Settings Payment methods expands to show masked cards and expiry, selection, confirmed removal and an add action. Expired cards stay visible but cannot be selected for checkout; a usable fallback is selected when needed. The same list component is reused in review.

- Validation: lint/typecheck and pure assertions passed for checksum, expiry boundaries, invalid dates/security-code format and masked summaries. Simulator verified saved-card Continue → review, Settings saved-card list/removal/empty state, no-card Continue → add payment, and saving synthetic 4242 details → review with the selected masked card. Reviewed both new layouts visually. Card summaries remain session-only; no payment or subscription entitlement was created.

- Verified badge now uses a native SVG scalloped seal and rounded white check, inspired by the supplied reference while retaining brand orange. A shared viewBox scales the vector at every existing badge size; AccountBadges keeps the same eligibility and accessibility label. Plus badge styling is unchanged.

## Home card skeleton preview — 2026-11-21

- Added reusable HeroCardSkeleton, RoomCardSkeleton and PlaylistCardSkeleton matching Home’s three card layouts. Hero shares the existing SVG silhouette with the actual promotion. Neutral blocks stand in for artwork, text and listeners; placeholders expose one loading accessibility state and no fake card actions.
- Home shows placeholders for 2000ms on each screen focus, then mounts the existing content. Leave Home and return to replay; the timer is cleaned up on blur/unmount. HOME_LOADING_DELAY_MS is deliberately separate from data logic for replacing this preview with actual loading later.
- SkeletonPulse drives one native opacity animation for all placeholders, stops on cleanup/background and stays static with Reduce Motion. Header/navigation remain usable while cards load.

- Simulator visually verified all three skeleton layouts together on Home and confirmed they resolve to the existing content after the delay. Lint and typecheck passed.

- Skeleton scope corrected: Home greeting and Plus promotion are static/local and render immediately. Only room and playlist sections use the two-second loading preview. Removed the unused hero skeleton and its shared shape extraction.

## Full-screen search loading — 2026-11-21

- Search results now show skeleton rows matching their 46-point artwork, type badge and two text lines. The search field and close/clear controls stay live; an empty search shows the existing hint immediately.
- Each changed nonempty query starts a two-second preview delay. Loading is derived from the current query versus the completed query, so stale results and premature empty messages stay hidden. Effect cleanup cancels old timers on typing, clearing, closing and unmount. The shared pulse accepts a search-specific accessibility label.

## Rooms and Playlists loading previews — 2026-11-21

- Both pages now show their matching card skeletons on initial mount and after every search input change, including clearing the input. Static titles, search fields and room filter controls remain visible and usable. Results and empty states appear only after the two-second delay.
- Shared useSimulatedSearch tracks each query change with a revision, so typing back to an earlier query still restarts loading. Effect cleanup cancels superseded/unmounted timers. Room placeholders follow the existing two-column grid; playlist placeholders follow the existing row spacing. Existing sorting, genre filtering and result navigation remain intact.
