<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the DropYou mobile app (Expo / React Native). The integration covers the full delivery booking funnel — from authentication through vehicle selection, quote acceptance, and payment — as well as ongoing user identification and session continuity.

## What was changed

| Area | Files modified |
|---|---|
| Package installed | `posthog-react-native` via `npx expo install` |
| Environment variables | `.env` — added `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` |
| Env config | `src/shared/config/env.ts` — exposed `posthogApiKey`, `posthogHost` |
| Provider wired up | `src/application/App.tsx` — `PostHogAnalyticsProvider` wraps the app tree |
| Screen tracking | `src/navigation/RootNavigator.tsx` — `posthog.screen()` on every navigation state change |
| Auth events & identify | `src/services/authSession.service.ts` — identify on sign-in / hydration, capture on sign-in, sign-up, sign-out, reset on sign-out |
| Delivery funnel events | `src/features/delivery/screens/ChooseVehicleScreen.tsx` |
| Quote events | `src/features/delivery/screens/ChooseQuotesScreen.tsx` |
| Payment events | `src/features/delivery/screens/DeliveryPaymentScreen.tsx` |
| Bookings events | `src/features/bookings/screens/BookingsScreen.tsx` |

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `user_signed_in` | User successfully signs in (password, Google, or Apple) with `method` property | `src/services/authSession.service.ts` |
| `user_signed_up` | User completes OTP verification and account is created | `src/services/authSession.service.ts` |
| `user_signed_out` | User signs out; `posthog.reset()` called to unlink session | `src/services/authSession.service.ts` |
| `vehicle_selected` | User selects a vehicle type on the Choose Vehicle screen | `src/features/delivery/screens/ChooseVehicleScreen.tsx` |
| `load_created` | User successfully creates a delivery load and proceeds to quotes | `src/features/delivery/screens/ChooseVehicleScreen.tsx` |
| `quote_accepted` | User accepts a driver quote and proceeds to payment | `src/features/delivery/screens/ChooseQuotesScreen.tsx` |
| `booking_cancelled` | User cancels a booking while waiting for driver quotes | `src/features/delivery/screens/ChooseQuotesScreen.tsx` |
| `payment_initiated` | User taps Pay on the delivery payment screen | `src/features/delivery/screens/DeliveryPaymentScreen.tsx` |
| `payment_completed` | Payment and load allocation succeed — booking confirmed | `src/features/delivery/screens/DeliveryPaymentScreen.tsx` |
| `payment_failed` | Payment or load allocation fails | `src/features/delivery/screens/DeliveryPaymentScreen.tsx` |
| `booking_viewed` | User taps a booking card to view its details | `src/features/bookings/screens/BookingsScreen.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/466153/dashboard/1708812)
- [Delivery booking funnel](https://us.posthog.com/project/466153/insights/QJRln97K) — 4-step conversion: load created → quote accepted → payment initiated → payment completed
- [Sign-ins and sign-ups over time](https://us.posthog.com/project/466153/insights/8oaCGdIJ) — daily trend of authentication activity
- [Payment success rate](https://us.posthog.com/project/466153/insights/9WFtEkNd) — % of payment_initiated that reach payment_completed
- [Booking cancellations](https://us.posthog.com/project/466153/insights/N0g6XErR) — daily count of bookings cancelled during the quotes stage
- [Sign-in method breakdown](https://us.posthog.com/project/466153/insights/eZKLvRNW) — pie chart of password vs Google vs Apple sign-ins

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
