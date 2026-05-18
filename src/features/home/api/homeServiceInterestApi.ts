import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { api } from '@/api/client';

const COMING_SOON_VISITOR_ID_KEY = 'dropyou_coming_soon_visitor_id';

type ComingSoonServiceCode = 'taxi' | 'car_hire' | 'food' | 'train_coach';
type ComingSoonPlatform = 'web' | 'ios' | 'android';

export type HomeServiceInterestPayload = {
  serviceId: string;
  serviceName: string;
};

const SERVICE_CODE_BY_HOME_ID: Record<string, ComingSoonServiceCode | undefined> = {
  car_hire: 'car_hire',
  taxi: 'taxi',
  train_coach: 'train_coach',
  food_scooter: 'food',
};

function comingSoonPlatform(): ComingSoonPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}

function makeVisitorId(): string {
  return Crypto.randomUUID();
}

async function getStableVisitorId(): Promise<string> {
  if (Platform.OS === 'web') {
    const storage = globalThis.localStorage;
    const existing = storage?.getItem(COMING_SOON_VISITOR_ID_KEY);
    if (existing) return existing;

    const next = makeVisitorId();
    storage?.setItem(COMING_SOON_VISITOR_ID_KEY, next);
    return next;
  }

  const existing = await SecureStore.getItemAsync(COMING_SOON_VISITOR_ID_KEY);
  if (existing) return existing;

  const next = makeVisitorId();
  await SecureStore.setItemAsync(COMING_SOON_VISITOR_ID_KEY, next);
  return next;
}

export async function recordHomeServiceInterest({
  serviceId,
}: HomeServiceInterestPayload): Promise<void> {
  const serviceCode = SERVICE_CODE_BY_HOME_ID[serviceId];
  if (!serviceCode) return;

  const platform = comingSoonPlatform();
  const visitorId = await getStableVisitorId();

  await api.post(
    '/dropyou/coming-soon/interest',
    {
      serviceCode,
      platform,
      ...(platform === 'web' ? { anonymousVisitorId: visitorId } : null),
    },
    {
      headers: platform === 'web' ? undefined : { 'x-device-id': visitorId },
    },
  );
}
