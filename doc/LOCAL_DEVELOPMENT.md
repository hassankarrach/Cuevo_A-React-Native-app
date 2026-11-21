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
