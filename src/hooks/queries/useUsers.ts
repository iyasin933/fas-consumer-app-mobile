import { useQuery } from '@tanstack/react-query';

import { fetchUsers } from '@/api/modules/users.api';
import type { UsersListParams } from '@/types/user.types';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '@/utils/queryKeys';

/**
 * Server state for paginated users. Disabled until session is authenticated (Bearer via interceptor).
 */
export function useUsers(params: UsersListParams = {}) {
  const authed = useAuthStore((s) => s.session === 'authed');

  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => fetchUsers(params),
    enabled: authed,
  });
}
