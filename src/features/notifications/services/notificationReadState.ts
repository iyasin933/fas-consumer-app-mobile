import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_QUOTES_TOTAL_KEY = 'dropyou.notifications.lastSeenQuotesTotal.v1';

function lastSeenQuotesTotalKey(userId: number): string {
  return `${LAST_SEEN_QUOTES_TOTAL_KEY}.${userId}`;
}

function parseStoredTotal(value: string | null): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function getLastSeenQuotesTotal(userId: number): Promise<number> {
  const value = await AsyncStorage.getItem(lastSeenQuotesTotalKey(userId));
  return parseStoredTotal(value);
}

export async function setLastSeenQuotesTotal({
  userId,
  total,
}: {
  userId: number;
  total: number;
}): Promise<number> {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  await AsyncStorage.setItem(lastSeenQuotesTotalKey(userId), String(safeTotal));
  return safeTotal;
}
