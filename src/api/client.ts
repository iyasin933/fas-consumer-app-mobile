import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';

import { pickTokens } from '@/api/authTokens';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/shared/config/env';
import * as tokenStorage from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';

/**
 * Axios instance with:
 * - Base URL from env (`EXPO_PUBLIC_API_URL`, includes `/api/v1`)
 * - Request interceptor: attach Bearer from SecureStore (never from React state)
 * - Response interceptor: 401 → refresh access token once, retry request;
 *   refresh failure → clear tokens, session, and React Query cache.
 */
export const api = axios.create({
  baseURL: env.apiUrl.replace(/\/$/, ''),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: env.apiUrl.replace(/\/$/, ''),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

let refreshAccessTokenPromise: Promise<string> | null = null;

async function clearAuthSession(): Promise<void> {
  await tokenStorage.clearTokens();
  useAuthStore.getState().clearSession();
  await queryClient.cancelQueries();
  queryClient.clear();
}

function isRefreshableAuthPath(url: string | undefined): boolean {
  if (!url) return true;
  return ![
    '/auth/login',
    '/auth/login/verify/otp',
    '/auth/signup',
    '/auth/signup/verify/otp',
    '/auth/password/forgot/initiate',
    '/auth/password/forgot/complete',
    '/auth/google/login',
    '/auth/refresh',
  ].some((path) => url.includes(path));
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token available.');

      const { data } = await refreshClient.get<unknown>('/auth/refresh', {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      const { accessToken, refreshToken: nextRefreshToken } = pickTokens(data);
      if (!accessToken) throw new Error('Refresh succeeded but no access token was returned.');

      await tokenStorage.setAccessToken(accessToken);
      if (nextRefreshToken) await tokenStorage.setRefreshToken(nextRefreshToken);
      return accessToken;
    })().finally(() => {
      refreshAccessTokenPromise = null;
    });
  }
  return refreshAccessTokenPromise;
}

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err),
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      const originalConfig = error.config as RetriableRequestConfig | undefined;
      if (
        originalConfig &&
        !originalConfig._authRetry &&
        isRefreshableAuthPath(originalConfig.url)
      ) {
        originalConfig._authRetry = true;
        try {
          const accessToken = await refreshAccessToken();
          originalConfig.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalConfig);
        } catch {
          await clearAuthSession();
        }
      } else {
        await clearAuthSession();
      }
    }
    return Promise.reject(error);
  },
);
