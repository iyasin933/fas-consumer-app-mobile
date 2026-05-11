import { isAxiosError } from 'axios';

import { api } from '@/api/client';

export type AllocateDropyouLoadBody = {
  subcontractor: string | number;
  driverPhoneNumber?: string;
  notes?: string;
  agreedRate?: number;
};

export async function allocateDropyouLoad(
  loadId: string | number,
  body: AllocateDropyouLoadBody,
): Promise<unknown> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  if (body.subcontractor == null || String(body.subcontractor).trim() === '') {
    throw new Error('Missing subcontractor id');
  }

  const requestBody = {
    subcontractor: body.subcontractor,
    driverPhoneNumber: body.driverPhoneNumber ?? '',
    notes: body.notes ?? '',
    ...(body.agreedRate != null ? { agreedRate: body.agreedRate } : {}),
  };
  const path = `/dropyou/loads/${id}/subcontractor`;

  if (__DEV__) {
    console.log('[DropyouAllocateLoad] POST', path, requestBody);
  }

  try {
    const { data } = await api.post<unknown>(path, requestBody);
    if (__DEV__) {
      try {
        console.log('[DropyouAllocateLoad] response', JSON.stringify(data, null, 2));
      } catch {
        console.log('[DropyouAllocateLoad] response (non-JSONable)', data);
      }
    }
    if (data && typeof data === 'object') {
      const envelope = data as Record<string, unknown>;
      const message =
        typeof envelope.message === 'string' ? envelope.message : 'Assigning the carrier failed.';
      if (envelope.status === false) throw new Error(message);
    }
    return data;
  } catch (error) {
    if (__DEV__) {
      if (isAxiosError(error)) {
        console.warn('[DropyouAllocateLoad] failed', {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          requestBody,
          response: error.response?.data,
        });
      } else {
        console.warn('[DropyouAllocateLoad] failed', error);
      }
    }
    throw error;
  }
}
