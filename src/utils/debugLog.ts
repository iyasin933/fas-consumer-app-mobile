/**
 * Dev-only logs. Prefer `warn` — shows as yellow "WARN" in Metro and is easier to spot than `log`.
 *
 * If the IDE terminal stays empty:
 * - Turn OFF "Remote JS Debugging" (Cmd+D / shake → Stop Remote JS Debugging) so logs stay in Metro.
 * - Or open the browser tab Expo opened for DevTools / debugger → Console there instead.
 */
export function debugLog(scope: string, message: string, extra?: unknown): void {
  if (!__DEV__) return;
  if (extra !== undefined) {
    console.warn(`[${scope}]`, message, extra);
  } else {
    console.warn(`[${scope}]`, message);
  }
}
