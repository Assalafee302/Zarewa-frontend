import { useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

/**
 * Lazy-load a workspace domain snapshot when a heavy module route mounts.
 * HR uses `useHrDashboardCounts` / `useHrTeamSummary` instead (no hr-snapshot domain yet).
 * @param {'sales' | 'operations' | 'finance' | 'procurement'} domain
 */
export function useWorkspaceDomain(domain) {
  const ws = useWorkspace();
  const key = String(domain || '').trim().toLowerCase();
  const wsStatus = ws?.status;
  const wsEnsureDomainLoaded = ws?.ensureDomainLoaded;
  const wsBranchScope = ws?.branchScope;
  const wsRefreshEpoch = ws?.refreshEpoch;

  useEffect(() => {
    if (!key || wsStatus !== 'ok') return undefined;
    void wsEnsureDomainLoaded?.(key);
    return undefined;
  }, [key, wsStatus, wsEnsureDomainLoaded, wsBranchScope, wsRefreshEpoch]);
}
