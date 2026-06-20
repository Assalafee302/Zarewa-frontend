import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { fetchHrTeamSummary } from '../lib/hrMasterData';

/**
 * Branch team HR summary — refreshes on workspace revision.
 */
export function useHrTeamSummary(scope = 'team') {
  const ws = useWorkspace();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    const { ok, data } = await fetchHrTeamSummary(scope);
    setLoading(false);
    if (!ok || !data?.ok) {
      setSummary(null);
      setError(data?.error || 'Could not load team summary.');
      return { ok: false };
    }
    setSummary(data);
    return { ok: true, data };
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload, ws?.refreshEpoch]);

  return { summary, loading, error, reload };
}
