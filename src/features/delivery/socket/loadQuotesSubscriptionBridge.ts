/**
 * Lets `createDropyouLoad` subscribe to socket quotes **immediately** when the HTTP
 * response returns — before React re-renders — so carriers can push quotes without
 * waiting for the next screen mount.
 *
 * The {@link LoadQuotesSocketProvider} registers the real implementation once mounted.
 */

type SubscribeFn = (loadId: string) => void;

let subscriber: SubscribeFn | null = null;

export function setLoadQuotesSubscriptionSubscriber(fn: SubscribeFn | null): void {
  subscriber = fn;
}

/** Called from `createDropyouLoad` after a successful create (has `loadId`). */
export function notifyLoadCreatedForQuotes(loadId: string): void {
  const id = String(loadId).trim();
  if (!id) return;
  subscriber?.(id);
}
