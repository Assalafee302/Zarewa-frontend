import { useQuery } from '@tanstack/react-query';
import { fetchHrTeamSummary } from '../lib/hrMasterData';
import { SHELL_QUERY_STALE_MS } from '../lib/queryClient';

/**
 * Branch team HR summary — cached independently of workspace bootstrap poll.
 */
export function useHrTeamSummary(scope = 'team') {
  const query = useQuery({
    queryKey: ['hr', 'team-summary', scope],
    queryFn: async () => {
      const { ok, data } = await fetchHrTeamSummary(scope);
      if (!ok || !data?.ok) {
        throw new Error(data?.error || 'Could not load team summary.');
      }
      return data;
    },
    staleTime: SHELL_QUERY_STALE_MS,
    refetchInterval: SHELL_QUERY_STALE_MS,
  });

  return {
    summary: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message || '',
    reload: query.refetch,
  };
}
