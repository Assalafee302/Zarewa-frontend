import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiBase';

const PAGE_SIZE = 50;

async function fetchCustomers(q, offset) {
  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(offset));
  if (q) params.set('q', q);
  const { ok, data } = await apiFetch(`/api/customers?${params.toString()}`);
  if (!ok || !data?.ok) throw new Error(data?.error || 'Failed to load customers');
  return {
    customers: Array.isArray(data.customers) ? data.customers : [],
    total: Number(data.total) || 0,
  };
}

/**
 * Server-searched customer list for the Customers browse tab — independent of
 * CustomersContext (which holds the full snapshot array for pickers elsewhere, e.g.
 * selecting a customer while creating a quotation, and must stay untouched by this).
 *
 * Fetches 50 database rows at a time. Search still covers the permitted database,
 * while browsing no longer downloads thousands of customers before showing the tab.
 * @param {string} searchTerm already-debounced search text ('' = full list)
 */
export function useCustomersSearchQuery(searchTerm) {
  const q = String(searchTerm || '').trim();
  const query = useInfiniteQuery({
    queryKey: ['customers-search', q],
    queryFn: ({ pageParam }) => fetchCustomers(q, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.customers.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
  const pages = query.data?.pages ?? [];
  const customers = pages.flatMap((page) => page.customers);

  return {
    customers,
    total: pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
