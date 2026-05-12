# fas-mobile

Expo + React Native starter with TypeScript, scalable architecture, and quality tooling.

## Start development

```bash
npm run start
```

Then press:

- `i` to open iOS Simulator
- `r` to reload
- `j` to open debugger

## EAS development builds

Normal development uses an EAS development build plus Metro. Use Metro for JS
and TypeScript changes:

```bash
npx expo start --dev-client -c
```

If native dependencies changed, create and install a new EAS development build.
For a physical registered iPhone:

```bash
npx eas-cli@latest build -p ios --profile development-device --clear-cache
npx expo start --dev-client -c
```

For an iOS Simulator EAS build:

```bash
npx eas-cli@latest build -p ios --profile development --clear-cache
npx eas-cli@latest build:run -p ios --profile development --latest
npx expo start --dev-client -c
```

Install the new EAS development build on the device or simulator before opening
the dev client. This matters for native packages like `react-native-worklets`.
If the app opens an `exp+dropyou://expo-development-client/...` URL and shows a
Worklets version mismatch, the installed development build is stale.

If you specifically want to build locally with Xcode instead of EAS, use:

```bash
npx expo run:ios --no-build-cache
npx expo start --dev-client -c
```

## Production iOS build

Run checks before creating a store build:

```bash
npm run typecheck
npx expo-doctor
```

Create a production App Store build:

```bash
npx eas-cli@latest build -p ios --profile production
```

Submit the latest finished production build to App Store Connect:

```bash
npx eas-cli@latest submit -p ios --profile production --latest
```

Notes:

- `eas.json` uses the `production` profile for App Store builds.
- `production.autoIncrement` should stay enabled so each rebuild gets a unique
  iOS build number.
- If submission says build number `1` or another number has already been used,
  create a new production build first, then submit again. You cannot fix that by
  resubmitting the same binary.
- Production builds do not update the development client. Rebuild the EAS
  development build separately after native dependency changes.

## iOS setup checklist

If you see an `xcodebuild` error, set the active Xcode path:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Open Simulator once:

```bash
open -a Simulator
```

## Quality workflow

```bash
npm run typecheck
npm run lint
npm run format:check
```

## Project structure

```txt
src/
  app/                    # app root and global providers
  features/               # feature-first modules
    home/
      screens/
  shared/
    components/           # reusable UI building blocks
    theme/                # colors, spacing, typography tokens
```
