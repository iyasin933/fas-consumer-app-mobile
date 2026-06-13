/**
 * PostHog analytics client — initialized once as a singleton.
 *
 * We create the client here (not inside the provider) so non-React code
 * (e.g. API interceptors, stores) can import and call posthog directly
 * without needing the React context.
 */
import type { PostHogEventProperties } from '@posthog/core';
import PostHog from 'posthog-react-native';

import { env } from '@/shared/config/env';

const hasConfig = Boolean(env.posthogApiKey);

export const posthog = hasConfig
  ? new PostHog(env.posthogApiKey, {
      host: env.posthogHost,
      persistence: 'file',
      // Auto-capture lifecycle events (Application Opened, Backgrounded, etc.)
      captureAppLifecycleEvents: true,
      // Disable session replay by default (enable via remote config if needed)
      enableSessionReplay: false,
      // Enable default person properties for feature flag evaluation
      setDefaultPersonProperties: true,
      // Enable error tracking — capture uncaught exceptions and unhandled promise rejections
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
    })
  : undefined;

/**
 * Safe no-op capture that silently skips when PostHog is not configured.
 * Use this for optional analytics events that shouldn't crash the app.
 */
export function captureSafe(
  eventName: string,
  properties?: PostHogEventProperties,
): void {
  posthog?.capture(eventName, properties);
}
