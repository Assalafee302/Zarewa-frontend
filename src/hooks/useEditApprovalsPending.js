import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiBase';
import { SHELL_QUERY_STALE_MS } from '../lib/queryClient';

export const EDIT_APPROVALS_QUERY_KEY = ['edit-approvals', 'pending'];

async function fetchEditApprovalsPending() {
  const { ok, data } = await apiFetch('/api/edit-approvals/pending');
  if (!ok || !data?.ok) {
    throw new Error(data?.error || 'Could not load pending edit approvals.');
  }
  return Array.isArray(data.items) ? data.items : [];
}

export function useEditApprovalsPending(enabled = true) {
  const query = useQuery({
    queryKey: EDIT_APPROVALS_QUERY_KEY,
    queryFn: fetchEditApprovalsPending,
    enabled: Boolean(enabled),
    staleTime: SHELL_QUERY_STALE_MS,
    refetchInterval: 45_000,
    refetchOnMount: true,
  });

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message || '',
    reload: query.refetch,
  };
}

export function useInvalidateEditApprovalsPending() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EDIT_APPROVALS_QUERY_KEY });
}
