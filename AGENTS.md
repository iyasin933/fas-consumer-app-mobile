# Agent Instructions

## Project Overview

This workspace contains three applications:

| Folder | App | Description |
|---|---|---|
| `fas-consumer-app-mobile/` | Mobile App (React Native / Expo) | Consumer-facing mobile application |
| `dropyou-web-main 2/` | Web App (Next.js) | Consumer-facing web application |
| `fas-server-main/` | Backend (NestJS) | Shared backend API server for both mobile and web apps |

Do **not** modify or delete folders outside of `fas-consumer-app-mobile/` unless explicitly instructed.

## Mobile Empty States

- Any empty, zero-result, blocked, or recoverable error state in the app must use an interactive empty-state treatment, not a lone text message.
- Prefer `src/shared/components/InteractiveEmptyState.tsx` for app screens and list empty states.
- Empty states should include a meaningful visual, concise title/body copy, and one useful action when it materially moves the user forward, such as start booking, retry after an error, back to map, or view all.
- Do not add extra secondary buttons such as Refresh/Check Again when the screen already supports pull-to-refresh or automatic reload. Prefer one clear primary action.
- Keep empty states adaptive: centered in available space, safe around the bottom tab bar, readable on small iPhones, and free of text overlap.
- Do not add decorative blobs/orbs for empty states; use product-relevant route, vehicle, map, booking, or notification visuals.

## Adaptive Layout & Apple Design

- Every UI component **must** use adaptive layout via `useWindowDimensions()`. Never hardcode sizes that break on small iPhones (SE, Mini) or large iPads.
- Use the `narrow = width < 380` pattern consistently — all styles and measurements should branch on `narrow`, using smaller fonts (`typography.fontSize.xs`/`sm`), tighter spacing (`spacing.xs`/`sm`), smaller touch targets (≥36pt on narrow, ≥40pt default), and compact padding.
- Follow Apple's Human Interface Guidelines: minimum 44×44pt touch targets for primary actions, adequate padding around scrollable content to avoid the home indicator and bottom tab bar, readable font sizes (never below 11pt), and visual hierarchy with Dynamic Type‑aware spacing.
- Prefer `react-native-safe-area-context` over manual insets. Always wrap screen roots in `SafeAreaView edges={['top','bottom']}`.
- Keep layout safe from the bottom tab bar: add bottom padding ≥ `insets.bottom + spacing.xl` in scroll content.
- Do not use `useWindowDimensions` in `createStyles` at the module top level. Create styles inside the component via `useMemo` so `narrow`, `colors`, and `width` are captured at render time.

## Guest Booking Flow

- Logged-out users must be able to explore non-account features without being forced to register, including Home, Map, route entry, contents entry, recipient details, and the guest vehicle preview.
- Preserve booking draft data while users move through guest exploration and auth. Do not clear `useDeliveryOrderDraftStore` or `useDeliveryFormStore` when navigating to Sign In, Sign Up, OTP verification, or back to the booking flow.
- Account creation/sign-in should be required only before account-protected backend work, such as authenticated vehicle pricing, load creation, payment, quotes, bookings, notifications, and profile management.
- The live vehicle pricing endpoint `/consumer/booking/price` is auth-protected. In guest mode, do not call it; show local dummy vehicle preview cards behind an interactive account-required state on `ChooseVehicle`.
- After successful sign-in or signup verification from the booking flow, return the user to `ChooseVehicle` with their existing draft intact so they can continue booking.
- Keep guest entry points visually secondary on auth screens. `Continue as guest` should be a quiet text link, not a prominent primary or outline button.

## App Store Versioning

- For App Store, TestFlight, EAS build, or release work, follow the `expo-deployment` skill and this repo's EAS setup before changing version fields.
- Treat `expo.version` in `app.config.js` as the public marketing version users see in the App Store.
- Use semantic versioning for the public version: bump patch for bug fixes, minor for new user-facing features, and major for large product or compatibility changes.
- Do not bump the public version for every TestFlight upload. Keep the same public version while iterating on builds for the same release.
- Treat the iOS build number as an internal upload number. It must increase for every App Store Connect/TestFlight upload and should never be reused.
- This project uses `cli.appVersionSource: "remote"` and `production.autoIncrement: true` in `eas.json`; prefer letting EAS increment production build numbers automatically.
- Use `npx eas-cli@latest build:version:get` to inspect remote versions before a release when there is any doubt.
- Use `npx eas-cli@latest build:version:set -p ios` only when the remote iOS build number must be manually corrected, such as after an App Store Connect duplicate build-number rejection.
- Recommended release pattern: `1.0.0` for first public launch, `1.0.1` for small fixes, `1.1.0` for feature releases, and `2.0.0` for major changes, while build numbers continue increasing independently.
- Before submitting a production build, run the checks documented in `BUILD.md` and use the production EAS profile.
