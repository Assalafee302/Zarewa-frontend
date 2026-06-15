import { useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

/**
 * Lazy-load a workspace domain snapshot when a heavy module route mounts.
 * @param {'sales' | 'operations' | 'finance' | 'procurement'} domain
 */
export function useWorkspaceDomain(domain) {
  const ws = useWorkspace();
  const key = String(domain || '').trim().toLowerCase();

  useEffect(() => {
    if (!key || ws?.status !== 'ok') return undefined;
    void ws.ensureDomainLoaded?.(key);
    return undefined;
  }, [key, ws?.status, ws?.ensureDomainLoaded, ws?.branchScope, ws?.refreshEpoch]);
}
