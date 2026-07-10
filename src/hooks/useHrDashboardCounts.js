import { useQuery } from '@tanstack/react-query';
import { fetchHrDashboardCounts, parseHrDashboardCounts } from '../lib/hrDashboardCounts';
import { SHELL_QUERY_STALE_MS } from '../lib/queryClient';

/**
 * Shared HR dashboard queue counts for HrRequestsOverview and similar tiles.
 */
export function useHrDashboardCounts() {
  const query = useQuery({
    queryKey: ['hr', 'dashboard-counts'],
    queryFn: async () => {
      const r = await fetchHrDashboardCounts();
      if (!r.ok) throw new Error(r.error || 'Could not load HR counts.');
      return r.counts;
    },
    staleTime: SHELL_QUERY_STALE_MS,
    refetchInterval: SHELL_QUERY_STALE_MS,
    placeholderData: parseHrDashboardCounts({}),
  });

  return {
    counts: query.data ?? parseHrDashboardCounts({}),
    loading: query.isLoading && query.data == null,
    reload: query.refetch,
  };
}
