import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiBase';

const PAGE_SIZE = 20;

async function fetchCustomersPage({ q, offset }) {
  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));
  if (q) params.set('q', q);
  const { ok, data } = await apiFetch(`/api/customers?${params.toString()}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Failed to load customers');
  const items = Array.isArray(data.customers) ? data.customers : [];
  return {
    items,
    total: Number(data.total) || 0,
    nextOffset: offset + items.length,
  };
}

/**
 * Server-paginated + server-searched customer list for the Customers browse tab —
 * independent of CustomersContext (which still holds the full snapshot array for
 * pickers elsewhere, e.g. selecting a customer while creating a quotation).
 * @param {string} searchTerm already-debounced search text
 */
export function useCustomersSearchQuery(searchTerm) {
  const q = String(searchTerm || '').trim();
  const query = useInfiniteQuery({
    queryKey: ['customers-search', q],
    queryFn: ({ pageParam = 0 }) => fetchCustomersPage({ q, offset: pageParam }),
    getNextPageParam: (lastPage) => (lastPage.nextOffset < lastPage.total ? lastPage.nextOffset : undefined),
    initialPageParam: 0,
  });

  const customers = useMemo(() => (query.data?.pages ?? []).flatMap((page) => page.items), [query.data]);
  const total = query.data?.pages?.[0]?.total ?? 0;

  return {
    customers,
    total,
    shown: customers.length,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasMore: Boolean(query.hasNextPage),
    loadMore: query.fetchNextPage,
    isFetchingMore: query.isFetchingNextPage,
  };
}
