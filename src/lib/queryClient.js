import { QueryClient } from '@tanstack/react-query';

/** Header/summary polls — decoupled from workspace bootstrap refreshEpoch. */
export const SHELL_QUERY_STALE_MS = 60_000;

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}

export const appQueryClient = createAppQueryClient();

/** After manual workspace refresh (not bootstrap poll). */
export function invalidateAppShellQueries(client = appQueryClient) {
  void client.invalidateQueries({ queryKey: ['app-shell'] });
  void client.invalidateQueries({ queryKey: ['hr'] });
  void client.invalidateQueries({ queryKey: ['edit-approvals'] });
  void client.invalidateQueries({ queryKey: ['reports'] });
  void client.invalidateQueries({ queryKey: ['material-incidents'] });
}
