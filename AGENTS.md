# Agent Instructions

## Mobile Empty States

- Any empty, zero-result, blocked, or recoverable error state in the app must use an interactive empty-state treatment, not a lone text message.
- Prefer `src/shared/components/InteractiveEmptyState.tsx` for app screens and list empty states.
- Empty states should include a meaningful visual, concise title/body copy, and one useful action when it materially moves the user forward, such as start booking, retry after an error, back to map, or view all.
- Do not add extra secondary buttons such as Refresh/Check Again when the screen already supports pull-to-refresh or automatic reload. Prefer one clear primary action.
- Keep empty states adaptive: centered in available space, safe around the bottom tab bar, readable on small iPhones, and free of text overlap.
- Do not add decorative blobs/orbs for empty states; use product-relevant route, vehicle, map, booking, or notification visuals.

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
