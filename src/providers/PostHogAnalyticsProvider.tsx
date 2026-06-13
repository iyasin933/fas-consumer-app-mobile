import type { PropsWithChildren } from 'react';
import { PostHogProvider as SDKProvider } from 'posthog-react-native';

import { posthog } from '@/services/posthog';

/**
 * Wraps the app with PostHog analytics context.
 *
 * When no API key is configured (`posthog` is undefined), this renders
 * children directly without the SDK provider — analytics is gracefully disabled.
 *
 * Screen view tracking is handled separately in the navigation layer
 * via the NavigationContainer's `onStateChange` callback, per the
 * react-navigation v7 + PostHog recommended pattern:
 *   https://reactnavigation.org/docs/screen-tracking/
 */
export function PostHogAnalyticsProvider({ children }: PropsWithChildren) {
  if (!posthog) {
    return <>{children}</>;
  }

  return (
    <SDKProvider
      client={posthog}
      autocapture={{
        captureTouches: false,
        // We handle screen tracking manually via onStateChange (react-navigation v7)
        captureScreens: false,
      }}
    >
      {children}
    </SDKProvider>
  );
}