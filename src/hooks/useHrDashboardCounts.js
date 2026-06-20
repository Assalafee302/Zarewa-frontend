import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { fetchHrDashboardCounts, parseHrDashboardCounts } from '../lib/hrDashboardCounts';

/**
 * Shared HR dashboard queue counts for HrRequestsOverview and similar tiles.
 */
export function useHrDashboardCounts() {
  const ws = useWorkspace();
  const [counts, setCounts] = useState(() => parseHrDashboardCounts({}));
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await fetchHrDashboardCounts();
    setLoading(false);
    if (r.ok) setCounts(r.counts);
    return r;
  }, []);

  useEffect(() => {
    void reload();
  }, [reload, ws?.refreshEpoch]);

  return { counts, loading, reload };
}
