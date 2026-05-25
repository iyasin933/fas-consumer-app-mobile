# Agent Instructions

## Mobile Empty States

- Any empty, zero-result, blocked, or recoverable error state in the app must use an interactive empty-state treatment, not a lone text message.
- Prefer `src/shared/components/InteractiveEmptyState.tsx` for app screens and list empty states.
- Empty states should include a meaningful visual, concise title/body copy, and one useful action when it materially moves the user forward, such as start booking, retry after an error, back to map, or view all.
- Do not add extra secondary buttons such as Refresh/Check Again when the screen already supports pull-to-refresh or automatic reload. Prefer one clear primary action.
- Keep empty states adaptive: centered in available space, safe around the bottom tab bar, readable on small iPhones, and free of text overlap.
- Do not add decorative blobs/orbs for empty states; use product-relevant route, vehicle, map, booking, or notification visuals.
