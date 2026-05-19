import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_QUOTES_TOTAL_KEY = 'dropyou.notifications.lastSeenQuotesTotal.v1';

function parseStoredTotal(value: string | null): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function getLastSeenQuotesTotal(): Promise<number> {
  const value = await AsyncStorage.getItem(LAST_SEEN_QUOTES_TOTAL_KEY);
  return parseStoredTotal(value);
}

export async function setLastSeenQuotesTotal(total: number): Promise<number> {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  await AsyncStorage.setItem(LAST_SEEN_QUOTES_TOTAL_KEY, String(safeTotal));
  return safeTotal;
}
