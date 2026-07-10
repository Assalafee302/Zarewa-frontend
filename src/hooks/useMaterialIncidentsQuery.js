import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiBase';
import { SHELL_QUERY_STALE_MS } from '../lib/queryClient';

async function fetchMaterialIncidents(statusFilter) {
  const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const { ok, data } = await apiFetch(`/api/material-incidents${q}`);
  if (ok && Array.isArray(data?.rows)) return data.rows;
  return [];
}

export function useMaterialIncidentsQuery(statusFilter = '', { fallbackRows = [] } = {}) {
  const query = useQuery({
    queryKey: ['material-incidents', statusFilter],
    queryFn: () => fetchMaterialIncidents(statusFilter),
    staleTime: SHELL_QUERY_STALE_MS,
    refetchInterval: SHELL_QUERY_STALE_MS,
    placeholderData: fallbackRows,
  });

  const rows =
    query.data != null && query.data.length > 0
      ? query.data
      : query.isLoading && Array.isArray(fallbackRows) && fallbackRows.length > 0
        ? fallbackRows
        : (query.data ?? fallbackRows);

  return {
    rows: Array.isArray(rows) ? rows : [],
    loading: query.isLoading,
    reload: query.refetch,
  };
}
