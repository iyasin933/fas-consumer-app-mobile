import type { PagedUsersResponse, UsersListParams } from '@/types/user.types';

import { api } from '@/api/client';

/**
 * GET /users — requires Bearer (injected by axios interceptor).
 */
export async function fetchUsers(params: UsersListParams = {}): Promise<PagedUsersResponse> {
  const { data } = await api.get<PagedUsersResponse>('/users', { params });
  return data;
}
