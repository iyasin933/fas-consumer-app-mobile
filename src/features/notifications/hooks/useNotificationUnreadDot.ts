import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';

import { fetchDropyouQuotesPage } from '@/api/modules/dropyou.api';
import {
  getLastSeenQuotesTotal,
  setLastSeenQuotesTotal,
} from '@/features/notifications/services/notificationReadState';
import { useAuthStore } from '@/store/authStore';
import { pickUserIdFromProfile } from '@/utils/authIdentity';
import { queryKeys } from '@/utils/queryKeys';

export function useNotificationUnreadDot() {
  const authed = useAuthStore((s) => s.session === 'authed');
  const user = useAuthStore((s) => s.user);
  const userId = pickUserIdFromProfile(user);
  const queryClient = useQueryClient();

  const lastSeenQuery = useQuery({
    queryKey:
      userId != null
        ? queryKeys.dropyou.quotesLastSeenTotal(userId)
        : ['dropyou', 'quotes', 'last-seen-total', 'pending-user'],
    queryFn: () => getLastSeenQuotesTotal(userId ?? 0),
    enabled: authed && userId != null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const summaryQuery = useQuery({
    queryKey:
      userId != null
        ? queryKeys.dropyou.quotesSummary(userId)
        : ['dropyou', 'quotes', 'summary', 'pending-user'],
    queryFn: async () => {
      const page = await fetchDropyouQuotesPage({ page: 1, limit: 1 });
      return page.meta.total;
    },
    enabled: authed && userId != null,
    staleTime: 30_000,
  });

  const markSeenMutation = useMutation({
    mutationFn: setLastSeenQuotesTotal,
    onSuccess: (savedTotal) => {
      if (userId == null) return;
      queryClient.setQueryData(queryKeys.dropyou.quotesLastSeenTotal(userId), savedTotal);
    },
  });

  const latestTotal = summaryQuery.data ?? 0;
  const lastSeenTotal = lastSeenQuery.data ?? 0;
  const hasUnread = authed && latestTotal > lastSeenTotal;

  return {
    hasUnread,
    latestTotal,
    markSeen: (total: number) => {
      if (userId == null) return;
      markSeenMutation.mutate({ userId, total });
    },
  };
}

export function useMarkNotificationsSeenOnFocus(total: number) {
  const isFocused = useIsFocused();
  const { markSeen } = useNotificationUnreadDot();

  useEffect(() => {
    if (!isFocused || total <= 0) return;
    markSeen(total);
  }, [isFocused, markSeen, total]);
}
