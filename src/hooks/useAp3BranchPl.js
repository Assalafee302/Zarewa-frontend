import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

function buildQs(opts = {}) {
  const qs = new URLSearchParams();
  const branchId = opts.branchId ?? 'ALL';
  if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
  else qs.set('branchId', 'ALL');
  if (opts.period) qs.set('period', opts.period);
  return qs;
}

/** AP3d — branch contribution P&L (read-only). */
export function useAp3BranchPl(opts = {}) {
  const { enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (filters = {}) => {
      if (!enabled) return;
      setLoading(true);
      setError('');
      const qs = buildQs(filters);
      const res = await apiFetch(`/api/finance/ap3-branch-pl?${qs}`);
      setLoading(false);
      if (!res.ok || !res.data?.ok) {
        setError(res.data?.error || 'Could not load branch P&L.');
        return;
      }
      setData(res.data);
    },
    [enabled]
  );

  return { data, loading, error, load };
}
