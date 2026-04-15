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
