import type { PagedUsersResponse, UsersListParams } from '@/types/user.types';

import { api } from '@/api/client';

/**
 * GET /users — requires Bearer (injected by axios interceptor).
 */
export async function fetchUsers(
  params: UsersListParams = {},
): Promise<PagedUsersResponse> {
  const { data } = await api.get<PagedUsersResponse>('/users', { params });
  return data;
}

/**
 * DELETE /users/:id — inferred from the existing authenticated `PUT /users/:id`
 * profile endpoint and REST user controller style.
 */
export async function deleteUserAccount(userId: string | number): Promise<unknown> {
  const { data } = await api.delete<unknown>(`/users/${userId}`);
  return data;
}
