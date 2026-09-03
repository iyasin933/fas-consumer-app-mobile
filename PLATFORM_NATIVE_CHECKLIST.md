# Platform Native Checklist

Use this before shipping UI changes on React Native / Expo.

## Build And Launch

- Run `npm run typecheck`
- Run `npm run android` and open the changed screens on the Android emulator
- Rebuild and open the iOS dev client or simulator on Mac
- Rebuild the dev client after any native dependency change

## Visual Checks

- Confirm navigation titles feel native on each platform
- Android headers should generally feel left-aligned and compact
- iOS headers should generally feel centered and polished
- Verify touch targets are large enough on small phones
- Check bottom spacing against the safe area and tab bar
- Test maps, sheets, pickers, and modals on both platforms

## Platform-Specific Rules

- Keep shared logic in JS/TS
- Isolate native-only behavior with `Platform.OS`, `.android.tsx`, or `.ios.tsx`
- Use Expo-compatible package versions for all native modules
- Prefer `SafeAreaView` over manual inset handling
- Keep `useWindowDimensions()` inside the component and branch on width for narrow layouts

## Log Checks

- Android: inspect `adb logcat` for `FATAL EXCEPTION`, `NoClassDefFoundError`, and red-screen crashes
- iOS: inspect Xcode console for startup crashes or missing native modules

## Change Review

- Review any shared navigator/header settings first
- Review any component that renders titles, sheets, or overlays
- Verify the same interaction works on both platforms before merging

