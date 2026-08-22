import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { snapshotHasUsableDomainData } from '../lib/workspaceDomainPrefetch';

/**
 * Lazy-load workspace domain snapshot(s) when a heavy module route mounts.
 * Background prefetch in WorkspaceContext usually fills data before navigation;
 * this hook prioritises the requested domain and exposes ready/loading for UI gates.
 *
 * @param {'sales' | 'operations' | 'finance' | 'procurement' | Array<'sales' | 'operations' | 'finance' | 'procurement'>} domain
 * @returns {{ domainReady: boolean; domainLoading: boolean; domains: string[] }}
 */
export function useWorkspaceDomain(domain) {
  const ws = useWorkspace();
  const domains = useMemo(
    () =>
      (Array.isArray(domain) ? domain : [domain])
        .map((d) => String(d || '').trim().toLowerCase())
        .filter(Boolean),
    [domain]
  );
  const keysSig = domains.join(',');
  const wsStatus = ws?.status;
  const wsEnsureDomainLoaded = ws?.ensureDomainLoaded;
  const wsPrefetch = ws?.prefetchWorkspaceDomains;
  const wsIsDomainLoaded = ws?.isDomainLoaded;
  const wsBranchScope = ws?.branchScope;
  const wsRefreshEpoch = ws?.refreshEpoch;
  const wsSnapshot = ws?.snapshot;

  const [awaiting, setAwaiting] = useState(false);

  const domainReady = useMemo(() => {
    if (!domains.length || !wsSnapshot?.ok) return false;
    return domains.every(
      (key) => wsIsDomainLoaded?.(key) || snapshotHasUsableDomainData(wsSnapshot, key)
    );
  }, [domains, wsIsDomainLoaded, wsSnapshot, wsRefreshEpoch]);

  useEffect(() => {
    if (!keysSig || wsStatus !== 'ok') {
      setAwaiting(false);
      return undefined;
    }
    let cancelled = false;
    setAwaiting(true);
    void (async () => {
      const primary = keysSig.split(',')[0];
      if (primary) {
        await wsEnsureDomainLoaded?.(primary);
      }
      const rest = keysSig.split(',').slice(1).filter(Boolean);
      if (rest.length) {
        await wsPrefetch?.({ only: rest });
      }
      if (!cancelled) setAwaiting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [keysSig, wsStatus, wsEnsureDomainLoaded, wsPrefetch, wsBranchScope, wsRefreshEpoch]);

  return {
    domains,
    domainReady,
    domainLoading: awaiting && !domainReady,
  };
}
