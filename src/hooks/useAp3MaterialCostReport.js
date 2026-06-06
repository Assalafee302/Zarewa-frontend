import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';

function buildQs(opts = {}) {
  const qs = new URLSearchParams();
  const branchId = opts.branchId ?? 'ALL';
  if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
  else qs.set('branchId', 'ALL');
  if (opts.period) qs.set('period', opts.period);
  if (opts.materialFamily) qs.set('materialFamily', opts.materialFamily);
  if (opts.gauge) qs.set('gauge', opts.gauge);
  if (opts.colour) qs.set('colour', opts.colour);
  if (opts.trustFilter) qs.set('trustFilter', opts.trustFilter);
  if (opts.limitJobs != null) qs.set('limitJobs', String(opts.limitJobs));
  return qs;
}

/**
 * AP3b — material cost per metre from coil consumption.
 */
export function useAp3MaterialCostReport(opts = {}) {
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
      const res = await apiFetch(`/api/finance/ap3-material-cost-report?${qs}`);
      setLoading(false);
      if (!res.ok || !res.data?.ok) {
        setError(res.data?.error || 'Could not load material cost report.');
        return;
      }
      setData(res.data);
    },
    [enabled]
  );

  return { data, loading, error, load };
}
