# Local development — MacBook Air M1

The primary development environment is now the MacBook Air M1, using React Native with Expo and the iOS Simulator. Browser preview is optional and is not the main mobile preview workflow.

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
git clone git@github.com:hassankarrach/SonicRoom---A-React-Native-app-for-collaborative-music..git music-room
cd music-room/mobile
nvm install
nvm use
npm ci
```

`mobile/.nvmrc` records the setup Node version. `package-lock.json` records dependency versions. Commit both; do not transfer `node_modules`, `.expo`, or `dist` from the VM.

No backend exists yet. The current starter screen and counter work locally without accounts, provider credentials, or a server.

## 3. Run the native preview

From `mobile/`:

```bash
nvm use
npm run ios
```

Expo starts its development server and opens the iOS Simulator with a compatible Expo Go client. Alternatively, run `npm start` and press `i`; Shift+i lets you select a simulator. If no device is available, finish installing a runtime and create a simulated iPhone through Xcode's device management tools.

Keep the server running and edit `mobile/App.tsx`. Save to see updates through Fast Refresh. The starter button increments a local counter. Stop the server with Ctrl+C.

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

Expo Go is sufficient for the current starter. Music SDKs, BLE, or other native dependencies unavailable in Expo Go require a development build. Configure the selected SDKs and app identifiers first, then install the development client with Expo's compatible dependency installer and build for the simulator:

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
- Mac installation, iOS Simulator launch, and native builds have not yet been verified.
- Expo's lint wrapper rejected its installed ESLint version; `npm run lint` uses ESLint directly with the generated Expo config.
- npm reported eight moderate dependency advisories during setup. Review advisories before deployment; avoid forced SDK changes without compatibility checks.

## Repository layout and handoff

```text
music-room/
  en.subject.pdf
  doc/
  mobile/
    App.tsx
    package.json
    package-lock.json
    .nvmrc
```

Create the Git repository at the project root so the subject, plan, and mobile code stay together. The Git repository is initialized at the project root and uses the GitHub remote shown above. Keep secrets in ignored local environment files. The backend and responsive web deliverables will be added as implementation progresses.
