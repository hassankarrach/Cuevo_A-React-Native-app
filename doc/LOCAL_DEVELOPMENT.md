# Local development — MacBook Air M1

The primary development environment is now the MacBook Air M1, using React Native with Expo and the iOS Simulator. Browser preview is optional and is not the main mobile preview workflow.

Initial setup completed on 2026-11-17; current UI/session status is recorded as of 2026-11-21 in UI_PROGRESS.md. Read `SESSION_HANDOFF.md` for the next session's starting point. Installation steps below are for a new machine; do not repeat them on the configured Mac.

## Installed environment

- MacBook Air M1, 8 GB unified memory; macOS 26.4.1 at setup time.
- Xcode 26.6, selected at `/Applications/Xcode.app/Contents/Developer`.
- iOS 26.5 simulator runtime; **iPhone 17** is the device that successfully displayed the app.
- Node v26.13.1 via nvm, matching `mobile/.nvmrc`; locked dependencies installed with `npm ci`.
- Expo SDK 58 and React Native 0.88.1. Expo Go 58.0.7 is installed on the working simulated iPhone.
- Run one simulated device at a time and limit Metro to two workers. Disk space was cleaned up, but free space and swap are dynamic; measure them rather than relying on historical figures.

## 1. Prepare macOS

- Install an Xcode version compatible with your macOS and the project's Expo SDK. Update macOS if required and supported.
- Open Xcode once and finish its first-run installation and license prompts.
- In Xcode settings, select the Xcode Command Line Tools under Locations.
- Install an iOS Simulator runtime under Components/Platform Support (the label depends on Xcode version).
- Install nvm using its official instructions: https://github.com/nvm-sh/nvm#installing-and-updating
- Use an Apple Silicon/native terminal and install dependencies on the Mac rather than copying Linux binaries.

Official simulator setup: https://docs.expo.dev/workflow/ios-simulator/

## 2. Clone and install

Run from the directory where you keep your projects. Use the repository remote:

```bash
git clone git@github.com:hassankarrach/SonicRoom_A-React-Native-app.git cuevo
cd cuevo/mobile
nvm install
nvm use
npm ci
```

`mobile/.nvmrc` records the setup Node version. `package-lock.json` records dependency versions. Commit both; do not transfer `node_modules`, `.expo`, or `dist` from the VM.

No backend exists yet. Current screens use local profiles, ten mock accounts and room memberships without provider credentials or a server. See UI_PROGRESS.md for implemented and missing UI.

## 3. Run the native preview

From `mobile/`:

```bash
nvm use
npm run start -- --localhost --max-workers 2
```

Expo starts Metro. Press i to open the existing iOS Simulator with Expo Go. Alternatively, run `npm start` and press `i`; Shift+i lets you select a simulator. If no device is available, finish installing a runtime and create a simulated iPhone through Xcode's device management tools.

Keep the server running and edit screens under `mobile/src/screens/` or routes under `mobile/src/app/`. `mobile/index.ts` uses Expo Router; `App.tsx` is a compatibility re-export. Save to see updates through Fast Refresh. Stop the server with Ctrl+C.

If Expo is already running for this project, reuse that server. Press `i` there to open iOS, or Shift+i to select the existing **iPhone 17**. Do not start duplicate Metro servers or boot extra devices. Xcode's editor does not need to stay open.

### What is running

The simulator runs iOS. Expo Go is an installed native app that loads Cuevo's JavaScript from the Mac's Metro development server (`exp://127.0.0.1:8081` in the verified setup). This is sufficient for UI, navigation, styling, and interaction development. Cuevo does not yet have its own installed app icon.

The blue gear is Expo Go's developer-tools button. It is not part of Cuevo and will not ship in a release. Hide it through the gear menu's **Tools button** switch if it obstructs the UI; Fast Refresh should remain enabled.

An eventual development build gives Cuevo its own icon and custom native dependencies, but normally still uses Metro during development. A release build packages the code and runs without Metro. Neither build has been created in this setup session.

### Slow first boot and migration warnings

The initial setup encountered very slow booting, heavy swap use, and `Data Migration Failed` from `simctl bootstatus`. The runtime's dyld shared cache was initially unavailable. Apple's recommended preparation command completed successfully and reported the cache usable:

```bash
xcrun simctl runtime dyld_shared_cache update --all
```

Reference: https://developer.apple.com/forums/thread/807025

This runtime cache contains system-library loading data; it is separate from npm, browser, and other application caches. Do not delete it as routine cleanup. Do not rebuild it on every launch.

**A migration warning alone did not mean the device was unusable.** After cache preparation, the existing iPhone 17 reached its home screen and successfully ran Cuevo despite the warning. Inspect the actual screen and try opening Expo Go before shutting down, resetting, or replacing a device. The user explicitly wants the working simulator left running and dislikes unnecessary restarts and repeated setup.

An additional device named `MusicRoom Dev` was created during troubleshooting and then shut down. It is not the verified target; use the original iPhone 17. Initial resource contention and cache preparation were observed, but the exact cause of the migration error was not established. Do not present RAM or other open apps as the proven sole cause.

If Xcode tools are not detected, check:

```bash
xcode-select -p
xcrun simctl list devices available
```

When needed, select the full Xcode installation using its actual path (for the standard installation):

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

## 4. Native integrations later

Expo Go is sufficient for the current UI preview. Music SDKs, BLE, or other native dependencies unavailable in Expo Go require a development build. Configure the selected SDKs and app identifiers first, then install the development client with Expo's compatible dependency installer and build for the simulator:

```bash
npx expo install expo-dev-client
npx expo run:ios
```

Rebuild after native dependency/configuration changes. Ordinary TypeScript/UI edits still use Fast Refresh. Do not manually create generated native directories. Follow the relevant versioned Expo/provider documentation when adding integrations.

The simulator does not replace physical-device testing for BLE/proximity, provider restrictions, performance, and device-specific behavior. Plan real-device checks as those features are introduced.

## 5. Optional browser preview

```bash
npm run web
```

Open the address printed by Expo. This renders React Native Web in a browser, not an iOS simulator. Use it for web compatibility checks and later responsive web work. Merely enabling this target does not complete the web bonus.

## 6. Checks

```bash
npm run typecheck
npm run lint
npx expo export --platform web
```

The web export writes generated output to ignored `mobile/dist/`. Continue using React Native components, flexible layouts, and safe-area handling. Validate keyboard behavior, fonts, navigation, and safe areas in the simulator early.

## Current verification status

- Verified on Ubuntu: TypeScript, direct ESLint, web export, and HTTP 200 from the development server.
- An automated headless browser check stalled; appearance and interaction were not verified by that check.
- Verified on the Mac: pinned Node installation, `npm ci`, `npm run typecheck`, and `npm run lint`.
- Verified visually: Cuevo starter screen rendered in Expo Go on iPhone 17 / iOS 26.5; Expo reported a successful iOS bundle. Developer onboarding/menu was dismissed and Fast Refresh was enabled.
- An automated click on the counter timed out; counter interaction and end-to-end Fast Refresh were not independently verified in this session.
- A separate native development/release build, physical-device behavior, and production features remain unverified.
- Expo's lint wrapper rejected its installed ESLint version; `npm run lint` uses ESLint directly with the generated Expo config.
- npm reported eight moderate dependency advisories during setup. Review advisories before deployment; avoid forced SDK changes without compatibility checks.

## Repository layout and handoff

```text
cuevo/
  en.subject.pdf
  doc/
  mobile/
    App.tsx
    package.json
    package-lock.json
    .nvmrc
```

Create the Git repository at the project root so the subject, plan, and mobile code stay together. The Git repository is initialized at the project root and uses the GitHub remote shown above. Keep secrets in ignored local environment files. The backend and responsive web deliverables will be added as implementation progresses.

## Latest preview note — 2026-11-20

Metro stopped during the welcome typography pass; missing PNGs and Expo's Could not connect to the server were resolved by restarting `npm run start -- --localhost --max-workers 2` and reopening the introduction route. Check port 8081 before starting another server. The simulator/Metro were left running at the progress save.

When adding a new face to the existing runtime `fontAssets` map, Fast Refresh can keep an already-mounted `useFonts` result and show a fallback. Use Expo's developer-menu Reload to verify the new face before diagnosing its styling. Do not reset the simulator or reinstall dependencies for this.

## Session close — 2026-11-21

The user requested a documentation/commit/push checkpoint and closing Simulator. Earlier instructions to leave Simulator running are superseded for this checkpoint. Reuse the existing device when preview resumes; no reset/reinstallation is needed. See SESSION_HANDOFF for the current loading/billing/discovery behavior.

## Android APK preview — 2026-11-21

- Expo project: `@zerojsxs-team/cuevo`, ID `95ebb846-bc8b-40ff-b27c-0fb92dcafe0e`. Workspace linked via EAS init; CLI sign-in completed through browser authentication.
- Android package: `com.cuevo.app`. Adaptive icon now references the selected orange Cuevo design.
- `mobile/eas.json` defines a standalone `preview` profile (`distribution: internal`, Android `buildType: apk`, Node 26.13.1). No Expo Go or Metro is required to run the APK.
- Build command, from `mobile`: `npx eas-cli@latest build --platform android --profile preview`.
- First build: https://expo.dev/accounts/zerojsxs-team/projects/cuevo/builds/4f0ee720-3ffc-4167-bf3d-a02b0eeb9602 . Expo generated/stores its Android signing keystore. Reuse it for later updates; do not commit signing secrets.
- Install on a phone: open the completed build link, download APK, open it, allow that browser/file manager to install unknown apps if prompted, then install Cuevo.
- Notification permission UI is included; real Android remote push delivery still requires FCM configuration/token/backend work. APK/device behavior must be checked on the user's phone.

### First Android APK completed — verified 2026-11-22

Expo build `4f0ee720-3ffc-4167-bf3d-a02b0eeb9602` finished successfully.
APK: https://expo.dev/artifacts/eas/wJlzaF_5kWxIlM1yhpqe93Gha51fWhfZe2mpcgpao5Y.apk
Physical-phone installation and behavior still need user verification.

## Nearby page preview — 2026-11-22

Reuse the existing Metro server on 8081 when available. This session started it with `npm run start -- --port 8081 --max-workers 2` from `mobile`; do not assume it is still running. Open Rooms → Nearby in Expo Go, or open the route directly on the existing simulator:

```bash
xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/nearby?__expo_disable_fab=1&__expo_disable_auto_launch=1&__expo_disable_onboarding=1'
```

After five seconds, the same panel displays fixture room results. Stop cancels and Scan nearby restarts; this does not use Bluetooth/GPS. The real map tiles require internet access. No map API key or new package is needed for the current OpenStreetMap version. MapTiler static images/custom styles remain an alternative requiring an owner-provided key; no signup was performed.

Latest source lint/typecheck pass and results layout was visually checked on the existing iPhone 17 Simulator. This session did not rebuild the standalone iOS app or Android APK. Reload Expo Go for source edits; rebuild installed standalone snapshots when needed. Do not reset or recreate the simulator.


## Local backend and client connection — 2026-11-26

Initial setup is complete: Python 3.12 virtual environment in `backend/.venv`,
ignored `backend/.env` with a generated auth secret, PostgreSQL 16 and Mailpit
Compose services, and development migrations through `0005_profile_avatars` (applied 2026-11-27).
The isolated `cuevo_test` database is separate from development data.

Start services after restarting Docker Desktop:

```bash
cd backend
docker compose up -d --wait postgres mailpit
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- API readiness: http://127.0.0.1:8000/health
- API explorer: http://127.0.0.1:8000/docs
- Development email inbox: http://127.0.0.1:8025
- Stop API with Ctrl+C; stop services with `docker compose stop`. Keep the volume
  to retain local accounts. No production email delivery is configured.

`mobile/.env.example` documents `EXPO_PUBLIC_API_URL`; an ignored `.env.local`
currently points at `http://127.0.0.1:8000` for the iOS Simulator. Expo embeds
public environment values in the client bundle; never put the backend auth
secret or database credentials there. Fully reload Expo after changing the URL.
Android Emulator uses `http://10.0.2.2:8000`. A physical phone needs the Mac's LAN
IP, the same local network and uvicorn listening on `0.0.0.0`; the server is
currently bound to loopback for simulator development. An installed standalone
build needs rebuilding to include changed source/configuration. Browser preview
also needs a reviewed backend CORS configuration; native requests do not use CORS.

`mobile/src/api/client.ts` handles JSON, raw avatar upload, authenticated image reads, structured errors, timeouts and Retry-After. Connected features and remaining endpoints are listed in [UI_PROGRESS.md](UI_PROGRESS.md#existing-backend-apis-client-integration-status). Initial profile setup, recovery and Settings password change are now connected; separate profile editor saves remain local.

Latest checks: mobile typecheck/lint and **23 client tests pass**; full merged backend suite previously **108 passed**, and focused recovery/password-change tests passed separately. No device end-to-end password changes were performed. Keep test/development databases separate.

The existing backend virtual environment lacks the new Pillow dependency. This session installed the declared Pillow 11.3.0 only into `/private/tmp/cuevo-review-deps` for review without modifying backend files. Current API/test commands used `PYTHONPATH=/private/tmp/cuevo-review-deps` before `.venv/bin/uvicorn` or `.venv/bin/python`. That temporary path may disappear after cleanup; the standard commands above require the declared dependencies installed. Backend environment/dependency maintenance belongs to the teammate.

## Native Google sign-in — 2026-11-27

The iOS client uses `@react-native-google-signin/google-signin` with the public iOS/server client IDs from the backend auth lifecycle guide. The app config registers the reversed iOS client ID through its config plugin. No OAuth client secret or Firebase is used. Backend Google environment variables must be configured; frontend ownership does not permit editing backend configuration.

Login/sign-up exchange a native ID token at `/api/v1/auth/google`; only Cuevo session tokens are securely persisted. Settings → Linked accounts loads real provider state and explicitly links/unlinks with the current Cuevo password. A Google-only account must set a password through account recovery before disconnecting; the recovery UI is now connected from login → Forgot password. Email collisions require existing-account login and explicit linking. Android/browser Google flows are outside the approved iOS contract.

Expo Go cannot load this native module. Email login remains usable there; testing Google requires a rebuilt installed Cuevo iOS app. Reuse the existing simulator and Metro, and do not hand-edit generated `ios/` files. Google account authentication/consent must be completed by the user.


### Native build and manual test checkpoint — 2026-11-27

The Google plugin was applied via Expo prebuild; a native Debug build succeeded and installed on the existing iPhone 17 using `npx expo run:ios --device 158AB8CD-3044-4069-93A6-73D8C9CAC59A --no-bundler`. Reuse Metro; do not reset the simulator or hand-edit generated native code. This Debug app consumes Metro source changes; native module/config changes require rebuilding. Google prompt launch is verified, full Google authentication/link/unlink is not.

Manual tests still needed: initial profile photo upload/reload, recovery request → Mailpit code → reset → login, Settings current/new password → update → continued session/new-password login, and Google user authentication/link/unlink. Password test credentials should be entered by the user; do not reset a real account as an automated smoke test. The recovery endpoint sends mail only for existing accounts but always returns the same generic accepted response. Successful recovery revokes all sessions; Settings change-password preserves the current session with rotated credentials and revokes others.
