import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

/**
 * @param {{ branchId?: string | null, enabled?: boolean }} [opts]
 */
export function useAp1cDryRun(opts = {}) {
  const { branchId = null, enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
    qs.set('limitSamples', '5');
    const path = `/api/finance/ap1c-dry-run?${qs.toString()}`;
    const { ok, data: d } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setData(null);
      setError(d?.error || 'Could not load AP1c dry-run.');
      return;
    }
    setData(d);
  }, [branchId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
