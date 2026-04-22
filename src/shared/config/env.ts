/**
 * Expo injects EXPO_PUBLIC_* at build time. Add them in a root `.env` file
 * (see `.env.example`).
 *
 * `apiUrl` is the full REST base including `/api/v1` — callers use paths like `/auth/login`.
 */
function trimTrailingSlashes(s: string): string {
  let x = s.trim();
  while (x.endsWith('/')) x = x.slice(0, -1);
  return x;
}

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.dropyou.co.uk/api/v1',
  /** Numeric id for the CONSUMER role — required for signup (ask backend / DB). */
  consumerRoleId: process.env.EXPO_PUBLIC_CONSUMER_ROLE_ID
    ? Number(process.env.EXPO_PUBLIC_CONSUMER_ROLE_ID)
    : undefined,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  /** Used for Places Autocomplete + Geocoding HTTP calls from the app. */
  googleMapsApiKey: (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim(),
  /** Stripe publishable key — required for Payment Sheet (`@stripe/stripe-react-native`). */
  stripePublishableKey: (process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').trim(),
  /**
   * When true (default), `POST /payment/create-intent` sends `amount` in **major** units (e.g. `319.2` for £319.20).
   * The backend converts to Stripe’s smallest unit. Set `EXPO_PUBLIC_PAYMENT_CREATE_INTENT_AMOUNT_MAJOR=false`
   * only if the API expects **minor** units (pence) with no server-side conversion.
   */
  paymentCreateIntentAmountInMajorUnits:
    process.env.EXPO_PUBLIC_PAYMENT_CREATE_INTENT_AMOUNT_MAJOR !== 'false',
  /**
   * Socket.IO server origin (no `/api/v1`, no trailing `/`). Example: `https://api.dropyou.co.uk`
   * — used for load-quote events (`subscribe_to_load`, `dropyou_quote_received`).
   */
  socketUrl:
    trimTrailingSlashes(process.env.EXPO_PUBLIC_SOCKET_URL ?? '') ||
    trimTrailingSlashes(
      String(process.env.EXPO_PUBLIC_API_URL ?? 'https://api.dropyou.co.uk/api/v1').replace(
        /\/api\/v\d+\/?$/i,
        '',
      ),
    ),
  /**
   * Engine.IO path (Socket.IO default is `/socket.io`). Set if your gateway mounts elsewhere.
   */
  socketPath: trimTrailingSlashes(process.env.EXPO_PUBLIC_SOCKET_PATH ?? '') || '/socket.io',
};
