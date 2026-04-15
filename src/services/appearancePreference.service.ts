import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'dropyou_appearance';

export type AppearancePreference = 'system' | 'light' | 'dark';

export async function getAppearancePreference(): Promise<AppearancePreference | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'system' || raw === 'light' || raw === 'dark') return raw;
  return null;
}

export async function setAppearancePreference(pref: AppearancePreference): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, pref);
}
