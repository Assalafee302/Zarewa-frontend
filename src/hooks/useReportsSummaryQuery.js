import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiBase';
import { SHELL_QUERY_STALE_MS } from '../lib/queryClient';

async function fetchReportsSummary() {
  const { ok, data } = await apiFetch('/api/reports/summary');
  if (!ok || !data?.ok) {
    throw new Error(data?.error || 'Could not load summary');
  }
  return data.counts ?? null;
}

export function useReportsSummaryQuery(enabled) {
  const query = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: fetchReportsSummary,
    enabled: Boolean(enabled),
    staleTime: SHELL_QUERY_STALE_MS,
    refetchInterval: SHELL_QUERY_STALE_MS,
  });

  return {
    counts: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message || '',
  };
}
