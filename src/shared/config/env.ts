/**
 * Expo injects EXPO_PUBLIC_* at build time. Add them in a root `.env` file
 * (see `.env.example`).
 *
 * `apiUrl` is the full REST base including `/api/v1` — callers use paths like `/auth/login`.
 */
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.dropyou.co.uk/api/v1',
  /** Numeric id for the CONSUMER role — required for signup (ask backend / DB). */
  consumerRoleId: process.env.EXPO_PUBLIC_CONSUMER_ROLE_ID
    ? Number(process.env.EXPO_PUBLIC_CONSUMER_ROLE_ID)
    : undefined,
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};
