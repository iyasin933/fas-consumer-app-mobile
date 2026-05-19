import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';

import { fetchDropyouQuotesPage } from '@/api/modules/dropyou.api';
import {
  getLastSeenQuotesTotal,
  setLastSeenQuotesTotal,
} from '@/features/notifications/services/notificationReadState';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '@/utils/queryKeys';

export function useNotificationUnreadDot() {
  const authed = useAuthStore((s) => s.session === 'authed');
  const queryClient = useQueryClient();

  const lastSeenQuery = useQuery({
    queryKey: queryKeys.dropyou.quotesLastSeenTotal,
    queryFn: getLastSeenQuotesTotal,
    enabled: authed,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.dropyou.quotesSummary,
    queryFn: async () => {
      const page = await fetchDropyouQuotesPage({ page: 1, limit: 1 });
      return page.meta.total;
    },
    enabled: authed,
    staleTime: 30_000,
  });

  const markSeenMutation = useMutation({
    mutationFn: setLastSeenQuotesTotal,
    onSuccess: (savedTotal) => {
      queryClient.setQueryData(queryKeys.dropyou.quotesLastSeenTotal, savedTotal);
    },
  });

  const latestTotal = summaryQuery.data ?? 0;
  const lastSeenTotal = lastSeenQuery.data ?? 0;
  const hasUnread = authed && latestTotal > lastSeenTotal;

  return {
    hasUnread,
    latestTotal,
    markSeen: markSeenMutation.mutate,
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
