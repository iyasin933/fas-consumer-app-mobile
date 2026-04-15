import axios, { isAxiosError } from 'axios';

import { queryClient } from '@/lib/queryClient';
import { env } from '@/shared/config/env';
import * as tokenStorage from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';

/**
 * Axios instance with:
 * - Base URL from env (`EXPO_PUBLIC_API_URL`, includes `/api/v1`)
 * - Request interceptor: attach Bearer from SecureStore (never from React state)
 * - Response interceptor: 401 → clear tokens, session, and React Query cache
 */
export const api = axios.create({
  baseURL: env.apiUrl.replace(/\/$/, ''),
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

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
      await tokenStorage.clearTokens();
      useAuthStore.getState().clearSession();
      await queryClient.cancelQueries();
      queryClient.clear();
    }
    return Promise.reject(error);
  },
);
