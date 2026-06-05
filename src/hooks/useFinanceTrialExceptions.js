import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import { syncAccountingPolicyFlagsFromTrial } from '../lib/accountingPolicyFlags.js';

/**
 * @param {{ branchId?: string | null, enabled?: boolean }} [opts]
 */
export function useFinanceTrialExceptions(opts = {}) {
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
    const path = qs.toString()
      ? `/api/finance/trial-exceptions?${qs.toString()}`
      : '/api/finance/trial-exceptions';
    const { ok, data: d } = await apiFetch(path);
    setLoading(false);
    if (!ok || !d?.ok) {
      setData(null);
      setError(d?.error || 'Could not load finance exception summary.');
      return;
    }
    setData(d);
    syncAccountingPolicyFlagsFromTrial(d);
  }, [branchId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
