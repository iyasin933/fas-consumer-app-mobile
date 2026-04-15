import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'dropyou_secure_access_token';
const KEY_REFRESH = 'dropyou_secure_refresh_token';

/**
 * Tokens live only in SecureStore (encrypted on device), never in Zustand/React state,
 * to avoid accidental logging and memory exposure.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_ACCESS);
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, token);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_REFRESH);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_REFRESH, token);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ACCESS).catch(() => undefined);
  await SecureStore.deleteItemAsync(KEY_REFRESH).catch(() => undefined);
}
