import type { AxiosError } from 'axios';

/** Normalized API failure for UI and logging */
export type ApiClientError = {
  status: number | null;
  message: string;
  body?: unknown;
};

export function isAxiosErrorLike(e: unknown): e is AxiosError<unknown> {
  return typeof e === 'object' && e !== null && 'isAxiosError' in e && (e as AxiosError).isAxiosError === true;
}

export function toApiClientError(e: unknown): ApiClientError {
  if (isAxiosErrorLike(e)) {
    const status = e.response?.status ?? null;
    const data = e.response?.data;
    let message = e.message;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const m = d.message ?? d.error;
      if (typeof m === 'string') message = m;
      else if (Array.isArray(m) && typeof m[0] === 'string') message = m[0];
    }
    return { status, message, body: data };
  }
  if (e instanceof Error) return { status: null, message: e.message };
  return { status: null, message: 'Unknown error' };
}
