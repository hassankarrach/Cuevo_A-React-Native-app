# SonicRoom

A React Native music app with live track voting and collaborative playlist editing.

This two-person project is currently at the Expo/TypeScript starter stage. Authentication, backend services, collaborative features, and bonuses are planned, not implemented.

## Development

Primary environment: MacBook Air M1 with Xcode and an iOS Simulator.

After installing nvm, Xcode, and an iOS Simulator runtime:

```bash
cd mobile
nvm install
nvm use
npm ci
npm run ios
```

Edit `mobile/App.tsx` to start building the UI. Optional browser preview: `npm run web`.

## Documentation

- [Local setup and Mac handoff](doc/LOCAL_DEVELOPMENT.md)
- [Project plan and requirements](doc/PROJECT_PLAN.md)
- [Team responsibilities](doc/TEAM_RESPONSIBILITIES.md)
- [Project subject](en.subject.pdf)

## Checks

Run inside `mobile/`:

```bash
npm run typecheck
npm run lint
```

TypeScript, linting, and web export were verified on Ubuntu. iOS setup and native behavior still require verification on the Mac.
