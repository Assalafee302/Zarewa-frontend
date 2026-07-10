import { useQuery } from '@tanstack/react-query';
import {
  fetchHrNotifSummary,
  fetchManagementAttention,
  fetchOfficeSummary,
} from '../lib/appShellQueries';
import { SHELL_QUERY_STALE_MS } from '../lib/queryClient';

const shellQueryOptions = {
  staleTime: SHELL_QUERY_STALE_MS,
  refetchInterval: SHELL_QUERY_STALE_MS,
  refetchOnMount: false,
};

export function useOfficeSummaryQuery(enabled) {
  return useQuery({
    queryKey: ['app-shell', 'office-summary'],
    queryFn: fetchOfficeSummary,
    enabled: Boolean(enabled),
    ...shellQueryOptions,
  });
}

export function useHrNotifSummaryQuery(enabled) {
  return useQuery({
    queryKey: ['app-shell', 'hr-notification-summary'],
    queryFn: fetchHrNotifSummary,
    enabled: Boolean(enabled),
    ...shellQueryOptions,
  });
}

export function useManagementAttentionQuery(enabled) {
  return useQuery({
    queryKey: ['app-shell', 'management-attention'],
    queryFn: fetchManagementAttention,
    enabled: Boolean(enabled),
    ...shellQueryOptions,
  });
}
