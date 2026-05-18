# Build Guide

Simple commands for local development and EAS Cloud builds.

## 1. Install dependencies

```bash
npm install
```

## 2. Local development

Start Metro:

```bash
npm run start
```

Then press:

- `i` to open iOS Simulator
- `a` to open Android
- `r` to reload
- `j` to open debugger

## 3. Development build with EAS Cloud

Use this when native packages changed, or when you need a real development client.

### iOS Simulator

```bash
npx eas-cli@latest build -p ios --profile development --clear-cache
npx eas-cli@latest build:run -p ios --profile development --latest
npx expo start --dev-client -c
```

### Physical iPhone

```bash
npx eas-cli@latest build -p ios --profile development-device --clear-cache
npx expo start --dev-client -c
```

Install the generated build on your registered iPhone, then open the app and connect it to Metro.

## 4. Preview build

Use preview builds for internal testing.

```bash
npx eas-cli@latest build -p ios --profile preview
```

## 5. Production build

Run checks first:

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

Create the production App Store build:

```bash
npx eas-cli@latest build -p ios --profile production
```

Submit the latest production build to App Store Connect:

```bash
npx eas-cli@latest submit -p ios --profile production --latest
```

## 6. Important notes

- This project uses EAS Cloud through `eas.json`.
- `development` is for iOS Simulator development builds.
- `development-device` is for physical iPhone development builds.
- `preview` is for internal testing.
- `production` is for App Store builds.
- If you change native dependencies, rebuild the development client.
- If you only change JavaScript or TypeScript, usually just restart Metro with:

```bash
npx expo start --dev-client -c
```

- Production builds do not update your development client.
- `production.autoIncrement` is enabled in `eas.json`, so each production build gets a new iOS build number.
