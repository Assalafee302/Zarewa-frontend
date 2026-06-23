import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/apiBase';
import {
  getAccountingDeskCache,
  invalidateAccountingDeskCache,
  setAccountingDeskCache,
} from '../lib/accountingDeskCache';

function buildQs(opts = {}) {
  const qs = new URLSearchParams();
  const branchId = opts.branchId ?? 'ALL';
  if (branchId && branchId !== 'ALL') qs.set('branchId', branchId);
  else qs.set('branchId', 'ALL');
  if (opts.period) qs.set('period', opts.period);
  if (opts.materialFamily) qs.set('materialFamily', opts.materialFamily);
  if (opts.gauge) qs.set('gauge', opts.gauge);
  if (opts.colour) qs.set('colour', opts.colour);
  if (opts.limitSamples != null) qs.set('limitSamples', String(opts.limitSamples));
  return qs;
}

/**
 * AP3a — costing policy & data readiness (read-only).
 */
export function useAp3CostingReadiness(opts = {}) {
  const { enabled = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (filters = {}, force = false) => {
      if (!enabled) return;
      const qs = buildQs(filters);
      const cacheKey = `ap3-costing|${filters.branchId ?? 'ALL'}|${filters.period ?? ''}`;
      if (!force) {
        const cached = getAccountingDeskCache(cacheKey);
        if (cached) {
          setData(cached);
          setError('');
          setLoading(false);
          return;
        }
      } else {
        invalidateAccountingDeskCache(cacheKey);
      }
      setLoading(true);
      setError('');
      const res = await apiFetch(`/api/finance/ap3-costing-readiness?${qs}`);
      setLoading(false);
      if (!res.ok || !res.data?.ok) {
        setError(res.data?.error || 'Could not load costing readiness.');
        return;
      }
      setAccountingDeskCache(cacheKey, res.data);
      setData(res.data);
    },
    [enabled]
  );

  return { data, loading, error, load };
}
