import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiBase';

async function fetchCustomers(q) {
  const params = new URLSearchParams();
  // Hard cap — never request unlimited (can OOM large branches). Matches API maxLimit.
  params.set('limit', '5000');
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
 * Fetches the full set matching `searchTerm` in one request (not paginated over the
 * network) rather than paging page-by-page: the customer list here is a few hundred
 * to a couple thousand small rows — one request for it is cheap relative to the old
 * behaviour (the same data, plus ~25 other unrelated modules, re-fetched together
 * every 30s regardless of which page is open) — and fetching the complete matching
 * set keeps sort (including the revenue sort, which needs every row to rank
 * correctly) simple and always correct, instead of only sorting whatever page has
 * loaded so far. DOM rendering is still capped via useInfiniteReveal by the caller.
 * @param {string} searchTerm already-debounced search text ('' = full list)
 */
export function useCustomersSearchQuery(searchTerm) {
  const q = String(searchTerm || '').trim();
  const query = useQuery({
    queryKey: ['customers-search', q],
    queryFn: () => fetchCustomers(q),
  });

  return {
    customers: query.data?.customers ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
