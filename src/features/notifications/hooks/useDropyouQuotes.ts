import { useInfiniteQuery } from '@tanstack/react-query';

import {
  fetchDropyouQuotesPage,
  type DropyouQuote,
} from '@/api/modules/dropyou.api';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '@/utils/queryKeys';

const QUOTES_PAGE_SIZE = 20;

export function useDropyouQuotes() {
  const authed = useAuthStore((s) => s.session === 'authed');

  const query = useInfiniteQuery({
    queryKey: queryKeys.dropyou.quotes(QUOTES_PAGE_SIZE),
    queryFn: ({ pageParam }) =>
      fetchDropyouQuotesPage({ page: pageParam, limit: QUOTES_PAGE_SIZE }),
    initialPageParam: 1,
    enabled: authed,
    staleTime: 30_000,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });

  const pages = query.data?.pages ?? [];
  const quotes: DropyouQuote[] = pages.flatMap((page) => page.data);
  const total = pages[0]?.meta.total ?? quotes.length;
  const totalPages = pages[0]?.meta.totalPages ?? 1;

  return {
    quotes,
    pages,
    total,
    totalPages,
    isAuthed: authed,
    isLoading: authed && query.isPending,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    isError: authed && query.isError,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
  };
}
